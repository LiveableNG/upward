import { Controller, Get, Post, Patch, Body, UseGuards, Request, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { GetPmDocumentsUseCase } from '../../../application/pm/use-cases/documents/get-pm-documents.use-case';
import { SaveDocumentTemplateUseCase, SaveDocumentTemplateDto } from '../../../application/pm/use-cases/documents/save-document-template.use-case';
import { SendDocumentUseCase, SendDocumentDto } from '../../../application/pm/use-cases/documents/send-document.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';

@Controller('pm/documents')
@UseGuards(JwtAuthGuard)
export class PmDocumentController {
  constructor(
    private readonly getDocumentsUseCase: GetPmDocumentsUseCase,
    private readonly saveTemplateUseCase: SaveDocumentTemplateUseCase,
    private readonly sendDocumentUseCase: SendDocumentUseCase,
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
}
