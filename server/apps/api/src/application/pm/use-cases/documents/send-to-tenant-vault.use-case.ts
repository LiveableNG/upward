import { Inject, Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import { ConfigService } from '@nestjs/config';
import { GenerateDocumentPdfUseCase } from './generate-document-pdf.use-case';
import {
  PM_TENANT_REPOSITORY,
  ITenantRepository,
  PM_UNIT_REPOSITORY,
  IUnitRepository,
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import * as crypto from 'crypto';

export interface SendFileToVaultDto {
  /** Raw file buffer (PDF/image) uploaded by PM */
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  subject?: string;
  tenantUuid?: string;
  unitUuid?: string;
}

export interface SendTemplateToVaultDto {
  /** Rendered or raw HTML content from a template */
  content: string;
  subject: string;
  includeLetterhead?: boolean;
  tenantUuid?: string;
  unitUuid?: string;
}

@Injectable()
export class SendToTenantVaultUseCase {
  private readonly logger = new Logger(SendToTenantVaultUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly generatePdfUseCase: GenerateDocumentPdfUseCase,
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepo: PropertyManagerRepository,
  ) {}

  /**
   * Push a raw file (PDF/image) to a tenant's document vault.
   */
  async executeFile(pmId: number, dto: SendFileToVaultDto) {
    const { fileBuffer, fileName, mimeType, fileSize, subject, tenantUuid, unitUuid } = dto;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(mimeType)) {
      throw new BadRequestException('Only PDF, JPG, or PNG files are allowed');
    }

    const vaultUuid = crypto.randomUUID();
    const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
    const s3Key = `pm-docs/vault/pm_${pmId}/${vaultUuid}.${ext}`;

    // Upload buffer to S3 in the background to speed up request lifecycle
    this.s3Service.uploadBuffer(fileBuffer, s3Key, mimeType)
      .catch((err) => this.logger.error(`Background S3 upload failed for ${s3Key}:`, err));

    return this._saveVaultRecord(pmId, {
      vaultUuid,
      s3Key,
      fileName: subject || fileName,
      fileType: mimeType,
      fileSize,
      documentType: ext.toUpperCase(),
      tenantUuid,
      unitUuid,
      isHtml: false,
    });
  }

  /**
   * Render an HTML template, auto-convert to PDF, push to tenant vault.
   */
  async executeTemplate(pmId: number, dto: SendTemplateToVaultDto) {
    const { content, subject, includeLetterhead, tenantUuid, unitUuid } = dto;
    const vaultUuid = crypto.randomUUID();
    const s3Key = `pm-docs/vault/pm_${pmId}/${vaultUuid}.pdf`;

    const result = await this._saveVaultRecord(pmId, {
      vaultUuid,
      s3Key,
      fileName: `${subject}.pdf`,
      fileType: 'application/pdf',
      fileSize: 0,
      documentType: 'PDF',
      tenantUuid,
      unitUuid,
      isHtml: false,
    });

    // Run PDF generation, S3 upload, and database update in the background to prevent Vercel 503 timeouts
    this.generatePdfUseCase.execute({
      content,
      pmId,
      tenantUuid,
      unitUuid,
      includeLetterhead,
    }).then(async (pdfBuffer) => {
      await this.s3Service.uploadBuffer(pdfBuffer, s3Key, 'application/pdf');
      await this.prisma.upward_user_contract.update({
        where: { uuid: vaultUuid },
        data: { fileSize: pdfBuffer.length }
      });
    }).catch((err) => {
      this.logger.error(`Background PDF generation/upload failed for ${s3Key}:`, err);
    });

    return result;
  }

  private async _saveVaultRecord(
    pmId: number,
    opts: {
      vaultUuid: string;
      s3Key: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      documentType: string;
      tenantUuid?: string;
      unitUuid?: string;
      isHtml: boolean;
    },
  ) {
    const pm = await this.pmRepo.findById(pmId);
    if (!pm) throw new NotFoundException('Property manager not found');

    // Resolve tenant and unit
    let tenantId: number | null = null;
    let unitId: number | null = null;
    let tenantEmail: string | null = null;
    let tenantFirstName: string | null = null;
    let recipientName = 'Tenant';
    let recipientEmail = '';
    let userPropertyId: number | null = null;

    if (opts.tenantUuid) {
      const tenant = await this.tenantRepo.findByUuid(opts.tenantUuid);
      if (tenant) {
        tenantId = tenant.id;
        tenantEmail = tenant.email || null;
        tenantFirstName = tenant.firstName || null;
        recipientName = `${tenant.firstName} ${tenant.lastName}`.trim();
        recipientEmail = tenant.email || '';
      }
    }

    if (opts.unitUuid) {
      const unit = await this.unitRepo.findByUuid(opts.unitUuid);
      if (unit) {
        unitId = unit.id;

        // Find the linked user property so we can push into the tenant's vault
        if (unit.userPropertyUuid) {
          const userProp = await this.prisma.upward_user_property.findFirst({
            where: { uuid: unit.userPropertyUuid },
            include: { user: true },
          });
          if (userProp) {
            userPropertyId = userProp.id;
            // If email isn't resolved yet, get it from the linked upward_user
            if (!tenantEmail && userProp.user?.email) {
              tenantEmail = userProp.user.email;
              tenantFirstName = userProp.user.firstName || tenantFirstName;
              recipientName = `${userProp.user.firstName || ''} ${userProp.user.lastName || ''}`.trim() || recipientName;
              recipientEmail = userProp.user.email;
            }
          }
        }
      }
    }

    if (!userPropertyId) {
      throw new BadRequestException(
        'This unit has no linked Upward tenant. The tenant must first connect their Upward account before you can push documents to their vault.',
      );
    }

    // Find the userId for the upward_user linked to this property
    const userProperty = await this.prisma.upward_user_property.findUnique({
      where: { id: userPropertyId },
    });
    if (!userProperty) throw new NotFoundException('User property not found');

    const sentDoc = await this.prisma.upward_pm_sent_document.create({
      data: {
        uuid: opts.vaultUuid,
        pmId,
        tenantId,
        unitId,
        subject: opts.fileName,
        content: opts.s3Key,
        documentType: opts.documentType,
        recipientName,
        recipientEmail,
        status: 'SENT',
        isVaultDocument: true,
      },
    });

    // 2. Save to upward_user_contract (tenant vault)
    await this.prisma.upward_user_contract.create({
      data: {
        uuid: opts.vaultUuid,
        userId: userProperty.userId,
        userPropertyId,
        fileName: opts.fileName,
        fileUrl: opts.s3Key,
        fileType: opts.fileType,
        fileSize: opts.fileSize,
        source: 'PM',
      },
    });

    // 3. Email notification to the tenant
    if (tenantEmail) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() || 'https://upward.goodtenants.io';
      const pmName = `${pm.firstName} ${pm.lastName}`.trim();
      const loginLink = `${frontendUrl}/dashboard/documents`;

      const notificationHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: #1a4d2e; padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">New Document in Your Vault</h1>
          </div>
          <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
            <p style="font-size: 16px; margin-bottom: 8px;">Hello ${tenantFirstName || 'there'},</p>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
              Your property manager, <strong>${pmName}</strong>, has added a new document to your Upward document vault:
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #166534;">📄 ${opts.fileName}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Log in to your Upward account to view, download, or manage this document.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginLink}" style="background: #1a4d2e; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;">
                View My Documents
              </a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              If you were not expecting this, please contact your property manager.
            </p>
          </div>
        </div>
      `;

      // Send vault document notification email in the background to avoid blocking the client response
      this.emailService.sendEmailWithRetry({
        email: tenantEmail,
        subject: `New document added to your Upward vault by ${pmName}`,
        html: notificationHtml,
        type: 'VAULT_DOCUMENT_NOTIFICATION',
        pmUuid: pm.uuid,
      }).catch((err) => {
        this.logger.error('Failed to send vault document notification email in background:', err);
      });
    }

    return {
      uuid: sentDoc.uuid,
      fileName: opts.fileName,
      documentType: opts.documentType,
      createdAt: sentDoc.createdAt,
    };
  }
}
