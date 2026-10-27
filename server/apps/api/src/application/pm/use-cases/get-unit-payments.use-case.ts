import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetUnitPaymentsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
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

    // Collect candidate references from payments to batch check for genuine Upward transactions
    const candidateReferences = payments
      .map(p => p.reference)
      .filter((ref): ref is string => Boolean(ref));

    const matchedTransactions = candidateReferences.length > 0
      ? await this.prisma.upward_transaction.findMany({
          where: {
            reference: { in: candidateReferences },
            status: 'SUCCESS',
          },
          select: { reference: true, amount: true },
        })
      : [];

    const txMap = new Map<string, number>(
      matchedTransactions.map(t => [t.reference, t.amount]),
    );

    return Promise.all(
      payments.map(async (payment: any) => {
        const isManualUpload = Boolean(
          payment.receiptUrl && !payment.receiptUrl.includes('/upward_receipt_'),
        );

        if (isManualUpload) {
          try {
            const downloadUrl = await this.s3Service.getDownloadUrl(payment.receiptUrl);
            return {
              ...payment,
              receiptUrl: downloadUrl,
              rawReceiptKey: payment.receiptUrl,
              isUpwardReceipt: false,
            };
          } catch {
            return {
              ...payment,
              receiptUrl: null,
              isUpwardReceipt: false,
            };
          }
        }

        const hasMatchingTx = Boolean(payment.reference && txMap.has(payment.reference));

        if (hasMatchingTx) {
          return {
            ...payment,
            receiptUrl: `/api/v1/pm/units/${unitUuid}/payments/${payment.uuid}/receipt`,
            receiptFileName: `upward_receipt_${payment.amount}.pdf`,
            isUpwardReceipt: true,
          };
        }

        return {
          ...payment,
          receiptUrl: null,
          isUpwardReceipt: false,
        };
      }),
    );
  }
}


