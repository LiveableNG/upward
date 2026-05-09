import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetPmDocumentsUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number) {
    const [templates, history] = await Promise.all([
      this.documentRepo.findTemplatesByPmId(pmId),
      this.documentRepo.findSentDocumentsByPmId(pmId),
    ]);

    const resolvedTemplates = await Promise.all(templates.map(async (t) => {
      if (t.content && t.content.startsWith('pm-docs/')) {
        try {
          const actualContent = await this.s3Service.getFileContent(t.content);
          return { ...t, content: actualContent };
        } catch (error) {
          console.error(`Failed to fetch S3 content for template ${t.uuid}:`, error);
          return t;
        }
      }
      return t;
    }));

    return {
      templates: resolvedTemplates,
      history,
    };
  }
}
