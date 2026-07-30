import { Controller, Get, Post, Patch, Body, UseGuards, Request, Inject, UnauthorizedException, Res, Param, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard';
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator';
import { FeatureKey, SubscriptionService } from '../../../domains/subscription/subscription.service';
import { GetPmDocumentsUseCase } from '../../../application/pm/use-cases/documents/get-pm-documents.use-case';
import { GetTenantUploadedDocumentsUseCase } from '../../../application/pm/use-cases/documents/get-tenant-uploaded-documents.use-case';
import { SaveDocumentTemplateUseCase, SaveDocumentTemplateDto } from '../../../application/pm/use-cases/documents/save-document-template.use-case';
import { SendDocumentUseCase, SendDocumentDto } from '../../../application/pm/use-cases/documents/send-document.use-case';
import { SendBulkDocumentUseCase, BulkSendDocumentDto } from '../../../application/pm/use-cases/documents/send-bulk-document.use-case';
import { GenerateDocumentPdfUseCase } from '../../../application/pm/use-cases/documents/generate-document-pdf.use-case';
import { SendToTenantVaultUseCase } from '../../../application/pm/use-cases/documents/send-to-tenant-vault.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';

@Controller('pm/documents')
@UseGuards(JwtAuthGuard)
export class PmDocumentController {
  constructor(
    private readonly getDocumentsUseCase: GetPmDocumentsUseCase,
    private readonly getTenantUploadedDocumentsUseCase: GetTenantUploadedDocumentsUseCase,
    private readonly saveTemplateUseCase: SaveDocumentTemplateUseCase,
    private readonly sendDocumentUseCase: SendDocumentUseCase,
    private readonly sendBulkDocumentUseCase: SendBulkDocumentUseCase,
    private readonly generatePdfUseCase: GenerateDocumentPdfUseCase,
    private readonly sendToVaultUseCase: SendToTenantVaultUseCase,
    private readonly subscriptionService: SubscriptionService,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getPmId(req: any): Promise<number> {
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found');
    return pm.id;
  }

  @Get()
  async getDocuments(@Request() req: any) {
    const pmId = await this.getPmId(req);
    return this.getDocumentsUseCase.execute(pmId);
  }

  @Get('tenant-uploaded/:unitUuid')
  async getTenantUploadedDocuments(@Request() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getPmId(req);
    return this.getTenantUploadedDocumentsUseCase.execute(pmId, unitUuid);
  }

  @Post('templates')
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.DOCUMENT_MANAGEMENT)
  async saveTemplate(@Request() req: any, @Body() data: SaveDocumentTemplateDto) {
    const pmId = await this.getPmId(req);
    return this.saveTemplateUseCase.execute(pmId, data);
  }

  @Post('send')
  async sendDocument(@Request() req: any, @Body() data: SendDocumentDto) {
    const pmId = await this.getPmId(req);
    const isFreeTemplate = 
      data.subject === 'Welcome to Upward — A Better Rental Experience Starts Here' ||
      data.subject === 'Your Good Rental History Should Work for You' ||
      data.subject === 'Getting Started' ||
      data.subject === 'Benefits' ||
      data.isWelcomeTemplate;

    if (!isFreeTemplate) {
      const check = await this.subscriptionService.checkAccess(pmId, FeatureKey.DOCUMENT_MANAGEMENT);
      if (!check.hasAccess) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'This feature is locked under your current plan.',
          code: 'FEATURE_LOCKED',
          requiredTier: check.requiredTier,
          reason: check.reason,
        });
      }
    }
    return this.sendDocumentUseCase.execute(pmId, data);
  }

  @Post('send-bulk')
  async sendBulkDocument(@Request() req: any, @Body() data: BulkSendDocumentDto) {
    const pmId = await this.getPmId(req);
    const pmUuid = req.user?.sub;

    const isFreeTemplate = 
      data.subject === 'Welcome to Upward — A Better Rental Experience Starts Here' ||
      data.subject === 'Your Good Rental History Should Work for You' ||
      data.subject === 'Getting Started' ||
      data.subject === 'Benefits' ||
      data.templateName === 'Getting Started' ||
      data.templateName === 'Benefits';

    if (!isFreeTemplate) {
      const check = await this.subscriptionService.checkAccess(pmId, FeatureKey.DOCUMENT_MANAGEMENT);
      if (!check.hasAccess) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'This feature is locked under your current plan.',
          code: 'FEATURE_LOCKED',
          requiredTier: check.requiredTier,
          reason: check.reason,
        });
      }
    }

    return this.sendBulkDocumentUseCase.execute(pmId, pmUuid, data);
  }

  @Post('send-to-vault')
  async sendFileToVault(@Request() req: any) {
    const pmId = await this.getPmId(req);
    if (!req.isMultipart || !req.isMultipart()) {
      throw new Error('Request must be multipart/form-data');
    }
    const data = await req.file();
    if (!data) throw new Error('No file uploaded');
    const buffer = await data.toBuffer();
    const fields = data.fields as any;

    return this.sendToVaultUseCase.executeFile(pmId, {
      fileBuffer: buffer,
      fileName: data.filename,
      mimeType: data.mimetype,
      fileSize: buffer.length,
      subject: fields?.subject?.value ? String(fields.subject.value) : undefined,
      tenantUuid: fields?.tenantUuid?.value ? String(fields.tenantUuid.value) : undefined,
      unitUuid: fields?.unitUuid?.value ? String(fields.unitUuid.value) : undefined,
    });
  }

  @Post('template-to-vault')
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.DOCUMENT_MANAGEMENT)
  async sendTemplateToVault(
    @Request() req: any,
    @Body() body: { content: string; subject: string; includeLetterhead?: boolean; tenantUuid?: string; unitUuid?: string },
  ) {
    const pmId = await this.getPmId(req);
    return this.sendToVaultUseCase.executeTemplate(pmId, body);
  }

  @Post('generate-pdf')
  async generatePdf(@Request() req: any, @Body() data: { content: string; tenantUuid?: string; unitUuid?: string; recipientName?: string; includeLetterhead?: boolean }, @Res() res: any) {
    const pmId = await this.getPmId(req);
    const buffer = await this.generatePdfUseCase.execute({
      content: data.content,
      pmId,
      tenantUuid: data.tenantUuid,
      unitUuid: data.unitUuid,
      recipientName: data.recipientName,
      includeLetterhead: data.includeLetterhead,
    });
    
    // Check if it's Fastify or Express response
    if (typeof res.set === 'function') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=document.pdf',
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      // Fastify style
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', 'attachment; filename=document.pdf');
      res.header('Content-Length', buffer.length);
      res.send(buffer);
    }
  }
}
