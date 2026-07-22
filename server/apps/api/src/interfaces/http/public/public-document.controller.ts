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

  @Get('users/avatar/:uuid/:filename')
  async getUserAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `users/${uuid}/avatar/${filename}`;
    try {
      const buffer = await this.s3Service.getFileBuffer(s3Key);
      const ext = filename.split('.').pop() || 'png';
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
      throw new NotFoundException('Avatar could not be retrieved');
    }
  }

  @Get('pm/avatar/:uuid/:filename')
  async getPmAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `pm/${uuid}/avatar/${filename}`;
    try {
      const buffer = await this.s3Service.getFileBuffer(s3Key);
      const ext = filename.split('.').pop() || 'png';
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
        
        if (typeof res.set === 'function') {
          res.set('Content-Type', contentType);
          res.set('Content-Disposition', `inline; filename="${job.originalFileName}"`);
        } else {
          res.header('Content-Type', contentType);
          res.header('Content-Disposition', `inline; filename="${job.originalFileName}"`);
        }
        return new StreamableFile(buffer);
      }

      const buffer = await this.s3Service.getFileBuffer(job.fileUrl); // fileUrl stores the S3 key
      const ext = job.fileUrl.split('.').pop() || 'bin';
      let contentType = 'application/octet-stream';
      if (ext === 'pdf') contentType = 'application/pdf';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'csv') contentType = 'text/csv';

      if (typeof res.set === 'function') {
        res.set('Content-Type', contentType);
        res.set('Content-Disposition', `inline; filename="${job.originalFileName}"`);
      } else {
        res.header('Content-Type', contentType);
        res.header('Content-Disposition', `inline; filename="${job.originalFileName}"`);
      }

      return new StreamableFile(buffer);
    } catch (err) {
      throw new NotFoundException('Relay document could not be retrieved from storage');
    }
  }
}
