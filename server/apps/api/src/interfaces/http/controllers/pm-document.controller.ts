
import { Controller, Get, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetPmDocumentsUseCase } from '../../../../application/pm/use-cases/documents/get-pm-documents.use-case';
import { SaveDocumentTemplateUseCase, SaveDocumentTemplateDto } from '../../../../application/pm/use-cases/documents/save-document-template.use-case';
import { SendDocumentUseCase, SendDocumentDto } from '../../../../application/pm/use-cases/documents/send-document.use-case';

@Controller('pm/documents')
@UseGuards(JwtAuthGuard)
export class PmDocumentController {
  constructor(
    private readonly getDocumentsUseCase: GetPmDocumentsUseCase,
    private readonly saveTemplateUseCase: SaveDocumentTemplateUseCase,
    private readonly sendDocumentUseCase: SendDocumentUseCase,
  ) {}

  @Get()
  async getDocuments(@Request() req: any) {
    return this.getDocumentsUseCase.execute(req.user.id);
  }

  @Post('templates')
  async saveTemplate(@Request() req: any, @Body() data: SaveDocumentTemplateDto) {
    return this.saveTemplateUseCase.execute(req.user.id, data);
  }

  @Post('send')
  async sendDocument(@Request() req: any, @Body() data: SendDocumentDto) {
    return this.sendDocumentUseCase.execute(req.user.id, data);
  }
}
