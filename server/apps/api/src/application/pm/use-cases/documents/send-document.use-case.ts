
import { Inject, Injectable } from '@nestjs/common';
import { 
  PM_DOCUMENT_REPOSITORY, IPmDocumentRepository,
  PM_TENANT_REPOSITORY, ITenantRepository,
  PM_UNIT_REPOSITORY, IUnitRepository
} from '../../../../domains/pm/IPropertyRepository';

export interface SendDocumentDto {
  tenantUuid?: string;
  unitUuid?: string;
  subject: string;
  content: string;
  documentType: string;
  recipientName: string;
  recipientEmail: string;
}

@Injectable()
export class SendDocumentUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
  ) {}

  async execute(pmId: number, data: SendDocumentDto) {
    let tenantId: number | null = null;
    let unitId: number | null = null;

    if (data.tenantUuid) {
      const tenant = await this.tenantRepo.findByUuid(data.tenantUuid);
      if (tenant) tenantId = tenant.id;
    }

    if (data.unitUuid) {
      const unit = await this.unitRepo.findByUuid(data.unitUuid);
      if (unit) unitId = unit.id;
    }

    return this.documentRepo.saveSentDocument({
      pmId,
      tenantId,
      unitId,
      subject: data.subject,
      content: data.content,
      documentType: data.documentType,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      status: 'SENT',
    });
  }
}
