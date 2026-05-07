
import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';

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
  ) {}

  async execute(pmId: number, data: SaveDocumentTemplateDto) {
    return this.documentRepo.saveTemplate({
      ...data,
      pmId,
    });
  }
}
