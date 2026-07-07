import { Inject, Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { IPaymentGateway, PAYMENT_GATEWAY, TRANSACTION_REPOSITORY, ITransactionRepository, PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { PaymentConfigurationService } from '../../../../shared/infrastructure/common/payment-config.service';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';
import { DistributePaymentAllocationsUseCase } from '../../../use-cases/payments/distribute-allocations.use-case';
import { SyncPmPaymentStatusUseCase } from '../../../use-cases/payments/sync-pm-status.use-case';
import { SettlePropertyBalanceUseCase } from '../../../use-cases/payments/settle-property.use-case';
import { HandlePaymentOverpaymentUseCase } from '../../../use-cases/payments/handle-overpayment.use-case';

export enum RefundResolutionAction {
  REFUND = 'REFUND',
  ACCEPT = 'ACCEPT'
}

@Injectable()
export class ResolvePendingRefundUseCase {
  private readonly logger = new Logger(ResolvePendingRefundUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly activityLog: ActivityLogService,
    private readonly distributeAllocations: DistributePaymentAllocationsUseCase,
    private readonly syncPmStatus: SyncPmPaymentStatusUseCase,
    private readonly settleProperty: SettlePropertyBalanceUseCase,
    private readonly handleOverpayment: HandlePaymentOverpaymentUseCase,
  ) {}

  async execute(pmId: number, transactionUuid: string, action: RefundResolutionAction) {
    this.logger.log(`Manually resolving pending refund for transaction ${transactionUuid} with action: ${action}`);

    // 1. Find transaction and verify ownership
    const tx = await this.prisma.upward_transaction.findUnique({
      where: { uuid: transactionUuid },
      include: {
        user: { include: { bankDetails: true } },
        paymentRequest: {
          include: {
            userProperty: true
          }
        }
      }
    });

    if (!tx) throw new NotFoundException('Transaction not found');
    
    // Verify that this transaction belongs to a property managed by this PM
    const propertyId = tx.paymentRequest?.userPropertyId;
    if (!propertyId) {
       // If no direct link, check if we can resolve it via subaccount or other means
       // For now, let's assume it must be linked to a PR managed by this PM
       const pmPR = await this.prisma.upward_pm_payment_request.findFirst({
         where: { paymentRequestId: tx.paymentRequestId, pmId }
       });
       if (!pmPR) throw new UnauthorizedException('Unauthorized to resolve this transaction');
    } else {
      const prop = await this.prisma.upward_user_property.findUnique({ where: { id: propertyId } });
      if (!prop || prop.pmId !== pmId) throw new UnauthorizedException('Unauthorized to resolve this transaction');
    }

    if (tx.settlementStatus !== 'PENDING_REFUND') {
      throw new BadRequestException(`Transaction is not in PENDING_REFUND status (Current: ${tx.settlementStatus})`);
    }

    if (action === RefundResolutionAction.REFUND) {
      if (!tx.user.bankDetails) {
        throw new BadRequestException('User has not provided bank details for refund. Please ask the tenant to update their profile.');
      }

      const bank = tx.user.bankDetails;
      const refundAmount = tx.amount - this.paymentConfig.getGatewayFee();

      this.logger.log(`Initiating manual refund of ₦${refundAmount} for transaction ${tx.reference}`);

      const existingLog = await this.prisma.upward_refund_log.findFirst({
        where: { transactionId: tx.id },
        orderBy: { createdAt: 'desc' }
      });

      try {
        await this.paymentGateway.initiateTransfer({
          amount: refundAmount,
          accountNumber: bank.accountNumber,
          bankCode: bank.bankCode,
          reference: `REFUND-${tx.reference}`,
          narration: `Upward Refund: Manually triggered by Property Manager`
        });

        await this.prisma.upward_transaction.update({
          where: { id: tx.id },
          data: { settlementStatus: 'REFUNDED' }
        });

        if (existingLog) {
          await this.prisma.upward_refund_log.update({
            where: { id: existingLog.id },
            data: {
              status: 'DISPATCHED',
              pmId,
              actionBy: `PM_${pmId}`,
              resolvedAt: new Date(),
              metadata: {
                ...(existingLog.metadata as any || {}),
                transferReference: `REFUND-${tx.reference}`,
                refundedAmount: refundAmount,
                dispatchedAt: new Date(),
                resolution: 'PM_REJECTED'
              }
            }
          });
        }
      } catch (err: any) {
        if (existingLog) {
          await this.prisma.upward_refund_log.update({
            where: { id: existingLog.id },
            data: {
              status: 'FAILED',
              pmId,
              actionBy: `PM_${pmId}`,
              metadata: {
                ...(existingLog.metadata as any || {}),
                failureReason: err.message,
                failedAt: new Date(),
                resolution: 'PM_REJECTED'
              }
            }
          });
        }
        throw err;
      }

      await this.activityLog.log({
        pmId,
        ownerPmId: pmId,
        action: ActivityAction.PROCESS_REFUND,
        entityType: 'PAYMENT',
        entityId: tx.uuid,
        description: `Manually refunded ₦${tx.amount} for transaction ${tx.reference}`,
        metadata: { reference: tx.reference, amount: tx.amount, action: 'REFUND' }
      });

      return { success: true, message: 'Refund initiated successfully' };
    } 
    
    if (action === RefundResolutionAction.ACCEPT) {
      this.logger.log(`Manually accepting underpayment for transaction ${tx.reference}`);

      await this.prisma.$transaction(async (txClient) => {
        // 1. Update settlementStatus to VERIFIED
        await txClient.upward_transaction.update({
          where: { id: tx.id },
          data: { settlementStatus: 'VERIFIED' }
        });

        const existingLog = await txClient.upward_refund_log.findFirst({
          where: { transactionId: tx.id },
          orderBy: { createdAt: 'desc' }
        });
        if (existingLog) {
          await txClient.upward_refund_log.update({
            where: { id: existingLog.id },
            data: {
              status: 'PM_ACCEPTED',
              pmId,
              actionBy: `PM_${pmId}`,
              resolvedAt: new Date(),
              metadata: {
                ...(existingLog.metadata as any || {}),
                resolution: 'PM_ACCEPTED',
                acceptedAt: new Date()
              }
            }
          });
        }

        // 2. Perform the bookkeeping (allocations, PM sync, settle property)
        if (tx.paymentRequestId) {
          const pr = await this.paymentRequestRepo.findById(tx.paymentRequestId, txClient);
          if (!pr) throw new BadRequestException('Payment request not found');
          if (pr.status === 'CANCELLED') {
            throw new BadRequestException('Cannot accept payment for a cancelled request');
          }

          // Calculate fee and payment portions
          const appliedCredit = Number((tx as any).metadata?.appliedCredit || 0);
          const effectiveAmount = tx.amount + appliedCredit;
          
          let upwardFeeAmount = 0;
          const parsedLineItems = Array.isArray((tx as any).lineItems) ? (tx as any).lineItems as any[] : [];
          const fee = parsedLineItems.find((lp: any) => lp.name === 'Processing Fee');
          if (fee) upwardFeeAmount = Number(fee.amount || fee.amountPaid || 0);

          if (upwardFeeAmount === 0) {
            const feeItem = (await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } }))
              .find((i: any) => i.name === 'Processing Fee');
            if (feeItem) {
              upwardFeeAmount = Math.min(effectiveAmount, feeItem.totalAmount - feeItem.amountPaid);
            }
          }

          // Check if rent remaining
          const prItems = await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } });
          const rentRemaining = prItems.reduce((sum: number, item: any) => {
            if (item.name === 'Processing Fee') return sum;
            return sum + Math.max(0, item.totalAmount - item.amountPaid);
          }, 0);

          const paymentAmount = Math.min(effectiveAmount - upwardFeeAmount, rentRemaining) + upwardFeeAmount;
          const excess = Math.max(0, effectiveAmount - upwardFeeAmount - rentRemaining);

          const settlementPortion = Math.max(0, paymentAmount - upwardFeeAmount);
          const newAmountPaid = (pr.amountPaid || 0) + settlementPortion;
          const totalRentOwed = prItems.reduce((sum: number, i: any) => i.name === 'Processing Fee' ? sum : sum + i.totalAmount, 0);
          const newStatus = newAmountPaid >= totalRentOwed ? 'PAID' : 'PARTIAL';

          await this.paymentRequestRepo.update(pr.id!, {
            amountPaid: Math.min(newAmountPaid, totalRentOwed),
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : undefined,
          }, txClient);

          // We check if it is DVA and need sequential fill
          const isDva = tx.narration?.includes('Transfer') || false;
          const sequentialFill = isDva && pr.allowPartial;

          const distribution = await this.distributeAllocations.execute({
            transactionId: tx.id,
            paymentRequestId: pr.id!,
            amount: effectiveAmount,
            upwardFeeAmount,
            lineItemPayments: undefined,
            manualLineItems: parsedLineItems,
            narration: tx.narration || undefined,
            sequentialFill,
            txClient
          });

          const rentPortion = distribution.rentPortion;

          await this.syncPmStatus.execute({
            paymentRequestId: pr.id!,
            rentPortion,
            txClient
          });

          const propertyId = pr.userPropertyId;
          if (propertyId) {
            await this.settleProperty.execute({
              userId: tx.userId,
              propertyId,
              rentPortion,
              paymentRequestId: pr.id!,
              dueDate: pr.dueDate,
              rentEndDate: pr.rentEndDate,
              rentType: pr.rentType,
              currency: tx.currency,
              description: tx.narration || undefined,
              txClient
            });
          }

          await this.handleOverpayment.execute({
            userId: tx.userId,
            excess,
            reference: tx.reference,
            currency: tx.currency || 'NGN',
            paymentRequestId: pr.id!,
            propertyAddress: (tx as any).propertyAddress || undefined,
            futureCreditName: (tx as any).futureCreditName || undefined,
            parentTransactionId: tx.id,
            txClient
          });
        }
      }, {
        timeout: 15000
      });

      await this.activityLog.log({
        pmId,
        ownerPmId: pmId,
        action: ActivityAction.ACCEPT_PAYMENT,
        entityType: 'PAYMENT',
        entityId: tx.uuid,
        description: `Manually accepted underpayment of ₦${tx.amount} for transaction ${tx.reference}`,
        metadata: { reference: tx.reference, amount: tx.amount, action: 'ACCEPT' }
      });

      return { success: true, message: 'Payment accepted and queued for settlement' };
    }

    throw new BadRequestException('Invalid action');
  }
}
