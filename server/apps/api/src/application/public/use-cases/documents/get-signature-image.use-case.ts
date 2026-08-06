import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetSignatureImageUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(uuid: string) {
    const signature = await (this.prisma as any).upward_pm_signature.findUnique({
      where: { uuid }
    });

    if (!signature || !signature.fileKey) {
      throw new NotFoundException('Signature image not found');
    }

    try {
      const buffer = await this.s3Service.getFileBuffer(signature.fileKey);
      return { 
        buffer, 
        filename: signature.fileKey, 
        cacheControl: 'public, max-age=31536000' 
      };
    } catch (err) {
      throw new NotFoundException('Signature image could not be retrieved from storage');
    }
  }
}
