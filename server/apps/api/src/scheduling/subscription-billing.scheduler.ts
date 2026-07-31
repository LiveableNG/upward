import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service';
import { UpwardSubscriptionTier, UpwardUnitBillingMode, UpwardPaymentStatus } from '@prisma/client';

@Injectable()
export class SubscriptionBillingScheduler {
  private readonly logger = new Logger(SubscriptionBillingScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processBillingCycles() {
    this.logger.log('Executing daily subscription billing routine...');
    const today = new Date();
    const todayDay = today.getDate();

    // 1. Apply pending downgrades for subscriptions whose anniversary date is today
    const subsDueToday = await this.prisma.upward_subscription.findMany({
      where: {
        anniversaryDate: todayDay,
      },
    });

    for (const sub of subsDueToday) {
      if (sub.pendingTier) {
        const oldTier = sub.tier;
        const newTier = sub.pendingTier;
        const billingMode = sub.pendingUnitBillingMode || sub.unitBillingMode;
        const rate = newTier === UpwardSubscriptionTier.TIER_2 ? 1500 : newTier === UpwardSubscriptionTier.TIER_3 ? 2250 : 0;

        await this.prisma.$transaction(async (tx) => {
          await tx.upward_subscription.update({
            where: { id: sub.id },
            data: {
              tier: newTier,
              unitBillingMode: billingMode,
              priceYearly: rate,
              priceMonthly: rate / 12,
              pendingTier: null,
              pendingUnitBillingMode: null,
              status: newTier === UpwardSubscriptionTier.FREE ? 'ACTIVE' : sub.status,
            },
          });

          await tx.upward_subscription_log.create({
            data: {
              pmId: sub.pmId,
              previousTier: oldTier,
              newTier: newTier,
              previousStatus: sub.status,
              newStatus: newTier === UpwardSubscriptionTier.FREE ? 'ACTIVE' : sub.status,
              action: 'DOWNGRADE',
              reason: 'Scheduled downgrade applied',
            },
          });
        });

        this.logger.log(`Applied scheduled downgrade to ${newTier} for PM ${sub.pmId}`);
      }
    }

    // 2. Process 5-day-pre-anniversary Invoice Generation
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 5);
    const targetDay = targetDate.getDate();

    const subsForInvoice = await this.prisma.upward_subscription.findMany({
      where: {
        anniversaryDate: targetDay,
        OR: [
          {
            pendingTier: { not: UpwardSubscriptionTier.FREE },
          },
          {
            pendingTier: null,
            tier: { not: UpwardSubscriptionTier.FREE },
          },
        ],
      },
    });

    for (const sub of subsForInvoice) {
      await this.generatePreInvoice(sub, today);
    }

    // 3. Process Anniversary Deductions
    const activeSubsDue = await this.prisma.upward_subscription.findMany({
      where: {
        anniversaryDate: todayDay,
        tier: { not: UpwardSubscriptionTier.FREE },
        status: { in: ['ACTIVE', 'GRACE'] },
      },
    });

    for (const sub of activeSubsDue) {
      await this.deductInvoiceFromWallet(sub, today);
    }

    // 4. Process Grace Period Expirations
    const graceSubs = await this.prisma.upward_subscription.findMany({
      where: { status: 'GRACE' },
    });

    for (const sub of graceSubs) {
      if (sub.graceStartedAt) {
        const graceEnd = new Date(sub.graceStartedAt);
        graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays);
        if (today >= graceEnd) {
          await this.lockSubscription(sub);
        }
      }
    }
  }

  private async generatePreInvoice(sub: any, today: Date) {
    const isFirstCycle = await this.isFirstCycle(sub.pmId);
    
    const billingTier = sub.pendingTier || sub.tier;
    const billingMode = sub.pendingUnitBillingMode || sub.unitBillingMode;
    
    const unitCount = await this.countManagedUnits(sub.pmId, billingMode);
    
    const yearlyRate = billingTier === UpwardSubscriptionTier.TIER_2 ? 1500 : billingTier === UpwardSubscriptionTier.TIER_3 ? 2250 : 0;
    const monthlyRate = yearlyRate / 12;

    let discountPercent = 0;
    if (sub.discountType === 'PERCENTAGE' && sub.discountStart && sub.discountEnd && sub.discountStart <= today && sub.discountEnd >= today) {
      discountPercent = sub.discountValue ?? 0;
    }

    const calculatedBase = unitCount * monthlyRate;
    const discountAmount = calculatedBase * (discountPercent / 100);
    const upcomingMonthAmount = Math.max(0, calculatedBase - discountAmount);

    if (isFirstCycle) {
      // FIRST CYCLE EXCEPTION: Generate double invoices
      await this.prisma.upward_subscription_invoice.create({
        data: {
          pmId: sub.pmId,
          unitCount,
          amount: upcomingMonthAmount,
          invoiceDate: today,
          deductionDate: this.getAnniversaryDate(sub.anniversaryDate, 0),
          paymentStatus: UpwardPaymentStatus.PENDING,
        },
      });

      await this.prisma.upward_subscription_invoice.create({
        data: {
          pmId: sub.pmId,
          unitCount,
          amount: upcomingMonthAmount,
          invoiceDate: today,
          deductionDate: this.getAnniversaryDate(sub.anniversaryDate, 0),
          paymentStatus: UpwardPaymentStatus.PENDING,
        },
      });

      this.logger.log(`Generated first-cycle double invoices for PM: ${sub.pmId}`);
    } else {
      await this.prisma.upward_subscription_invoice.create({
        data: {
          pmId: sub.pmId,
          unitCount,
          amount: upcomingMonthAmount,
          invoiceDate: today,
          deductionDate: this.getAnniversaryDate(sub.anniversaryDate, 0),
          paymentStatus: UpwardPaymentStatus.PENDING,
        },
      });
      this.logger.log(`Generated standard invoice for PM: ${sub.pmId}`);
    }
  }

  private async deductInvoiceFromWallet(sub: any, today: Date) {
    const pendingInvoices = await this.prisma.upward_subscription_invoice.findMany({
      where: {
        pmId: sub.pmId,
        paymentStatus: UpwardPaymentStatus.PENDING,
        deductionDate: { lte: today },
      },
    });

    if (pendingInvoices.length === 0) return;

    const totalDue = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.upward_pm_wallet.findUnique({
        where: { pmId: sub.pmId },
      });

      if (!wallet || wallet.balance < totalDue) {
        this.logger.warn(`Deduction failed for PM ${sub.pmId}. Wallet balance is less than required.`);
        
        await tx.upward_subscription.update({
          where: { pmId: sub.pmId },
          data: {
            status: 'GRACE',
            graceStartedAt: sub.status === 'GRACE' ? sub.graceStartedAt : today,
          },
        });
        return;
      }

      const newBalance = wallet.balance - totalDue;
      await tx.upward_pm_wallet.update({
        where: { pmId: sub.pmId },
        data: { balance: newBalance },
      });

      await tx.upward_pm_wallet_transaction.create({
        data: {
          walletId: wallet.id,
          pmId: sub.pmId,
          type: 'DEDUCTION',
          amount: -totalDue,
          reference: `SUB-DED-${sub.pmId}-${today.getTime()}`,
          narration: `Monthly Subscription deduction`,
        },
      });

      await tx.upward_subscription_invoice.updateMany({
        where: {
          id: { in: pendingInvoices.map((inv) => inv.id) },
        },
        data: { paymentStatus: UpwardPaymentStatus.PAID },
      });

      await tx.upward_subscription.update({
        where: { pmId: sub.pmId },
        data: {
          status: 'ACTIVE',
          graceStartedAt: null,
        },
      });

      this.logger.log(`Successfully deducted ₦${totalDue} from PM ${sub.pmId}`);
    });
  }

  private async lockSubscription(sub: any) {
    await this.prisma.upward_subscription.update({
      where: { pmId: sub.pmId },
      data: { status: 'LOCKED' },
    });
    this.logger.error(`Subscription locked for PM ${sub.pmId} due to unpaid balance.`);
  }

  private async countManagedUnits(pmId: number, mode: UpwardUnitBillingMode): Promise<number> {
    if (mode === UpwardUnitBillingMode.ALL) {
      return this.prisma.upward_pm_unit.count({
        where: { property: { pmId } },
      });
    } else {
      return this.prisma.upward_pm_unit.count({
        where: {
          property: { pmId },
          status: 'OCCUPIED',
        },
      });
    }
  }

  private async isFirstCycle(pmId: number): Promise<boolean> {
    const invoiceCount = await this.prisma.upward_subscription_invoice.count({
      where: { pmId },
    });
    return invoiceCount === 0;
  }

  private getAnniversaryDate(anniversaryDay: number, monthOffset: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    d.setDate(anniversaryDay);
    return d;
  }
}
