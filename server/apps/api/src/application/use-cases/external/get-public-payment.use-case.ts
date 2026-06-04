import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common'
import { 
  PAYMENT_REQUEST_REPOSITORY, 
  IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentLineItemRepository,
} from '../../../domains/payments/payment.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { USER_REPOSITORY, UserRepository, PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'
import { COMPANY_REPOSITORY, CompanyRepository, MANAGER_REPOSITORY, ManagerRepository } from '../../../domains/companies/company.repository'
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'
import { VERIFICATION_TOKEN_REPOSITORY, VerificationTokenRepository } from '../../../domains/auth/verification-token.repository'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'
import { randomUUID } from 'node:crypto'

@Injectable()
export class GetPublicPaymentDetailsUseCase {
  private readonly logger = new Logger(GetPublicPaymentDetailsUseCase.name)

  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY) private readonly lineItemRepository: IPaymentLineItemRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    @Inject(MANAGER_REPOSITORY) private readonly managerRepository: ManagerRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly paymentConfig: PaymentConfigurationService,
  ) {}

  async execute(uuid: string): Promise<any> {
    const paymentRequest = await this.paymentRequestRepository.findByUuid(uuid)
    if (!paymentRequest) {
      throw new NotFoundException(`Payment request with UUID ${uuid} not found`)
    }

    const property = await this.propertyRepository.findById(paymentRequest.userPropertyId!)
    if (!property) {
      throw new NotFoundException('Associated property not found')
    }

    const user = await this.userRepository.findById(paymentRequest.userId)
    if (!user) {
      throw new NotFoundException('Associated user not found')
    }

    const paidRequests = await this.paymentRequestRepository.findByUserIdAndStatus(user.id!, 'PAID')
    const paidRequestsCount = paidRequests.filter(pr => pr.id !== paymentRequest.id).length

    let company = null
    if (property.companyId) {
      company = await this.companyRepository.findById(property.companyId)
    }

    let manager = null
    if (property.managerId) {
      manager = await this.managerRepository.findById(property.managerId)
    }

    // Fetch structured line item records from DB
    const lineItemRecords = await this.lineItemRepository.findByPaymentRequestId(paymentRequest.id!)

    const subaccountCode = paymentRequest.subaccount?.subaccountCode || null

    // Company name: prefer company, fallback to manager full name
    const companyName = company?.name || 
                        (manager ? `${manager.firstName} ${manager.lastName}` : null)

    // Property location address: compose from location data
    const location = (property as any).location
    const locationAddress = location
      ? [location.address, location.area, location.state, location.country]
          .filter(Boolean).join(', ')
      : null

    let verifiedRecipientName = null
    if (paymentRequest.subaccount?.accountNumber && paymentRequest.subaccount?.bankCode) {
      try {
        const verification = await this.gateway.verifyAccountNumber(
          paymentRequest.subaccount.accountNumber,
          paymentRequest.subaccount.bankCode,
        )
        verifiedRecipientName = verification.accountName
      } catch (err: any) {
        // Fallback to company/manager name if verification fails
        this.logger.warn(`Account verification failed for PR ${paymentRequest.uuid}: ${err?.message || 'Unknown error'}`)
      }
    }

    let inviteToken = null
    const isShadow = user.passwordHash === PASS_PLACEHOLDERS.INVITED || 
                     user.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
                     !!(user.passwordHash && !user.passwordHash.startsWith('$2'));
    
    if (isShadow) {
      const validToken = await this.tokenRepository.findByIdentifier(user.uuid, 'INVITE')
      if (validToken && validToken.expiresAt > new Date()) {
        inviteToken = validToken.token
      } else {
        inviteToken = randomUUID()
        await this.tokenRepository.create({
          token: inviteToken,
          context: 'INVITE',
          identifier: user.uuid,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        })
      }
    }

    const dynamicRates = await this.paymentConfig.getDynamicProcessingRates(user.id!, paymentRequest.userPropertyId, paymentRequest.id)
    const dynamicFee = dynamicRates.transactionFee + (dynamicRates.benefitsPaid ? 0 : dynamicRates.benefitsFee)

    return {
      payment: {
        uuid: paymentRequest.uuid,
        amount: paymentRequest.amount,
        amountPaid: paymentRequest.amountPaid || 0,
        currency: paymentRequest.currency,
        description: paymentRequest.description,
        dueDate: paymentRequest.dueDate,
        status: paymentRequest.status,
        subaccountCode: subaccountCode,
        allowPartial: paymentRequest.allowPartial || false,
        minAmount: paymentRequest.minAmount || undefined,
        maxPartialAmount: paymentRequest.minAmount ? Math.max(0, (paymentRequest.amount - (paymentRequest.amountPaid || 0)) - paymentRequest.minAmount) : (paymentRequest.amount - (paymentRequest.amountPaid || 0)),
        remainingBalance: paymentRequest.amount - (paymentRequest.amountPaid || 0),
        lineItemRecords: lineItemRecords,
        verifiedRecipientName: verifiedRecipientName,
        processingFee: dynamicFee,
        processingRates: {
          transactionFee: dynamicRates.transactionFee,
          benefitsFee: dynamicRates.benefitsFee,
          rentValue: dynamicRates.rentValue,
          benefitsPaid: (dynamicRates as any).benefitsPaid || false,
          benefitsPaidForRequest: (dynamicRates as any).benefitsPaidForRequest || false
        },
      },
      user: {
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        paidRequestsCount: paidRequestsCount,
        verificationOn: process.env.VERIFICATION_ON !== 'false',
      },
      property: {
        uuid: property.uuid,
        rentAmount: property.rentAmount,
        amountPaid: property.amountPaid,
        amountRemaining: property.amountRemaining,
        rentEndDate: property.rentEndDate,
        isPastTenancy: property.isPastTenancy,
        locationAddress: locationAddress,
      },
      company: {
        name: companyName,
      },
      manager: manager ? {
        firstName: manager.firstName,
        lastName: manager.lastName,
      } : null,
      hasPassword: !!user.passwordHash && user.passwordHash.startsWith('$2'),
      inviteToken: inviteToken,
    }
  }
}
