import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository';
import { ConfigService } from '@nestjs/config';
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service';

@Injectable()
export class ProcessHourlySettlementsUseCase {
  private readonly logger = new Logger(ProcessHourlySettlementsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly configService: ConfigService,
    private readonly paymentConfig: PaymentConfigurationService,
  ) {}

  async execute() {
    this.logger.log('Starting hourly settlement and refund processing...');

    await this.processVerifiedSettlements();
    await this.processPendingRefunds();

    this.logger.log('Hourly processing completed.');
  }

  private async processVerifiedSettlements() {
    // 1. Find all verified transactions ready for settlement
    const transactions = await this.prisma.upward_transaction.findMany({
      where: {
        settlementStatus: 'VERIFIED',
        status: 'SUCCESS',
      },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: { subaccount: true }
            }
          }
        }
      }
    });

    if (transactions.length === 0) return;

    // 2. Group by Landlord (Subaccount)
    const groups = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const sub = tx.paymentRequest?.subaccount || tx.paymentRequest?.userProperty?.subaccount;
      const subaccountCode = sub?.subaccountCode;
      if (!subaccountCode) {
        this.logger.error(`Transaction ${tx.reference} is VERIFIED but has no subaccount linked. Skipping.`);
        continue;
      }
      if (!groups.has(subaccountCode)) groups.set(subaccountCode, []);
      groups.get(subaccountCode)!.push(tx);
    }

    // 3. Process each group (Bundled Settlement)
    for (const [subaccountCode, txs] of groups.entries()) {
      try {
        let totalRentToSettle = 0;
        let totalUpwardFees = 0;
        for (const tx of txs) {
          if (tx.lineItems && Array.isArray(tx.lineItems)) {
            const settleableItems = (tx.lineItems as any[]).filter(item => 
              item.name === 'Rent' || 
              (!['Fee', 'Overpayment', 'Package'].includes(item.category) && 
               !item.name.toLowerCase().includes('fee') && 
               !item.name.toLowerCase().includes('benefit') && 
               !item.name.toLowerCase().includes('package'))
            );
            if (settleableItems.length > 0) {
              const settleableSum = settleableItems.reduce((sum, item) => sum + (item.amount || 0), 0);
              totalRentToSettle += settleableSum;
              totalUpwardFees += Math.max(0, tx.amount - settleableSum);
            } else {
              const fee = this.paymentConfig.getProcessingFee();
              totalRentToSettle += Math.max(0, tx.amount - fee);
              totalUpwardFees += Math.min(tx.amount, fee);
            }
          } else {
            const fee = this.paymentConfig.getProcessingFee();
            totalRentToSettle += Math.max(0, tx.amount - fee);
            totalUpwardFees += Math.min(tx.amount, fee);
          }
        }

        if (totalRentToSettle <= 0) continue;

        const sub = txs[0]?.paymentRequest?.subaccount || txs[0]?.paymentRequest?.userProperty?.subaccount;
        if (!sub) continue;

        // Create Batch Record
        const batch = await this.prisma.upward_settlement_batch.create({
          data: {
            landlordId: subaccountCode,
            totalAmount: totalRentToSettle,
            status: 'PENDING',
          }
        });

        // Initiate ONE Bundled Transfer to Landlord
        this.logger.log(`Settling batch ${batch.uuid}: ₦${totalRentToSettle} for ${txs.length} transactions to ${sub.accountNumber}`);
        
        await this.paymentGateway.initiateTransfer({
          amount: totalRentToSettle,
          accountNumber: sub.accountNumber,
          bankCode: sub.bankCode,
          reference: `BATCH-${batch.uuid}`,
          narration: `Upward Batch Settlement: ${txs.length} properties`
        });

        // Update Transactions and Batch status
        await this.prisma.upward_transaction.updateMany({
          where: { id: { in: txs.map(t => t.id) } },
          data: {
            settlementStatus: 'SETTLED',
            settlementBatchId: batch.id
          }
        });

        await this.prisma.upward_settlement_batch.update({
          where: { id: batch.id },
          data: { status: 'COMPLETED', transferReference: `BATCH-${batch.uuid}` }
        });

        // Move Revenue to Separate Account (Simulated here - normally another transfer)
        this.logger.log(`Revenue Captured: ₦${totalUpwardFees} from batch ${batch.uuid}`);
        
      } catch (e: any) {
        this.logger.error(`Failed to process settlement for ${subaccountCode}: ${e.message}`);
      }
    }
  }

  private async processPendingRefunds() {
    // 1. Find all transactions pending refund that are NOT managed by a Property Manager
    const transactions = await this.prisma.upward_transaction.findMany({
      where: {
        settlementStatus: 'PENDING_REFUND',
        status: 'SUCCESS',
        OR: [
          { paymentRequestId: null },
          {
            paymentRequest: {
              OR: [
                { userPropertyId: null },
                {
                  userProperty: {
                    pmId: null
                  }
                }
              ]
            }
          }
        ]
      },
      include: {
        user: {
          include: { bankDetails: true }
        }
      }
    });

    for (const tx of transactions) {
      if (!tx.user.bankDetails) {
        this.logger.log(`Refund pending for User ${tx.userId} but no bank details found. Waiting for claim.`);
        const existingLog = await this.prisma.upward_refund_log.findFirst({
          where: { transactionId: tx.id },
          orderBy: { createdAt: 'desc' }
        });
        if (existingLog && existingLog.status !== 'PENDING_DISPATCH') {
          await this.prisma.upward_refund_log.update({
            where: { id: existingLog.id },
            data: { status: 'PENDING_DISPATCH' }
          });
        }
        continue;
      }

      try {
        const bank = tx.user.bankDetails;
        const refundAmount = tx.amount - this.paymentConfig.getGatewayFee(); // Refund everything minus Paystack fee

        this.logger.log(`Initiating automated refund of ₦${refundAmount} to ${bank.accountNumber}`);

        await this.paymentGateway.initiateTransfer({
          amount: refundAmount,
          accountNumber: bank.accountNumber,
          bankCode: bank.bankCode,
          reference: `REFUND-${tx.reference}`,
          narration: `Upward Refund: Full Payment Requirement Not Met`
        });

        await this.prisma.upward_transaction.update({
          where: { id: tx.id },
          data: { settlementStatus: 'REFUNDED' }
        });

        const existingLog = await this.prisma.upward_refund_log.findFirst({
          where: { transactionId: tx.id },
          orderBy: { createdAt: 'desc' }
        });
        if (existingLog) {
          await this.prisma.upward_refund_log.update({
            where: { id: existingLog.id },
            data: {
              status: 'DISPATCHED',
              resolvedAt: new Date(),
              metadata: {
                ...(existingLog.metadata as any || {}),
                transferReference: `REFUND-${tx.reference}`,
                refundedAmount: refundAmount,
                dispatchedAt: new Date()
              }
            }
          });
        }

        this.logger.log(`Refund completed for ${tx.reference}`);
      } catch (e: any) {
        this.logger.error(`Automated refund failed for ${tx.reference}: ${e.message}`);
        const existingLog = await this.prisma.upward_refund_log.findFirst({
          where: { transactionId: tx.id },
          orderBy: { createdAt: 'desc' }
        });
        if (existingLog) {
          await this.prisma.upward_refund_log.update({
            where: { id: existingLog.id },
            data: {
              status: 'FAILED',
              metadata: {
                ...(existingLog.metadata as any || {}),
                failureReason: e.message,
                failedAt: new Date()
              }
            }
          });
        }
      }
    }
  }
}
