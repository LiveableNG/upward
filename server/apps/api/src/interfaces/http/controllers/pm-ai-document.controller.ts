import { Controller, Post, Body, UseGuards, Request, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { AiParseDocumentUseCase } from '../../../application/pm/use-cases/ai/ai-parse-document.use-case';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Controller('pm/ai-document')
@UseGuards(JwtAuthGuard)
export class PmAiDocumentController {
  constructor(
    private readonly aiParseUseCase: AiParseDocumentUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post('parse')
  async parseDocument(
    @Request() req: any,
    @Body() body: {
      base64Data: string;
      contentType: string;
      fileName: string;
      mode: 'full' | 'units';
      targetPropertyUuid?: string;
      contextHint?: string;
    }
  ) {
    let pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.id || req.user.sub },
    });
    if (!pm) {
      const admin = await this.prisma.upward_admin.findUnique({
        where: { id: req.user.id || req.user.sub },
      });
      if (!admin) {
        throw new UnauthorizedException('Access denied: Caller is neither a PM nor an Admin.');
      }
    }

    if (!body.base64Data || !body.contentType || !body.fileName) {
      throw new BadRequestException('base64Data, contentType, and fileName are required.');
    }

    const fileBuffer = Buffer.from(body.base64Data, 'base64');

    return this.aiParseUseCase.execute({
      fileBuffer,
      mimeType: body.contentType,
      fileName: body.fileName,
      mode: body.mode || 'full',
      targetPropertyUuid: body.targetPropertyUuid,
      contextHint: body.contextHint,
    });
  }
}
