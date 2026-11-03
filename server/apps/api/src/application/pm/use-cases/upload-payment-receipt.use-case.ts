import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

export interface UploadPaymentReceiptDto {
  pmId: number;
  unitUuid: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  actor?: any;
}

@Injectable()
export class UploadPaymentReceiptUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(dto: UploadPaymentReceiptDto) {
    const { pmId, unitUuid, fileBuffer, fileName, mimeType, fileSize, actor } = dto;
    const ownerPmId = actor ? actor.ownerPmId : pmId;

    const unit = await this.unitRepository.findByUuid(unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(ownerPmId, unit.propertyId, actor);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this unit');
    }

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('Only PDF, JPG, or PNG files are allowed as receipts');
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxFileSize || fileBuffer.length > maxFileSize) {
      throw new BadRequestException('Receipt file size must not exceed 10MB');
    }

    // Sanitize filename to prevent any path traversal
    const safeFileName = path.basename(fileName || 'receipt');
    const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
    const s3Key = `pm-docs/receipts/pm_${ownerPmId}/${randomUUID()}.${ext}`;

    await this.s3Service.uploadBuffer(fileBuffer, s3Key, mimeType);

    return {
      receiptUrl: s3Key,
      receiptFileName: safeFileName,
      receiptFileType: mimeType,
      receiptFileSize: fileSize,
    };
  }
}
