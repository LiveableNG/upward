import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetRelayDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(uuid: string) {
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
        return { buffer, filename: job.originalFileName || 'file', contentType };
      }

      const buffer = await this.s3Service.getFileBuffer(job.fileUrl);
      return { buffer, filename: job.originalFileName };
    } catch (err) {
      throw new NotFoundException('Relay document could not be retrieved from storage');
    }
  }
}
