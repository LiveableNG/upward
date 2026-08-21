import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../domains/companies/property.repository'
import {
  RENT_CYCLE_REPOSITORY,
  IRentCycleRepository,
} from '../../../domains/scoring/rent-cycle.repository'

@Injectable()
export class SettlePropertyBalanceUseCase {
  private readonly logger = new Logger(SettlePropertyBalanceUseCase.name)

  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(RENT_CYCLE_REPOSITORY)
    private readonly rentCycleRepo: IRentCycleRepository,
  ) {}

  async execute(params: {
    userId: number
    propertyId: number
    rentPortion: number
    paymentRequestId?: number
    dueDate?: Date
    rentEndDate?: Date
    rentType?: string
    currency?: string
    description?: string
    txClient: any
  }) {
    const { userId, propertyId, rentPortion, paymentRequestId, dueDate, rentEndDate, rentType, currency, description, txClient } = params

    const prop = await this.propertyRepo.findById(propertyId, txClient)
    if (!prop) return

    const totalRentPaidForProp = (prop.amountPaid || 0) + rentPortion
    const totalOwedForProp = prop.rentAmount || 0
    const newRemaining = Math.max(0, totalOwedForProp - totalRentPaidForProp)

    const updateData: any = {
      amountPaid: totalRentPaidForProp,
      amountRemaining: newRemaining,
    }
    if (rentType || prop.rentType) {
      updateData.rentType = rentType || prop.rentType
    }

    // Advance balance and status if fully paid
    if (rentPortion > 0 && newRemaining === 0 && totalRentPaidForProp >= totalOwedForProp && totalOwedForProp > 0) {
      const overpayment = totalRentPaidForProp - totalOwedForProp
      updateData.isPastTenancy = false
      const nextYearRent = prop.rentAmount || totalOwedForProp
      updateData.amountPaid = overpayment
      updateData.amountRemaining = Math.max(0, nextYearRent - overpayment)

      this.logger.log(`Property ${prop.uuid} fully settled. Updated remaining balance to ${updateData.amountRemaining}`)
    }

    await this.propertyRepo.update(prop.id!, updateData, txClient)

    if (rentPortion > 0 && prop.id && !prop.pmUnitId) {
      try {
        let effectivePeriodStart = prop.rentStartDate ? new Date(prop.rentStartDate) : new Date()
        let effectivePeriodEnd = prop.rentEndDate ? new Date(prop.rentEndDate) : null

        const effectiveRentType = rentType || prop.rentType || 'Annually'
        const leaseYears = (prop as any).leaseYears || 1
        const isFirstRent = (prop as any).isFirstRent ?? false

        const existingPayments = await txClient.upward_platform_rent_payment.findMany({
          where: { userPropertyId: prop.id, status: 'SUCCESS' }
        })

        if (effectivePeriodStart && prop.rentAmount > 0) {
          const currentPeriodKey = effectivePeriodStart.toISOString().split('T')[0]!
          const currentPeriodPaid = existingPayments
            .filter((p: any) => p.periodStart && new Date(p.periodStart).toISOString().split('T')[0] === currentPeriodKey)
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

          const isCurrentPeriodFull = currentPeriodPaid >= (prop.rentAmount - 1)

          if ((!isFirstRent && isCurrentPeriodFull) || (isFirstRent && isCurrentPeriodFull)) {
            if (effectivePeriodEnd) {
              const nextStart = new Date(effectivePeriodEnd)
              nextStart.setDate(nextStart.getDate() + 1)

              const nextEnd = new Date(nextStart)
              if (effectiveRentType === 'Monthly') {
                nextEnd.setMonth(nextEnd.getMonth() + 1)
              } else {
                nextEnd.setFullYear(nextEnd.getFullYear() + leaseYears)
              }
              nextEnd.setDate(nextEnd.getDate() - 1)

              effectivePeriodStart = nextStart
              effectivePeriodEnd = nextEnd
            }
          } else if (!effectivePeriodEnd) {
            const endD = new Date(effectivePeriodStart)
            if (effectiveRentType === 'Monthly') {
              endD.setMonth(endD.getMonth() + 1)
            } else {
              endD.setFullYear(endD.getFullYear() + leaseYears)
            }
            endD.setDate(endD.getDate() - 1)
            effectivePeriodEnd = endD
          }
        }

        await txClient.upward_platform_rent_payment.create({
          data: {
            userPropertyId: prop.id,
            amount: rentPortion,
            rentAmountAtPayment: prop.rentAmount,
            paymentDate: new Date(),
            method: 'PAYSTACK',
            status: 'SUCCESS',
            notes: description || `Rent Payment for property ${prop.uuid.slice(-8)}`,
            periodStart: effectivePeriodStart,
            periodEnd: effectivePeriodEnd,
          }
        })

        const allPayments = await txClient.upward_platform_rent_payment.findMany({
          where: { userPropertyId: prop.id, status: 'SUCCESS' }
        })

        const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number }>()
        for (const p of allPayments) {
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

        const fullyPaidPeriods = sortedPeriods.filter(p => p.total >= (prop.rentAmount || 0))

        if (fullyPaidPeriods.length > 0) {
          const latestFullyPaid = fullyPaidPeriods[fullyPaidPeriods.length - 1]!

          await this.propertyRepo.update(prop.id, {
            rentStartDate: latestFullyPaid.periodStart,
            rentEndDate: latestFullyPaid.periodEnd,
            isFirstRent: false,
          }, txClient)

          this.logger.log(`Synced platform property ${prop.id} dates to latest fully paid period: ${latestFullyPaid.periodStart.toISOString()} - ${latestFullyPaid.periodEnd.toISOString()}`)
        }
      } catch (err) {
        this.logger.error(`Failed to sync platform property rent period for property ${prop.id}:`, err)
      }
    }

    const cycleDueDate = dueDate ? new Date(dueDate) : (prop.rentEndDate ? new Date(prop.rentEndDate) : new Date())
    const paidAt = new Date()
    
    let currentTotalPaid = rentPortion
    let amountOwedForCycle = totalOwedForProp || rentPortion

    if (paymentRequestId) {
      const rentLineItems = await txClient.upward_payment_line_item.findMany({
        where: {
          paymentRequestId,
          name: { contains: 'rent', mode: 'insensitive' }
        }
      })
      if (rentLineItems.length > 0) {
        currentTotalPaid = rentLineItems.reduce((sum: number, item: any) => sum + item.amountPaid, 0)
        amountOwedForCycle = rentLineItems.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
      }
    }

    const cycleStatus = currentTotalPaid >= amountOwedForCycle
      ? (paidAt <= cycleDueDate ? 'PAID_ON_TIME' : 'PAID_LATE')
      : (paidAt <= cycleDueDate ? 'PARTIAL_ON_TIME' : 'PARTIAL_LATE')

    if (paymentRequestId) {
      await this.rentCycleRepo.upsertByPaymentRequestId(paymentRequestId, {
        userId: userId,
        userPropertyId: prop.id,
        amountOwed: amountOwedForCycle,
        amountPaid: currentTotalPaid,
        currency: currency || 'NGN',
        dueDate: cycleDueDate,
        paidAt: paidAt,
        status: cycleStatus,
        source: 'PAYMENT_REQUEST',
        description: description
      }, txClient)
    }
  }
}
