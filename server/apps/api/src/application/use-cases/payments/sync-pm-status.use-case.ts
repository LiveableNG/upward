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
import { RentalPeriodService } from '../../services/rental-period.service'

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
    private readonly rentalPeriodService: RentalPeriodService,
  ) {}

  async execute(params: {
    paymentRequestId: number
    rentPortion: number
    periodStart?: Date
    periodEnd?: Date
    txClient: any
  }) {
    const { paymentRequestId, rentPortion, periodStart, periodEnd, txClient } = params

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
          amountPaid: pr.amountPaid,
          status: pr.status,
        }
      })

      if (rentPortion > 0) {
        const unit = await txClient.upward_pm_unit.findUnique({ where: { id: unitId } })
        
        let effectivePeriodStart: Date | null = periodStart || this.rentalPeriodService.parseCalendarDate(pr.rentStartDate)
        let effectivePeriodEnd: Date | null = periodEnd || this.rentalPeriodService.parseCalendarDate(pr.rentEndDate)

        if (!effectivePeriodStart || !effectivePeriodEnd) {
          const resolved = this.rentalPeriodService.resolveTargetRentalPeriod(
            {
              rentStartDate: unit?.rentStartDate,
              rentEndDate: unit?.rentDueDate,
              rentType: unit?.rentType,
              leaseYears: (unit as any)?.leaseYears,
            },
            {
              rentStartDate: pr.rentStartDate,
              rentEndDate: pr.rentEndDate,
            }
          )
          effectivePeriodStart = resolved.periodStart
          effectivePeriodEnd = resolved.periodEnd
        }

        // Update the core PR and PM PR records to match the resolved canonical period
        if (effectivePeriodStart && effectivePeriodEnd) {
          await txClient.upward_payment_request.update({
            where: { id: paymentRequestId },
            data: {
              rentStartDate: effectivePeriodStart,
              rentEndDate: effectivePeriodEnd,
              dueDate: effectivePeriodEnd,
            }
          })

          await txClient.upward_pm_payment_request.updateMany({
            where: { paymentRequestId },
            data: {
              rentStartDate: effectivePeriodStart,
              rentEndDate: effectivePeriodEnd,
              dueDate: effectivePeriodEnd,
            }
          })
        }

        // Record in PM Rent History with exact period
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

        // Synchronize PM unit and linked User Property state
        await this.rentalPeriodService.syncUnitPropertyState(unitId, txClient)

        if (pmPr && pmPr.isRecurring && pmPr.recurrenceInterval) {
          const interval = pmPr.recurrenceInterval;
          
          let nextScheduledAt: Date | null = null;
          let nextDueDate: Date | null = null;
          let nextRentStart: Date | null = null;
          let nextRentEnd: Date | null = null;

          const advanceDate = (date: Date, intervalStr: string): Date => {
            const d = new Date(date);
            if (intervalStr === 'MONTHLY') d.setUTCMonth(d.getUTCMonth() + 1);
            else if (intervalStr === 'QUARTERLY') d.setUTCMonth(d.getUTCMonth() + 3);
            else if (intervalStr === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + 1);
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
    periodStart?: Date
    periodEnd?: Date
    txClient: any
  }) {
    const { userPropertyUuid, rentPortion, narration, periodStart, periodEnd, txClient } = params
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

      let effectivePeriodStart: Date | null = periodStart || this.rentalPeriodService.parseCalendarDate(userProp.rentStartDate)
      let effectivePeriodEnd: Date | null = periodEnd || this.rentalPeriodService.parseCalendarDate(userProp.rentEndDate)

      if (!effectivePeriodStart || !effectivePeriodEnd) {
        const resolved = this.rentalPeriodService.resolveTargetRentalPeriod({
          rentStartDate: unit.rentStartDate,
          rentEndDate: unit.rentDueDate,
          rentType: unit.rentType,
          leaseYears: (unit as any)?.leaseYears,
          amountRemaining: userProp.amountRemaining,
          isFirstRent: userProp.isFirstRent,
        })
        effectivePeriodStart = resolved.periodStart
        effectivePeriodEnd = resolved.periodEnd
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

      // Synchronize PM unit and linked User Property state
      await this.rentalPeriodService.syncUnitPropertyState(unit.id, txClient)
    } catch (err) {
      this.logger.error(`Failed to sync PM payment status for property ${userPropertyUuid}:`, err)
    }
  }
}
