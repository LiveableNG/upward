
import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmDocumentsUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
  ) {}

  async execute(pmId: number) {
    const [templates, history] = await Promise.all([
      this.documentRepo.findTemplatesByPmId(pmId),
      this.documentRepo.findSentDocumentsByPmId(pmId),
    ]);

    return {
      templates,
      history,
    };
  }
}
