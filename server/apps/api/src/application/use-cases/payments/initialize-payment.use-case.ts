import { Inject, Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
  OVERPAYMENT_REPOSITORY,
  IOverpaymentRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { ResolveDedicatedAccountUseCase } from './resolve-dedicated-account.use-case'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class InitializePaymentUseCase {
  private readonly logger = new Logger(InitializePaymentUseCase.name)

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(OVERPAYMENT_REPOSITORY)
    private readonly overpaymentRepo: IOverpaymentRepository,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly prisma: PrismaService,
  ) { }

  async execute(data: {
    userId?: string
    amount: number
    paymentRequestUuid?: string
    metadata?: any
  }) {
    let pr: any = null
    if (data.paymentRequestUuid) {
      pr = await this.paymentRequestRepo.findByUuid(data.paymentRequestUuid)
    }

    let user: any = null
    if (data.userId) {
      user = await this.userRepository.findByUuid(data.userId)
    }
    if (!user && pr) {
      user = await this.userRepository.findById(pr.userId)
    }

    if (!user) throw new UnauthorizedException('User context required to initialize payment')

    if (pr) {
      const remainingRent = pr.amount - (pr.amountPaid || 0)

      if (!pr.allowPartial && data.amount < remainingRent && data.amount > 0) {
        throw new BadRequestException(`Partial payments are not enabled for this request. Please pay the full balance of ₦${remainingRent}.`)
      }
      if (pr.allowPartial && pr.minAmount && data.amount < pr.minAmount && data.amount > 0 && data.amount < remainingRent) {
        throw new BadRequestException(`The minimum allowed partial payment for this request is ₦${pr.minAmount}.`)
      }
    }

    let flatFee = this.paymentConfig.getProcessingFee()
    let userPropertyId = pr?.userPropertyId

    if (pr && !userPropertyId) {
      this.logger.log(`Attempting to recover userPropertyId for PR ${pr.uuid} from PM context`)
      const pmPR = await this.prisma.upward_pm_payment_request.findFirst({
        where: { paymentRequestId: pr.id },
        include: { unit: true }
      })

      if (pmPR?.unit?.userPropertyUuid) {
        const userProp = await this.prisma.upward_user_property.findUnique({
          where: { uuid: pmPR.unit.userPropertyUuid }
        })
        if (userProp) {
          userPropertyId = userProp.id
          this.logger.log(`Recovered userPropertyId ${userPropertyId} for PR ${pr.uuid}. Updating record.`)
          await this.paymentRequestRepo.update(pr.id, { userPropertyId })
        }
      }

      // Fallback: If still not resolved, lookup the user's active verified property!
      if (!userPropertyId) {
        const activeProp = await this.prisma.upward_user_property.findFirst({
          where: { userId: user.id, isVerified: true, isPastTenancy: false },
          orderBy: { createdAt: 'desc' }
        })
        if (activeProp) {
          userPropertyId = activeProp.id
          this.logger.log(`Recovered userPropertyId ${userPropertyId} from user's active verified tenancy for PR ${pr.uuid}. Updating record.`)
          await this.paymentRequestRepo.update(pr.id, { userPropertyId })
        }
      }
    }

    const rates = await this.paymentConfig.getDynamicProcessingRates(user.id, userPropertyId, pr?.id)
    const excludeBenefits = data.metadata?.excludeBenefits === true
    const isBenefitsOnly =
      data.metadata?.paymentKind === 'BENEFITS_SUBSCRIPTION' ||
      data.metadata?.type === 'BENEFITS_SUBSCRIPTION'
    const activeBenefitsFee = (rates.benefitsPaid || excludeBenefits) ? 0 : rates.benefitsFee
    flatFee = isBenefitsOnly ? 0 : rates.transactionFee + activeBenefitsFee
    const forcePaystack = isBenefitsOnly || data.metadata?.forcePaystack === true

    if (userPropertyId && !forcePaystack) {
      const rawPhone = user.phone || ''
      const hasPhone = rawPhone && rawPhone.trim() && rawPhone.toLowerCase() !== 'null' && rawPhone.toLowerCase() !== 'undefined'
      const tenantPhone = hasPhone ? rawPhone : `080${String(user.id || Math.floor(Math.random() * 100000000)).padStart(8, '0')}`

      if (!hasPhone) {
        this.logger.log(`User ${user.email} does not have a valid phone number on profile. Using generated mock phone number: ${tenantPhone}`)
      }

      const availableOverpayments = await this.overpaymentRepo.findByUserIdAndStatus(user.id!, 'AVAILABLE')
      const totalCredit = availableOverpayments.reduce((sum, o) => sum + o.amount, 0)
      const appliedDeposit = Number(data.metadata?.appliedDepositAmount || 0)

      const baseAmount = data.amount || pr.amount

      let clientFee = 0
      if (data.metadata?.lineItems) {
        const feeItems = data.metadata.lineItems.filter((i: any) =>
          ['Upward Benefits'].includes(i.label || i.name || '')
        )
        if (feeItems.length > 0) {
          clientFee = feeItems.reduce((sum: number, fi: any) => sum + Number(fi.amount || fi.amountPaid || 0), 0)
        }
      } else if (data.metadata?.fee) {
        clientFee = Number(data.metadata.fee)
      }

      const effectiveFee = clientFee || (data.amount ? 0 : flatFee)
      const requestedTotal = baseAmount + (data.amount ? 0 : (clientFee || flatFee))

      const creditToUse = appliedDeposit > 0 ? appliedDeposit : totalCredit
      const appliedCredit = Math.min(creditToUse, requestedTotal)
      const finalAmountToPay = requestedTotal - appliedCredit

      try {
        const dva = await this.resolveDedicatedAccount.execute({
          userPropertyId: userPropertyId,
          tenantEmail: user.email!,
          tenantName: `${user.firstName || 'Tenant'} ${user.lastName || 'User'}`.trim(),
          tenantPhone: tenantPhone,
          subaccountCode: pr.subaccount?.subaccountCode
        })

        if (data.metadata?.lineItems) {
          await this.prisma.upward_dedicated_virtual_account.update({
            where: { accountNumber: dva.accountNumber },
            data: {
              metadata: {
                ...(typeof dva.metadata === 'object' && dva.metadata !== null ? dva.metadata : {}),
                lastPaymentIntent: {
                  amount: requestedTotal,
                  lineItems: data.metadata.lineItems,
                  excludeBenefits: data.metadata?.excludeBenefits === true,
                  timestamp: Date.now()
                }
              }
            }
          })
        }

        this.logger.log(`DVA Initialization for PR ${pr?.uuid || 'manual'}: Amount ${requestedTotal}, Fee ${effectiveFee}, LineItems: ${JSON.stringify(data.metadata?.lineItems || [])}`)

        return {
          type: 'DVA',
          amount: requestedTotal,
          appliedCredit,
          finalAmount: finalAmountToPay,
          fee: effectiveFee || flatFee,
          dva: {
            accountNumber: dva.accountNumber,
            accountName: dva.accountName,
            bankName: dva.bankName,
            bankCode: dva.bankCode
          },
          reference: `DVA_${dva.accountNumber}_${pr?.uuid || 'no-pr'}_${Date.now()}`
        }
      } catch (dvaError: any) {
        this.logger.warn(`DVA generation failed for property ${userPropertyId}: ${dvaError.message || dvaError}. Falling back to standard Paystack checkout.`)
      }
    }

    // Standard Payment or DVA Fallback
    const availableOverpayments = await this.overpaymentRepo.findByUserIdAndStatus(user.id!, 'AVAILABLE')
    const totalCredit = availableOverpayments.reduce((sum, o) => sum + o.amount, 0)

    const baseAmount = data.amount || pr?.amount || 0
    const requestedTotal = baseAmount + flatFee

    const appliedCredit = Math.min(totalCredit, requestedTotal)
    const finalAmountToPay = requestedTotal - appliedCredit

    if (finalAmountToPay <= 0) {
      return {
        type: 'CREDIT_ONLY',
        amount: requestedTotal,
        appliedCredit,
        finalAmount: 0,
        reference: `CREDIT-${user.id}-${Date.now()}`
      }
    }

    const metadata = {
      ...data.metadata,
      source_app: 'upward',
      userId: user.id,
      userUuid: user.uuid,
      paymentRequestUuid: pr?.uuid,
      paymentRequestId: pr?.id,
      userPropertyUuid: pr?.userPropertyUuid,
      appliedCredit,
      description: data.metadata?.description || pr?.description || 'Property Payment'
    }
    this.logger.log(`Paystack Initialization for PR ${pr?.uuid || 'manual'}: Amount ${finalAmountToPay}, LineItems: ${JSON.stringify(metadata.lineItems || [])}`)

    const initialization = await this.gateway.initializeTransaction({
      email: user.email!,
      amount: finalAmountToPay,
      reference: `PAY-${randomUUID()}`,
      subaccount: pr?.subaccount?.subaccountCode,
      metadata,
      channels: ['bank', 'bank_transfer']
    })

    return {
      type: 'PAYSTACK',
      ...initialization,
      appliedCredit,
      finalAmount: finalAmountToPay,
      fee: flatFee
    }
  }
}
