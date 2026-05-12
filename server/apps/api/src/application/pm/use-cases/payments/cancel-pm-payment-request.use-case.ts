import { Inject, Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository } from '../../../../domains/pm/IPropertyRepository';
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';

@Injectable()
export class CancelPmPaymentRequestUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly corePaymentRepo: IPaymentRequestRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmId: number, uuid: string): Promise<{ success: boolean; message: string }> {
    const pmPR = await this.pmPaymentRepo.findByUuid(uuid);
    if (!pmPR) throw new NotFoundException('Payment request not found');
    
    if (pmPR.pmId !== pmId) {
      throw new UnauthorizedException('Unauthorized to cancel this request');
    }

    if (pmPR.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a fully paid payment request');
    }

    if (pmPR.amountPaid > 0) {
      throw new BadRequestException('Cannot cancel a request that has partial payments. Please refund the tenant first.');
    }

    await this.pmPaymentRepo.update(uuid, {
      status: 'CANCELLED'
    });

    if (pmPR.paymentRequestId) {
      await this.corePaymentRepo.update(pmPR.paymentRequestId, {
        status: 'CANCELLED'
      });
    }

    await this.activityLog.log({
      pmId,
      ownerPmId: pmId,
      action: ActivityAction.CANCEL_PAYMENT,
      entityType: 'PAYMENT',
      entityId: uuid,
      description: `Cancelled payment request #${uuid.slice(-8).toUpperCase()} for ${pmPR.amount} ${pmPR.currency}`,
      metadata: {
        amount: pmPR.amount,
        status: 'CANCELLED'
      }
    });

    return {
      success: true,
      message: 'Payment request cancelled successfully'
    };
  }
}
