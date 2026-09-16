import { Injectable, Logger } from '@nestjs/common'
import { CreditRentDepositUseCase } from './credit-rent-deposit.use-case'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class HandlePaymentOverpaymentUseCase {
  private readonly logger = new Logger(HandlePaymentOverpaymentUseCase.name)

  constructor(
    private readonly creditRentDeposit: CreditRentDepositUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(params: {
    userId: number
    userPropertyId?: number
    excess: number
    reference: string
    currency: string
    paymentRequestId?: number
    propertyAddress?: string
    futureCreditName?: string
    parentTransactionId?: number
    txClient?: any
  }) {
    const {
      userId,
      userPropertyId,
      excess,
      reference,
      currency,
      paymentRequestId,
      futureCreditName,
      txClient,
    } = params

    if (excess <= 0) return

    const client = txClient || this.prisma
    let resolvedUserPropertyId = userPropertyId

    if (!resolvedUserPropertyId && paymentRequestId) {
      const pr = await client.upward_payment_request.findUnique({
        where: { id: paymentRequestId },
        select: { userPropertyId: true },
      })
      resolvedUserPropertyId = pr?.userPropertyId ?? undefined
    }

    if (!resolvedUserPropertyId && userId) {
      const prop = await client.upward_user_property.findFirst({
        where: { userId },
        orderBy: { id: 'desc' },
        select: { id: true },
      })
      resolvedUserPropertyId = prop?.id
    }

    if (!resolvedUserPropertyId) {
      this.logger.warn(
        `Unable to resolve userPropertyId for overpayment excess of ${excess} ${currency} (User: ${userId}, Ref: ${reference})`,
      )
      return
    }

    return this.creditRentDeposit.execute({
      userId,
      userPropertyId: resolvedUserPropertyId,
      amount: excess,
      reference: `EXCESS_${reference}`,
      currency,
      source: 'OVERPAYMENT_EXCESS',
      paymentRequestId,
      narration: futureCreditName || 'Invoice Settlement Excess',
      txClient,
    })
  }
}

