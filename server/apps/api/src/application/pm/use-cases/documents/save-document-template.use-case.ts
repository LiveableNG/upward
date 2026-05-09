import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';
import * as crypto from 'crypto';

export interface SaveDocumentTemplateDto {
  uuid?: string;
  name: string;
  content: string;
  type: string;
}

@Injectable()
export class SaveDocumentTemplateUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number, data: SaveDocumentTemplateDto) {
    const isSystemTemplate = data.uuid?.startsWith('system-');
    const uuid = (!data.uuid || isSystemTemplate) ? crypto.randomUUID() : data.uuid;
    const s3Key = `pm-docs/templates/pm_${pmId}/${uuid}.html`;

    await this.s3Service.uploadBuffer(
      Buffer.from(data.content),
      s3Key,
      'text/html'
    );

    return this.documentRepo.saveTemplate({
      ...data,
      uuid,
      pmId,
      content: s3Key,
    });
  }
}
