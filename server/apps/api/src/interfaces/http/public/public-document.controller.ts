import { Controller, Get, Param, Res, StreamableFile, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Controller('public/documents')
export class PublicDocumentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  @Get(':uuid/pdf')
  async getDocumentPdf(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    const document = await this.prisma.upward_pm_sent_document.findUnique({
      where: { uuid }
    });

    if (!document || !document.content) {
      throw new NotFoundException('Document not found');
    }

    const pdfS3Key = document.content.replace('.html', '.pdf');
    
    try {
      const buffer = await this.s3Service.getFileBuffer(pdfS3Key);

      if (typeof res.set === 'function') {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'inline; filename=document.pdf');
      } else {
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', 'inline; filename=document.pdf');
      }

      return new StreamableFile(buffer);
    } catch (err) {
      throw new NotFoundException('Document PDF could not be retrieved from storage');
    }
  }

  @Get('signatures/:uuid/image')
  async getSignatureImage(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    const signature = await (this.prisma as any).upward_pm_signature.findUnique({
      where: { uuid }
    });

    if (!signature || !signature.fileKey) {
      throw new NotFoundException('Signature image not found');
    }

    try {
      const buffer = await this.s3Service.getFileBuffer(signature.fileKey);
      const ext = signature.fileKey.split('.').pop() || 'png';
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      if (typeof res.set === 'function') {
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
      } else {
        res.header('Content-Type', contentType);
        res.header('Cache-Control', 'public, max-age=31536000');
      }

      return new StreamableFile(buffer);
    } catch (err) {
      throw new NotFoundException('Signature image could not be retrieved from storage');
    }
  }
}
