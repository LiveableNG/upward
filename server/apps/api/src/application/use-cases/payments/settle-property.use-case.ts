import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../domains/companies/property.repository'
import {
  RENT_CYCLE_REPOSITORY,
  IRentCycleRepository,
} from '../../../domains/scoring/rent-cycle.repository'
import { RentalPeriodService, ProcessRentPaymentResult } from '../../services/rental-period.service'

@Injectable()
export class SettlePropertyBalanceUseCase {
  private readonly logger = new Logger(SettlePropertyBalanceUseCase.name)

  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(RENT_CYCLE_REPOSITORY)
    private readonly rentCycleRepo: IRentCycleRepository,
    private readonly rentalPeriodService: RentalPeriodService,
  ) { }

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
  }): Promise<ProcessRentPaymentResult | null> {
    const {
      userId,
      propertyId,
      rentPortion,
      paymentRequestId,
      dueDate,
      currency,
      description,
      txClient,
    } = params

    const prop = await this.propertyRepo.findById(propertyId, txClient)
    if (!prop) return null

    let paymentResult: ProcessRentPaymentResult | null = null

    if (rentPortion > 0) {
      paymentResult = await this.rentalPeriodService.processRentPayment({
        userId,
        propertyId,
        rentPortion,
        paymentRequestId,
        dueDate,
        rentEndDate: params.rentEndDate,
        rentType: params.rentType,
        currency,
        description,
        txClient,
      })
    }

    const effectiveDueDate = dueDate
      ? (this.rentalPeriodService.parseCalendarDate(dueDate) || new Date(dueDate))
      : (paymentResult?.periodEnd || (prop.rentEndDate ? (this.rentalPeriodService.parseCalendarDate(prop.rentEndDate) || new Date(prop.rentEndDate)) : new Date()))
    const paidAt = new Date()

    let currentTotalPaid = rentPortion
    let amountOwedForCycle = prop.rentAmount || rentPortion

    if (paymentRequestId) {
      const rentLineItems = await txClient.upward_payment_line_item.findMany({
        where: {
          paymentRequestId,
          name: { contains: 'rent', mode: 'insensitive' },
        },
      })
      if (rentLineItems.length > 0) {
        currentTotalPaid = rentLineItems.reduce((sum: number, item: any) => sum + item.amountPaid, 0)
        amountOwedForCycle = rentLineItems.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
      }
    }

    let isInheritedLate = false
    if (paymentRequestId) {
      const pr = await txClient.upward_payment_request.findUnique({
        where: { id: paymentRequestId },
        select: { inheritedTimeliness: true }
      })
      if (pr?.inheritedTimeliness === 'LATE') {
        isInheritedLate = true
      }
    }

    const cycleStatus = currentTotalPaid >= amountOwedForCycle
      ? (isInheritedLate ? 'PAID_LATE' : (paidAt <= effectiveDueDate ? 'PAID_ON_TIME' : 'PAID_LATE'))
      : (isInheritedLate ? 'PARTIAL_LATE' : (paidAt <= effectiveDueDate ? 'PARTIAL_ON_TIME' : 'PARTIAL_LATE'))

    if (paymentRequestId) {
      await this.rentCycleRepo.upsertByPaymentRequestId(paymentRequestId, {
        userId,
        userPropertyId: prop.id,
        amountOwed: amountOwedForCycle,
        amountPaid: currentTotalPaid,
        currency: currency || 'NGN',
        dueDate: effectiveDueDate,
        paidAt,
        status: cycleStatus,
        source: 'PAYMENT_REQUEST',
        description,
      }, txClient)
    }

    return paymentResult
  }
}
