import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service'
import { UnifiedCommunicationService } from '../shared/infrastructure/communication/unified-communication.service'
import { EncryptionService } from '../shared/infrastructure/common/encryption.service'
import { UpwardSubscriptionTier, UpwardUnitBillingMode, UpwardPaymentStatus } from '@prisma/client'

@Injectable()
export class SubscriptionBillingScheduler {
  private readonly logger = new Logger(SubscriptionBillingScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryption: EncryptionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processBillingCycles() {
    this.logger.log('Executing daily subscription billing routine...')
    const today = new Date()
    const todayDay = today.getDate()

    // 1. Apply pending downgrades for subscriptions whose anniversary date is today
    const subsDueToday = await this.prisma.upward_subscription.findMany({
      where: {
        anniversaryDate: todayDay,
      },
    })

    for (const sub of subsDueToday) {
      if (sub.pendingTier) {
        const oldTier = sub.tier
        const newTier = sub.pendingTier
        const billingMode = sub.pendingUnitBillingMode || sub.unitBillingMode
        const rate =
          newTier === UpwardSubscriptionTier.TIER_2
            ? 1500
            : newTier === UpwardSubscriptionTier.TIER_3
              ? 2250
              : 0

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
          })

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
          })
        })

        this.logger.log(`Applied scheduled downgrade to ${newTier} for PM ${sub.pmId}`)
      }
    }

    // 2. Process 5-day-pre-anniversary Invoice Generation
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + 5)
    const targetDay = targetDate.getDate()

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
    })

    for (const sub of subsForInvoice) {
      await this.generatePreInvoice(sub, today)
    }

    // 3. Process Anniversary Deductions
    const activeSubsDue = await this.prisma.upward_subscription.findMany({
      where: {
        anniversaryDate: todayDay,
        tier: { not: UpwardSubscriptionTier.FREE },
        status: { in: ['ACTIVE', 'GRACE'] },
      },
    })

    for (const sub of activeSubsDue) {
      await this.deductInvoiceFromWallet(sub, today)
    }

    // 4. Process Grace Period Expirations
    const graceSubs = await this.prisma.upward_subscription.findMany({
      where: { status: 'GRACE' },
    })

    for (const sub of graceSubs) {
      if (sub.graceStartedAt) {
        const graceEnd = new Date(sub.graceStartedAt)
        graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays)
        if (today >= graceEnd) {
          await this.lockSubscription(sub)
        }
      }
    }
  }

  private async generatePreInvoice(sub: any, today: Date) {
    const isFirstCycle = await this.isFirstCycle(sub.pmId)

    const billingTier = sub.pendingTier || sub.tier
    const billingMode = sub.pendingUnitBillingMode || sub.unitBillingMode

    const unitCount = await this.countManagedUnits(sub.pmId, billingMode)

    // Use the explicitly set yearly price if available, otherwise fallback to default tier pricing
    let yearlyRate =
      sub.priceYearly > 0
        ? sub.priceYearly
        : billingTier === UpwardSubscriptionTier.TIER_2
          ? 1500
          : billingTier === UpwardSubscriptionTier.TIER_3
            ? 2250
            : 0

    const monthlyRate = yearlyRate / 12

    const calculatedBase = unitCount * monthlyRate
    let discountAmount = 0

    // Check if a valid discount is currently active
    const isDiscountActive =
      sub.discountStart && sub.discountEnd
        ? sub.discountStart <= today && sub.discountEnd >= today
        : true // If no dates are set, assume permanent discount if discountType exists

    if (sub.discountType && isDiscountActive && sub.discountValue > 0) {
      if (sub.discountType === 'PERCENTAGE') {
        discountAmount = calculatedBase * (sub.discountValue / 100)
      } else if (sub.discountType === 'FIXED') {
        const fixedMonthlyDiscountPerUnit = sub.discountValue / 12
        discountAmount = unitCount * fixedMonthlyDiscountPerUnit
      }
    }

    const upcomingMonthAmount = Math.max(0, calculatedBase - discountAmount)

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
      })

      await this.prisma.upward_subscription_invoice.create({
        data: {
          pmId: sub.pmId,
          unitCount,
          amount: upcomingMonthAmount,
          invoiceDate: today,
          deductionDate: this.getAnniversaryDate(sub.anniversaryDate, 0),
          paymentStatus: UpwardPaymentStatus.PENDING,
        },
      })

      this.logger.log(`Generated first-cycle double invoices for PM: ${sub.pmId}`)
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
      })
      this.logger.log(`Generated standard invoice for PM: ${sub.pmId}`)
    }

    try {
      const recipient = await this.getPmRecipient(sub.pmId)
      const wallet = await this.prisma.upward_pm_wallet.findUnique({
        where: { pmId: sub.pmId },
      })
      const currentBalance = wallet?.balance || 0
      const totalPreInvoiceAmount = isFirstCycle ? upcomingMonthAmount * 2 : upcomingMonthAmount
      const isDeficit = currentBalance < totalPreInvoiceAmount
      const deficitAmount = Math.max(0, totalPreInvoiceAmount - currentBalance)
      const billingExplanation = isFirstCycle
        ? `Initial billing covers 2 monthly periods for your ${unitCount} managed units: the completed inaugural month in arrears plus the upcoming month in advance.`
        : undefined

      const targetDeductionDate = this.getAnniversaryDate(sub.anniversaryDate, 0)
      const formattedDeductionDate = targetDeductionDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      if (recipient && recipient.email) {
        const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io')
          .split(',')[0]!
          .trim()
        await this.unifiedCommService
          .processCommunication({
            recipientEmail: recipient.email,
            recipientName: recipient.pmName,
            recipientRole: 'PM',
            pmUuid: recipient.pm.uuid,
            type: 'PM_SUBSCRIPTION_PRE_INVOICE',
            context: {
              pmName: recipient.pmName,
              amountDue: totalPreInvoiceAmount,
              formattedAmountDue: totalPreInvoiceAmount.toLocaleString(),
              unitCount,
              billingExplanation,
              billingNote: billingExplanation ? ` (Note: ${billingExplanation})` : '',
              deductionDate: formattedDeductionDate,
              currentBalance,
              formattedCurrentBalance: currentBalance.toLocaleString(),
              isDeficit,
              deficitAmount,
              formattedDeficit: deficitAmount.toLocaleString(),
              baseUrl,
            },
          })
          .catch((err) => {
            this.logger.error(
              `Failed to send pre-invoice notification to PM ${recipient.email}:`,
              err,
            )
          })
      }

      const preInvoiceMessage = isFirstCycle
        ? `Your initial subscription charge of NGN ${totalPreInvoiceAmount.toLocaleString()} (covering inaugural month + upcoming month for ${unitCount} units) will be deducted on ${formattedDeductionDate}. Current wallet balance: NGN ${currentBalance.toLocaleString()}.`
        : `Your upcoming monthly subscription charge of NGN ${upcomingMonthAmount.toLocaleString()} will be deducted on ${formattedDeductionDate}. Current wallet balance: NGN ${currentBalance.toLocaleString()}.`

      await this.prisma.upward_pm_notification
        .create({
          data: {
            pmId: sub.pmId,
            title: 'Upcoming subscription renewal',
            message: preInvoiceMessage,
            type: 'PAYMENT_PENDING',
            isPopup: isDeficit,
            url: '/subscription/wallet',
          },
        })
        .catch((err) => {
          this.logger.error(`Failed to create pre-invoice notification for PM ${sub.pmId}:`, err)
        })
    } catch (err) {
      this.logger.error(`Error sending pre-invoice notification for PM ${sub.pmId}:`, err)
    }
  }

  private async deductInvoiceFromWallet(sub: any, today: Date) {
    const pendingInvoices = await this.prisma.upward_subscription_invoice.findMany({
      where: {
        pmId: sub.pmId,
        paymentStatus: UpwardPaymentStatus.PENDING,
        deductionDate: { lte: today },
      },
    })

    if (pendingInvoices.length === 0) return

    const totalDue = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const txResult = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.upward_pm_wallet.findUnique({
        where: { pmId: sub.pmId },
      })

      const currentBalance = wallet?.balance ?? 0

      if (!wallet || wallet.balance < totalDue) {
        this.logger.warn(
          `Deduction failed for PM ${sub.pmId}. Wallet balance is less than required.`,
        )

        await tx.upward_subscription.update({
          where: { pmId: sub.pmId },
          data: {
            status: 'GRACE',
            graceStartedAt: sub.status === 'GRACE' ? sub.graceStartedAt : today,
          },
        })
        return {
          status: 'INSUFFICIENT_FUNDS' as const,
          currentWalletBalance: currentBalance,
          newWalletBalance: currentBalance,
        }
      }

      const newBalance = wallet.balance - totalDue
      await tx.upward_pm_wallet.update({
        where: { pmId: sub.pmId },
        data: { balance: newBalance },
      })

      await tx.upward_pm_wallet_transaction.create({
        data: {
          walletId: wallet.id,
          pmId: sub.pmId,
          type: 'DEDUCTION',
          amount: -totalDue,
          reference: `SUB-DED-${sub.pmId}-${today.getTime()}`,
          narration: `Monthly Subscription deduction`,
        },
      })

      await tx.upward_subscription_invoice.updateMany({
        where: {
          id: { in: pendingInvoices.map((inv) => inv.id) },
        },
        data: { paymentStatus: UpwardPaymentStatus.PAID },
      })

      await tx.upward_subscription.update({
        where: { pmId: sub.pmId },
        data: {
          status: 'ACTIVE',
          graceStartedAt: null,
        },
      })

      this.logger.log(`Successfully deducted ₦${totalDue} from PM ${sub.pmId}`)
      return {
        status: 'SUCCESS' as const,
        currentWalletBalance: currentBalance,
        newWalletBalance: newBalance,
      }
    })

    try {
      const recipient = await this.getPmRecipient(sub.pmId)
      const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io')
        .split(',')[0]!
        .trim()

      if (txResult.status === 'SUCCESS') {
        const nextBillingDateObj = this.getAnniversaryDate(sub.anniversaryDate, 1)
        const formattedNextBillingDate = nextBillingDateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        const actualUnitCount =
          pendingInvoices[0]?.unitCount ||
          (await this.countManagedUnits(sub.pmId, sub.unitBillingMode))
        const isMultiCycle = pendingInvoices.length > 1
        const billingExplanation = isMultiCycle
          ? `Initial billing covers ${pendingInvoices.length} monthly cycles for your ${actualUnitCount} managed units: the completed inaugural month plus the upcoming month in advance.`
          : undefined

        if (recipient && recipient.email) {
          await this.unifiedCommService
            .processCommunication({
              recipientEmail: recipient.email,
              recipientName: recipient.pmName,
              recipientRole: 'PM',
              pmUuid: recipient.pm.uuid,
              type: 'PM_SUBSCRIPTION_DEDUCTED',
              context: {
                pmName: recipient.pmName,
                amount: totalDue,
                formattedAmount: totalDue.toLocaleString(),
                unitCount: actualUnitCount,
                billingExplanation,
                billingNote: billingExplanation ? ` (Note: ${billingExplanation})` : '',
                walletBalance: txResult.newWalletBalance,
                formattedWalletBalance: txResult.newWalletBalance.toLocaleString(),
                nextBillingDate: formattedNextBillingDate,
                tierName:
                  sub.tier === 'TIER_3'
                    ? 'Tier 3 (Full Access)'
                    : sub.tier === 'TIER_2'
                      ? 'Tier 2 (Service Charges & Docs)'
                      : 'Upward PM',
                baseUrl,
              },
            })
            .catch((err) => {
              this.logger.error(`Failed to send deduction email to PM ${recipient.email}:`, err)
            })
        }

        const notifMessage = isMultiCycle
          ? `Your initial subscription payment of NGN ${totalDue.toLocaleString()} (covering ${pendingInvoices.length} monthly cycles for ${actualUnitCount} units) was successfully deducted from your wallet.`
          : `Your monthly subscription payment of NGN ${totalDue.toLocaleString()} was successfully deducted from your wallet.`

        await this.prisma.upward_pm_notification
          .create({
            data: {
              pmId: sub.pmId,
              title: 'Subscription payment successful',
              message: notifMessage,
              type: 'PAYMENT_COMPLETED',
              isPopup: false,
              url: '/subscription/wallet',
            },
          })
          .catch((err) => {
            this.logger.error(`Failed to create deduction notification for PM ${sub.pmId}:`, err)
          })
      } else if (txResult.status === 'INSUFFICIENT_FUNDS') {
        const graceEndDateObj = new Date(today)
        graceEndDateObj.setDate(graceEndDateObj.getDate() + (sub.gracePeriodDays || 7))
        const formattedGraceEndDate = graceEndDateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        if (recipient && recipient.email) {
          await this.unifiedCommService
            .processCommunication({
              recipientEmail: recipient.email,
              recipientName: recipient.pmName,
              recipientRole: 'PM',
              pmUuid: recipient.pm.uuid,
              type: 'PM_SUBSCRIPTION_FAILED_LOW_BALANCE',
              context: {
                pmName: recipient.pmName,
                amountDue: totalDue,
                formattedAmountDue: totalDue.toLocaleString(),
                currentBalance: txResult.currentWalletBalance,
                formattedCurrentBalance: txResult.currentWalletBalance.toLocaleString(),
                gracePeriodDays: sub.gracePeriodDays || 7,
                graceEndDate: formattedGraceEndDate,
                dvaAccountNumber: recipient.dva?.accountNumber || '',
                dvaBankName: recipient.dva?.bankName || '',
                dvaAccountName: recipient.dva?.accountName || '',
                baseUrl,
              },
            })
            .catch((err) => {
              this.logger.error(
                `Failed to send low-balance failure email to PM ${recipient.email}:`,
                err,
              )
            })
        }

        await this.prisma.upward_pm_notification
          .create({
            data: {
              pmId: sub.pmId,
              title: 'Subscription payment failed',
              message: `Your monthly subscription payment of NGN ${totalDue.toLocaleString()} failed due to insufficient wallet balance. Your account has entered a ${sub.gracePeriodDays || 7}-day grace period.`,
              type: 'PAYMENT_FAILED',
              isPopup: true,
              url: '/subscription/wallet',
            },
          })
          .catch((err) => {
            this.logger.error(`Failed to create low-balance notification for PM ${sub.pmId}:`, err)
          })
      }
    } catch (err) {
      this.logger.error(`Error in post-deduction communication handler for PM ${sub.pmId}:`, err)
    }
  }

  private async getPmRecipient(pmId: number) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { id: pmId },
      include: {
        dedicatedVirtualAccount: true,
      },
    })

    if (!pm) return null

    let email = ''
    let firstName = ''
    let lastName = ''
    let businessName = ''

    try {
      email = pm.email ? this.encryption.decrypt(pm.email).trim() : ''
      firstName = pm.firstName ? this.encryption.decrypt(pm.firstName).trim() : ''
      lastName = pm.lastName ? this.encryption.decrypt(pm.lastName).trim() : ''
      businessName = pm.businessName ? this.encryption.decrypt(pm.businessName).trim() : ''
    } catch (e) {
      email = pm.email || ''
      firstName = pm.firstName || ''
      lastName = pm.lastName || ''
      businessName = pm.businessName || ''
    }

    const pmName = businessName || `${firstName} ${lastName}`.trim() || 'Property Manager'

    return {
      pm,
      email,
      pmName,
      dva: pm.dedicatedVirtualAccount,
    }
  }

  private async lockSubscription(sub: any) {
    await this.prisma.upward_subscription.update({
      where: { pmId: sub.pmId },
      data: { status: 'LOCKED' },
    })
    this.logger.error(`Subscription locked for PM ${sub.pmId} due to unpaid balance.`)

    try {
      await this.prisma.upward_pm_notification.create({
        data: {
          pmId: sub.pmId,
          title: 'Account access locked',
          message:
            'Your subscription access has been locked due to an expired grace period and unpaid balance. Please top up your wallet to restore access.',
          type: 'SYSTEM_ALERT',
          isPopup: true,
          url: '/subscription/wallet',
        },
      })
    } catch (err) {
      this.logger.error(`Failed to create lock notification for PM ${sub.pmId}:`, err)
    }
  }

  private async countManagedUnits(pmId: number, mode: UpwardUnitBillingMode): Promise<number> {
    if (mode === UpwardUnitBillingMode.ALL) {
      return this.prisma.upward_pm_unit.count({
        where: { property: { pmId } },
      })
    } else {
      return this.prisma.upward_pm_unit.count({
        where: {
          property: { pmId },
          status: 'OCCUPIED',
        },
      })
    }
  }

  private async isFirstCycle(pmId: number): Promise<boolean> {
    const invoiceCount = await this.prisma.upward_subscription_invoice.count({
      where: { pmId },
    })
    return invoiceCount === 0
  }

  private getAnniversaryDate(anniversaryDay: number, monthOffset: number): Date {
    const d = new Date()
    d.setMonth(d.getMonth() + monthOffset)
    d.setDate(anniversaryDay)
    return d
  }
}
