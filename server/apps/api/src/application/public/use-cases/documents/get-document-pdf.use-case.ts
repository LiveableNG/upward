import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetDocumentPdfUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(uuid: string, res?: any) {
    const document = await this.prisma.upward_pm_sent_document.findUnique({
      where: { uuid }
    });

    if (!document || !document.content) {
      throw new NotFoundException('Document not found');
    }

    const pdfS3Key = document.content.replace('.html', '.pdf');

    if (res) {
      return this.s3Service.streamObject(pdfS3Key, res, {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });
    }

    try {
      const buffer = await this.s3Service.getFileBuffer(pdfS3Key);
      return { 
        buffer, 
        filename: 'document.pdf', 
        contentType: 'application/pdf' 
      };
    } catch (err) {
      throw new NotFoundException('Document PDF could not be retrieved from storage');
    }
  }
}
