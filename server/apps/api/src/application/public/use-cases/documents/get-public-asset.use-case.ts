import { Injectable, NotFoundException } from '@nestjs/common';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetPublicAssetUseCase {
  constructor(private readonly s3Service: S3Service) {}

  async execute(s3Key: string) {
    try {
      const buffer = await this.s3Service.getFileBuffer(s3Key);
      return { 
        buffer, 
        filename: s3Key, 
        cacheControl: 'public, max-age=31536000' 
      };
    } catch (err) {
      throw new NotFoundException('Asset could not be retrieved');
    }
  }
}
