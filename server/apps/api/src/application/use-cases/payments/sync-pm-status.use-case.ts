import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  PM_PAYMENT_REQUEST_REPOSITORY,
  IPmPaymentRequestRepository,
} from '../../../domains/pm/IPropertyRepository'
import {
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentLineItemRepository,
} from '../../../domains/payments/payment.repository'

@Injectable()
export class SyncPmPaymentStatusUseCase {
  private readonly logger = new Logger(SyncPmPaymentStatusUseCase.name)

  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
  ) {}

  async execute(params: {
    paymentRequestId: number
    rentPortion: number
    txClient: any
  }) {
    const { paymentRequestId, rentPortion, txClient } = params

    try {
      const pmPr = await this.pmPaymentRepo.findByPaymentRequestId(paymentRequestId, txClient)
      const pr = await this.paymentRequestRepo.findById(paymentRequestId, txClient)
      if (!pr) return

      let unitId: number | null = pmPr?.unitId || null
      let tenantId: number | null = pmPr?.tenantId || null

      if (!unitId && pr.userPropertyId) {
        const userProp = await txClient.upward_user_property.findUnique({
          where: { id: pr.userPropertyId }
        })
        if (userProp) {
          if (userProp.pmUnitId) {
            unitId = userProp.pmUnitId
          } else {
            const pmUnit = await txClient.upward_pm_unit.findFirst({
              where: { userPropertyUuid: userProp.uuid }
            })
            if (pmUnit) {
              unitId = pmUnit.id
            }
          }
          if (unitId) {
            const unit = await txClient.upward_pm_unit.findUnique({ where: { id: unitId } })
            if (unit) {
              tenantId = unit.tenantId
            }
          }
        }
      }

      if (!unitId) {
        this.logger.log(`No PM unit associated with payment request ${paymentRequestId}`)
        return
      }


      await txClient.upward_pm_payment_request.updateMany({
        where: { paymentRequestId },
        data: {
          amountPaid: pr.amountPaid, // Status and amountPaid come from the core PR which was already updated
          status: pr.status,
        }
      })

      if (rentPortion > 0) {
        const unit = await txClient.upward_pm_unit.findUnique({ where: { id: unitId } })
        const effectivePeriodStart = pr.rentStartDate
          ? new Date(pr.rentStartDate)
          : (unit?.rentStartDate ? new Date(unit.rentStartDate) : (pr.dueDate ? new Date(pr.dueDate) : null))
        let effectivePeriodEnd = pr.rentEndDate
          ? new Date(pr.rentEndDate)
          : (unit?.rentDueDate ? new Date(unit.rentDueDate) : null)

        if (effectivePeriodStart && !effectivePeriodEnd && unit) {
          const endD = new Date(effectivePeriodStart)
          if (unit.rentType === 'Monthly') {
            endD.setMonth(endD.getMonth() + 1)
          } else {
            const years = (unit as any).leaseYears || 1
            endD.setFullYear(endD.getFullYear() + years)
          }
          endD.setDate(endD.getDate() - 1)
          effectivePeriodEnd = endD
        }

        // Record in PM Rent History
        await txClient.upward_pm_rent_payment.create({
          data: {
            unitId: unitId,
            tenantId: tenantId,
            amount: rentPortion,
            rentAmountAtPayment: unit?.rentAmount || 0,
            paymentDate: new Date(),
            method: 'PAYSTACK',
            status: 'SUCCESS',
            notes: pr.description || `Rent Portion for request ${pr.uuid.slice(-8)}`,
            periodStart: effectivePeriodStart,
            periodEnd: effectivePeriodEnd,
          }
        })

        // Recalculate and sync active tenancy dates to latest fully paid period
        if (unit) {
          const tenantPayments = await txClient.upward_pm_rent_payment.findMany({
            where: { unitId: unit.id, tenantId: tenantId || undefined, status: 'SUCCESS' }
          });

          const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number }>();
          for (const p of tenantPayments) {
            if (!p.periodStart) continue;
            const key = new Date(p.periodStart).toISOString().split('T')[0]!;
            if (!periodMap.has(key)) {
              periodMap.set(key, {
                periodStart: new Date(p.periodStart),
                periodEnd: p.periodEnd ? new Date(p.periodEnd) : new Date(p.periodStart),
                total: 0
              });
            }
            periodMap.get(key)!.total += p.amount;
          }

          const sortedPeriods = Array.from(periodMap.values()).sort(
            (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
          );

          const fullyPaidPeriods = sortedPeriods.filter(p => p.total >= (unit.rentAmount || 0));

          if (fullyPaidPeriods.length > 0) {
            const latestFullyPaid = fullyPaidPeriods[fullyPaidPeriods.length - 1]!;

            await txClient.upward_pm_unit.update({
              where: { id: unit.id },
              data: {
                rentStartDate: latestFullyPaid.periodStart,
                rentDueDate: latestFullyPaid.periodEnd
              }
            });

            if (unit.isSynced && unit.userPropertyUuid) {
              await txClient.upward_user_property.updateMany({
                where: { uuid: unit.userPropertyUuid },
                data: {
                  rentStartDate: latestFullyPaid.periodStart,
                  rentEndDate: latestFullyPaid.periodEnd,
                }
              });
            }
            this.logger.log(`Synced active tenancy dates for unit ${unit.id} to latest fully paid period: ${latestFullyPaid.periodStart.toISOString()} - ${latestFullyPaid.periodEnd.toISOString()}`);
          }
        }

        if (pmPr && pmPr.isRecurring && pmPr.recurrenceInterval) {
          const interval = pmPr.recurrenceInterval;
          
          let nextScheduledAt: Date | null = null;
          let nextDueDate: Date | null = null;
          let nextRentStart: Date | null = null;
          let nextRentEnd: Date | null = null;

          const advanceDate = (date: Date, intervalStr: string): Date => {
            const d = new Date(date);
            if (intervalStr === 'MONTHLY') d.setMonth(d.getMonth() + 1);
            else if (intervalStr === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
            else if (intervalStr === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
            return d;
          };

          if (pmPr.scheduledAt) nextScheduledAt = advanceDate(pmPr.scheduledAt, interval);
          if (pmPr.dueDate) nextDueDate = advanceDate(pmPr.dueDate, interval);
          if (pmPr.rentStartDate) nextRentStart = advanceDate(pmPr.rentStartDate, interval);
          if (pmPr.rentEndDate) nextRentEnd = advanceDate(pmPr.rentEndDate, interval);

          await txClient.upward_pm_payment_request.create({
            data: {
              pmId: pmPr.pmId,
              unitId: pmPr.unitId,
              tenantId: pmPr.tenantId,
              paymentRequestId: null,
              amount: pmPr.amount,
              currency: pmPr.currency || 'NGN',
              description: pmPr.description,
              dueDate: nextDueDate || new Date(),
              rentStartDate: nextRentStart,
              rentEndDate: nextRentEnd,
              rentType: pmPr.rentType,
              reminderFrequency: pmPr.reminderFrequency,
              nextReminderAt: null,
              reminderCount: 0,
              status: 'SCHEDULED',
              amountPaid: 0,
              allowPartial: pmPr.allowPartial,
              minAmount: pmPr.minAmount,
              scheduledAt: nextScheduledAt,
              isRecurring: true,
              recurrenceInterval: interval
            }
          });
          
          this.logger.log(`Created recurring clone for request ${pmPr.uuid} scheduled for ${nextScheduledAt}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to sync PM payment status for core request ${paymentRequestId}:`, err)
    }
  }

  async executeForProperty(params: {
    userPropertyUuid: string
    rentPortion: number
    narration?: string
    txClient: any
  }) {
    const { userPropertyUuid, rentPortion, narration, txClient } = params
    try {
      const userProp = await txClient.upward_user_property.findUnique({
        where: { uuid: userPropertyUuid }
      })
      if (!userProp) return

      let unitId = userProp.pmUnitId
      if (!unitId) {
        const pmUnit = await txClient.upward_pm_unit.findFirst({
          where: { userPropertyUuid: userProp.uuid }
        })
        if (pmUnit) {
          unitId = pmUnit.id
        }
      }
      if (!unitId) return

      const unit = await txClient.upward_pm_unit.findUnique({ where: { id: unitId } })
      if (!unit) return

      let effectivePeriodStart = unit.rentStartDate ? new Date(unit.rentStartDate) : null
      let effectivePeriodEnd = unit.rentDueDate ? new Date(unit.rentDueDate) : null

      if (effectivePeriodStart && unit.rentAmount) {
        const existingPayments = await txClient.upward_pm_rent_payment.findMany({
          where: { unitId: unit.id, tenantId: unit.tenantId || undefined, status: 'SUCCESS' }
        })

        const currentPeriodKey = effectivePeriodStart.toISOString().split('T')[0]!
        const currentPeriodPaid = existingPayments
          .filter((p: any) => p.periodStart && new Date(p.periodStart).toISOString().split('T')[0] === currentPeriodKey)
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

        // If the current cycle is ALREADY fully paid off, this manual payment applies to the UPCOMING cycle
        if (currentPeriodPaid >= unit.rentAmount && effectivePeriodEnd) {
          const nextStart = new Date(effectivePeriodEnd)
          nextStart.setDate(nextStart.getDate() + 1)

          const nextEnd = new Date(nextStart)
          if (unit.rentType === 'Monthly') {
            nextEnd.setMonth(nextEnd.getMonth() + 1)
          } else {
            const years = (unit as any).leaseYears || 1
            nextEnd.setFullYear(nextEnd.getFullYear() + years)
          }
          nextEnd.setDate(nextEnd.getDate() - 1)

          effectivePeriodStart = nextStart
          effectivePeriodEnd = nextEnd
        } else if (!effectivePeriodEnd) {
          const endD = new Date(effectivePeriodStart)
          if (unit.rentType === 'Monthly') {
            endD.setMonth(endD.getMonth() + 1)
          } else {
            const years = (unit as any).leaseYears || 1
            endD.setFullYear(endD.getFullYear() + years)
          }
          endD.setDate(endD.getDate() - 1)
          effectivePeriodEnd = endD
        }
      }

      await txClient.upward_pm_rent_payment.create({
        data: {
          unitId: unit.id,
          tenantId: unit.tenantId,
          amount: rentPortion,
          rentAmountAtPayment: unit.rentAmount,
          paymentDate: new Date(),
          method: 'PAYSTACK',
          status: 'SUCCESS',
          notes: narration || 'Tenant Manual Payment',
          periodStart: effectivePeriodStart,
          periodEnd: effectivePeriodEnd,
        }
      })

      const tenantPayments = await txClient.upward_pm_rent_payment.findMany({
        where: { unitId: unit.id, tenantId: unit.tenantId || undefined, status: 'SUCCESS' }
      })

      const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number }>()
      for (const p of tenantPayments) {
        if (!p.periodStart) continue
        const key = new Date(p.periodStart).toISOString().split('T')[0]!
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            periodStart: new Date(p.periodStart),
            periodEnd: p.periodEnd ? new Date(p.periodEnd) : new Date(p.periodStart),
            total: 0
          })
        }
        periodMap.get(key)!.total += p.amount
      }

      const sortedPeriods = Array.from(periodMap.values()).sort(
        (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
      )

      const fullyPaidPeriods = sortedPeriods.filter(p => p.total >= (unit.rentAmount || 0))

      if (fullyPaidPeriods.length > 0) {
        const latestFullyPaid = fullyPaidPeriods[fullyPaidPeriods.length - 1]!

        await txClient.upward_pm_unit.update({
          where: { id: unit.id },
          data: {
            rentStartDate: latestFullyPaid.periodStart,
            rentDueDate: latestFullyPaid.periodEnd
          }
        })

        if (unit.isSynced && unit.userPropertyUuid) {
          await txClient.upward_user_property.updateMany({
            where: { uuid: unit.userPropertyUuid },
            data: {
              rentStartDate: latestFullyPaid.periodStart,
              rentEndDate: latestFullyPaid.periodEnd,
            }
          })
        }
      }
    } catch (err) {
      this.logger.error(`Failed to sync PM payment status for property ${userPropertyUuid}:`, err)
    }
  }
}
