import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository, PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RecordTransactionUseCase } from '../payments/payment.use-cases'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ConfirmExternalPaymentUseCase {
  private readonly logger = new Logger(ConfirmExternalPaymentUseCase.name)

  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly recordTransactionUseCase: RecordTransactionUseCase,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(paymentUuid: string, reference: string, lineItemPayments?: any[]): Promise<any> {
    const paymentRequest = await this.paymentRequestRepository.findByUuid(paymentUuid)
    if (!paymentRequest) {
      throw new NotFoundException(`Payment request with UUID ${paymentUuid} not found`)
    }

    if (paymentRequest.status === 'PAID') {
      return { success: true, message: 'Payment already confirmed as PAID' }
    }

    const user = await this.userRepository.findById(paymentRequest.userId)
    if (!user) {
      throw new NotFoundException('User associated with payment request not found')
    }

    let actualAmount = paymentRequest.amount // fallback
    try {
      const verified = await this.paymentGateway.verifyTransaction(reference)
      if (verified.status && verified.amount !== undefined) {
        actualAmount = verified.amount
        this.logger.log(`Paystack verification for ${reference}: actual amount = ${actualAmount} (PR amount = ${paymentRequest.amount})`)
      } else {
        this.logger.warn(`Paystack verification returned non-success for ${reference}. Falling back to sum of line item payments.`)
        // If gateway fails, derive amount from the manual line items provided by the frontend
        if (lineItemPayments && lineItemPayments.length > 0) {
          actualAmount = lineItemPayments.reduce((sum, lp) => sum + Number(lp.amountPaid || lp.amount || 0), 0)
          this.logger.log(`Derived amount from lineItemPayments: ${actualAmount}`)
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not verify transaction ${reference} with gateway: ${err?.message}. Falling back to lineItemPayments sum.`)
      if (lineItemPayments && lineItemPayments.length > 0) {
        actualAmount = lineItemPayments.reduce((sum, lp) => sum + Number(lp.amountPaid || lp.amount || 0), 0)
      }
    }

    const transaction = await this.recordTransactionUseCase.execute({
      userId: user.uuid,
      amount: actualAmount,
      currency: paymentRequest.currency,
      narration: paymentRequest.description || 'External Payment',
      reference: reference,
      status: 'PENDING',
      type: 'RENT',
      paymentRequestId: paymentRequest.id!,
      userPropertyUuid: paymentRequest.userPropertyUuid,
      lineItemPayments,
      landlordId: paymentRequest.subaccount?.uuid,
    })

    if (!transaction) {
      throw new BadRequestException('Transaction could not be recorded')
    }

    if (transaction.status === 'SUCCESS') {
      const updatedPR = await this.paymentRequestRepository.findById(paymentRequest.id!)
      
      const dynamicFee = await this.paymentConfig.getDynamicProcessingFee(paymentRequest.userId, paymentRequest.userPropertyUuid ? (await this.prisma.upward_user_property.findUnique({ where: { uuid: paymentRequest.userPropertyUuid } }))?.id : undefined, paymentRequest.id)
      const expectedTotal = paymentRequest.amount + dynamicFee
      const isUnderpayment = !paymentRequest.allowPartial && actualAmount < expectedTotal

      return {
        success: true,
        transactionUuid: transaction.uuid,
        status: updatedPR?.status || 'PAID',
        settlementStatus: transaction.settlementStatus,
        isUnderpayment
      }
    } else {
      throw new BadRequestException('Payment verification failed or returned non-success status')
    }
  }
}
