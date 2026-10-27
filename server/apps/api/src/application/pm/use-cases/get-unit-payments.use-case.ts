import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetUnitPaymentsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number, unitUuid: string, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    // Verify PM has access to the unit
    const units = actor
      ? await this.unitRepository.findAccessibleForActor(actor)
      : await this.unitRepository.findAccessibleByPmId(ownerPmId);

    if (!units.find(u => u.uuid === unitUuid)) {
      throw new NotFoundException('Unit not found');
    }

    const payments = await this.unitRepository.getRentPayments(unitUuid);

    // Resolve receiptUrl to S3 presigned download URL (instant direct S3 download, identical to Tenant Document Vault)
    return Promise.all(
      payments.map(async (payment: any) => {
        if (!payment.receiptUrl) return payment;
        try {
          const downloadUrl = await this.s3Service.getDownloadUrl(payment.receiptUrl);
          return {
            ...payment,
            receiptUrl: downloadUrl,
            rawReceiptKey: payment.receiptUrl,
          };
        } catch {
          return payment;
        }
      }),
    );
  }
}


