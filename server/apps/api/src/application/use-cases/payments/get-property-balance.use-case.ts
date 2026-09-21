import { Inject, Injectable } from '@nestjs/common'
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../domains/companies/property.repository'
import {
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
} from '../../../domains/payments/payment.repository'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'

@Injectable()
export class GetPropertyBalanceUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    private readonly paymentConfig: PaymentConfigurationService,
  ) { }

  async execute(propertyUuid: string) {
    const prop = await this.propertyRepo.findByUuid(propertyUuid)
    if (!prop) throw new Error('Property not found')

    const allPending = await this.paymentRequestRepo.findByUserIdAndStatus(prop.userId, 'PENDING')
    const allPartial = await this.paymentRequestRepo.findByUserIdAndStatus(prop.userId, 'PARTIAL')

    const propRequests = [...allPending, ...allPartial].filter((p: any) => p.userPropertyId === prop.id)
    const requestTotal = propRequests.reduce((sum: number, pr: any) => sum + pr.amount, 0)

    const totalOwed = prop.rentAmount || requestTotal || 0
    const amountPaid = prop.amountPaid || 0
    const calculatedRemaining = Math.max(0, totalOwed - amountPaid)
    const remainingBalance = (prop.amountRemaining === 0 || prop.amountRemaining > totalOwed)
      ? calculatedRemaining
      : (prop.amountRemaining ?? calculatedRemaining)

    const sortedRequests = [...propRequests].sort(
      (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )
    const allowPartial = sortedRequests[0]?.allowPartial ?? false

    const rates = await this.paymentConfig.getDynamicProcessingRates(prop.userId, prop.id)
    const activeBenefitsFee = rates.benefitsPaid ? 0 : rates.benefitsFee
    const processingFee = rates.transactionFee + activeBenefitsFee

    return {
      propertyUuid: prop.uuid,
      address: [prop.location?.address, prop.location?.area, prop.location?.state, prop.location?.country].filter(Boolean).join(', '),
      rentAmount: totalOwed,
      totalOwed: totalOwed,
      amountPaid: amountPaid,
      remainingBalance: remainingBalance,
      currency: prop.currency || 'NGN',
      dueDate: prop.rentEndDate,
      hasActiveRequest: propRequests.length > 0,
      allowPartial,
      processingFee,
      processingRates: {
        transactionFee: rates.transactionFee,
        benefitsFee: rates.benefitsFee,
        rentValue: rates.rentValue,
        benefitsPaid: rates.benefitsPaid || false,
        benefitsPaidForRequest: rates.benefitsPaidForRequest || false,
      },
    }
  }
}
