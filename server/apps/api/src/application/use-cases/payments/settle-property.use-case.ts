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
      amountRemaining: newRemaining
    }

    // Advance Core Due Date if fully paid
    if (rentPortion > 0 && newRemaining === 0 && totalRentPaidForProp >= totalOwedForProp && totalOwedForProp > 0) {
      const overpayment = totalRentPaidForProp - totalOwedForProp

      if (prop.rentEndDate) {
        const newDate = rentEndDate ? new Date(rentEndDate) : new Date(prop.rentEndDate)
        
        if (!rentEndDate) {
          if (prop.rentType === 'Monthly' || rentType === 'MONTHLY') {
            newDate.setMonth(newDate.getMonth() + 1)
          } else {
            newDate.setFullYear(newDate.getFullYear() + 1)
          }
        }
        updateData.rentEndDate = newDate
        updateData.isPastTenancy = false

        const nextYearRent = prop.rentAmount || totalOwedForProp
        updateData.amountPaid = overpayment
        updateData.amountRemaining = Math.max(0, nextYearRent - overpayment)

        this.logger.log(`Property ${prop.uuid} fully settled. Core rent due date moved to ${newDate.toISOString()}`)
      }
    }

    await this.propertyRepo.update(prop.id!, updateData, txClient)

    // Update Rent Cycle for Credit Scoring
    const cycleDueDate = dueDate ? new Date(dueDate) : (prop.rentEndDate ? new Date(prop.rentEndDate) : new Date())
    const paidAt = new Date()
    const amountOwedForCycle = totalOwedForProp || rentPortion

    const currentTotalPaid = rentPortion // Simplification: in the cycle we track per-request usually
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
