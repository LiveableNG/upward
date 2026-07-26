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
      return await this.s3Service.streamFile(pdfS3Key, res, { filename: 'document.pdf', contentType: 'application/pdf' });
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
      return await this.s3Service.streamFile(signature.fileKey, res, { cacheControl: 'public, max-age=31536000' });
    } catch (err) {
      throw new NotFoundException('Signature image could not be retrieved from storage');
    }
  }

  @Get('users/avatar/:uuid/:filename')
  async getUserAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `users/${uuid}/avatar/${filename}`;
    try {
      return await this.s3Service.streamFile(s3Key, res, { cacheControl: 'public, max-age=31536000' });
    } catch (err) {
      throw new NotFoundException('Avatar could not be retrieved');
    }
  }

  @Get('pm/avatar/:uuid/:filename')
  async getPmAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `pm/${uuid}/avatar/${filename}`;
    try {
      return await this.s3Service.streamFile(s3Key, res, { cacheControl: 'public, max-age=31536000' });
    } catch (err) {
      throw new NotFoundException('Avatar could not be retrieved');
    }
  }

  @Get('relays/:uuid/download')
  async getRelayDocument(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    const job = await (this.prisma as any).upward_pm_bulk_import_job.findUnique({
      where: { uuid }
    });

    if (!job || !job.fileUrl) {
      throw new NotFoundException('Relay document not found');
    }

    try {
      if (job.fileUrl.startsWith('data:')) {
        const base64Data = job.fileUrl.split(',')[1];
        const mimeTypeMatch = job.fileUrl.match(/^data:([^;]+);/);
        const contentType = mimeTypeMatch ? mimeTypeMatch[1] : 'application/octet-stream';
        const buffer = Buffer.from(base64Data, 'base64');
        return S3Service.streamBuffer(buffer, job.originalFileName || 'file', res, { contentType });
      }

      return await this.s3Service.streamFile(job.fileUrl, res, { filename: job.originalFileName });
    } catch (err) {
      throw new NotFoundException('Relay document could not be retrieved from storage');
    }
  }
}
