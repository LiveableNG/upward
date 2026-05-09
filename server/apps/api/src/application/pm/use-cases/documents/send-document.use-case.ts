import { Inject, Injectable } from '@nestjs/common';
import { 
  PM_DOCUMENT_REPOSITORY, IPmDocumentRepository,
  PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity,
  PM_UNIT_REPOSITORY, IUnitRepository, UnitEntity
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import * as crypto from 'crypto';

export interface SendDocumentDto {
  tenantUuid?: string;
  unitUuid?: string;
  subject: string;
  content: string;
  documentType: string;
  recipientName: string;
  recipientEmail: string;
}

@Injectable()
export class SendDocumentUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
  ) {}

  async execute(pmId: number, data: SendDocumentDto) {
    let tenantId: number | null = null;
    let unitId: number | null = null;
    let content = data.content;

    // 1. Fetch Context Data
    const pm = await this.pmRepo.findById(pmId);
    let tenant: TenantEntity | null = null;
    let unit: UnitEntity | null = null;

    if (data.tenantUuid) {
      tenant = await this.tenantRepo.findByUuid(data.tenantUuid);
      if (tenant) {
        tenantId = tenant.id;
        if (tenant.units && tenant.units.length > 0) {
          unit = tenant.units[0] || null;
          unitId = unit?.id || null;
        }
      }
    }

    if (data.unitUuid && !unit) {
      unit = await this.unitRepo.findByUuid(data.unitUuid);
      if (unit) unitId = unit.id;
    }

    const formatDate = (date: Date | null | undefined) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    const calculateEndDate = (startDate: Date | null | undefined) => {
      if (!startDate) return 'N/A';
      const end = new Date(startDate);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return formatDate(end);
    };

    // 2. Perform Placeholder Replacement
    const placeholders: Record<string, string> = {
      '[Tenant Name]': tenant ? `${tenant.firstName} ${tenant.lastName}` : data.recipientName,
      '[TenantFirstName]': tenant?.firstName || data.recipientName.split(' ')[0] || '',
      '[TenantLastName]': tenant?.lastName || data.recipientName.split(' ').slice(1).join(' ') || '',
      '[TenantPhone]': tenant?.phone || 'N/A',
      '[UnitName]': unit ? unit.unitName : 'N/A',
      '[Unit Name]': unit ? unit.unitName : 'N/A',
      '[RentAmount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : 'N/A',
      '[Rent Amount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : 'N/A',
      '[PropertyName]': unit?.property ? unit.property.name : 'N/A',
      '[Property Name]': unit?.property ? unit.property.name : 'N/A',
      '[RentStartDate]': formatDate(unit?.rentStartDate),
      '[RentEndDate]': calculateEndDate(unit?.rentStartDate),
      '[Date]': formatDate(new Date()),
      '[ManagerName]': pm ? `${pm.firstName} ${pm.lastName}` : 'The Property Manager',
    };

    Object.entries(placeholders).forEach(([tag, value]) => {
      content = content.split(tag).join(value);
    });

    // 3. Upload Snapshot to S3
    const sentUuid = crypto.randomUUID();
    const s3Key = `pm-docs/sent/pm_${pmId}/${sentUuid}.html`;
    await this.s3Service.uploadBuffer(
      Buffer.from(content),
      s3Key,
      'text/html'
    );

    if (data.documentType === 'PDF') {
      const htmlToPdf = require('html-pdf-node');
      const options = { format: 'A4', margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' } };
      const file = { content };
      
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      
      await this.emailService.sendEmailWithRetry({
        userId: pm?.uuid || '',
        email: data.recipientEmail,
        subject: data.subject,
        html: `<p>Hello ${data.recipientName},</p><p>Please find the attached document: <strong>${data.subject}</strong> from your property manager.</p>`,
        type: 'DOCUMENT',
        attachments: [
          {
            filename: `${data.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            content: pdfBuffer,
          }
        ]
      } as any);
    } else {
      await this.emailService.sendGenericEmail(
        data.recipientEmail,
        data.subject,
        content,
        pm?.uuid
      );
    }

    // 5. Save the record
    return this.documentRepo.saveSentDocument({
      uuid: sentUuid,
      pmId,
      tenantId,
      unitId,
      subject: data.subject,
      content: s3Key,
      documentType: data.documentType,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      status: 'SENT',
    });
  }
}
