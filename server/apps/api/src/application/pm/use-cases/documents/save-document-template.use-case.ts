import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';
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
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmId: number, data: SaveDocumentTemplateDto, actor?: PmActorContext) {
    const isSystemTemplate = data.uuid?.startsWith('system-');
    const isUpdate = Boolean(data.uuid && !isSystemTemplate);
    const uuid = (!data.uuid || isSystemTemplate) ? crypto.randomUUID() : data.uuid;
    const s3Key = `pm-docs/templates/pm_${pmId}/${uuid}.html`;

    await this.s3Service.uploadBuffer(
      Buffer.from(data.content),
      s3Key,
      'text/html'
    );

    const savedTemplate = await this.documentRepo.saveTemplate({
      ...data,
      uuid,
      pmId,
      content: s3Key,
    });

    const ownerPmId = actor?.ownerPmId || pmId;
    const action = isUpdate ? ActivityAction.UPDATE_DOCUMENT_TEMPLATE : ActivityAction.CREATE_DOCUMENT_TEMPLATE;
    const description = isUpdate
      ? `Updated document template "${data.name}"`
      : `Created new document template "${data.name}" (${data.type || 'CUSTOM'})`;

    await this.activityLog.log({
      pmId: actor?.isEmployee ? ownerPmId : pmId,
      ownerPmId,
      employeeId: actor?.isEmployee ? actor.employeeId : undefined,
      action,
      entityType: 'DOCUMENT_TEMPLATE',
      entityId: uuid,
      description,
      metadata: {
        templateName: data.name,
        templateType: data.type || 'CUSTOM',
        isUpdate,
      },
    });

    return savedTemplate;
  }
}
