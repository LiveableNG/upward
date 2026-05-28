import { Controller, Get, Post, Patch, Body, UseGuards, Request, Inject, UnauthorizedException, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { GetPmDocumentsUseCase } from '../../../application/pm/use-cases/documents/get-pm-documents.use-case';
import { SaveDocumentTemplateUseCase, SaveDocumentTemplateDto } from '../../../application/pm/use-cases/documents/save-document-template.use-case';
import { SendDocumentUseCase, SendDocumentDto } from '../../../application/pm/use-cases/documents/send-document.use-case';
import { GenerateDocumentPdfUseCase } from '../../../application/pm/use-cases/documents/generate-document-pdf.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';

@Controller('pm/documents')
@UseGuards(JwtAuthGuard)
export class PmDocumentController {
  constructor(
    private readonly getDocumentsUseCase: GetPmDocumentsUseCase,
    private readonly saveTemplateUseCase: SaveDocumentTemplateUseCase,
    private readonly sendDocumentUseCase: SendDocumentUseCase,
    private readonly generatePdfUseCase: GenerateDocumentPdfUseCase,
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

  @Post('templates')
  async saveTemplate(@Request() req: any, @Body() data: SaveDocumentTemplateDto) {
    const pmId = await this.getPmId(req);
    return this.saveTemplateUseCase.execute(pmId, data);
  }

  @Post('send')
  async sendDocument(@Request() req: any, @Body() data: SendDocumentDto) {
    const pmId = await this.getPmId(req);
    return this.sendDocumentUseCase.execute(pmId, data);
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
