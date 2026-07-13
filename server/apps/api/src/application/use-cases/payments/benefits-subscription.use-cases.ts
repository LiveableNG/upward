import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  BENEFITS_SUBSCRIPTION_REPOSITORY,
  IBenefitsSubscriptionRepository,
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from '../../../domains/payments/payment.repository'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetBenefitsStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(BENEFITS_SUBSCRIPTION_REPOSITORY)
    private readonly benefitsRepo: IBenefitsSubscriptionRepository,
    private readonly paymentConfig: PaymentConfigurationService,
  ) {}

  async execute(userUuid: string) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')

    const rates = await this.paymentConfig.getDynamicProcessingRates(user.id!)
    const subscription = await this.benefitsRepo.findActiveByUser(user.id!)
    const isActive = !!subscription && subscription.endsAt > new Date()
    const catalogFee = this.paymentConfig.calculateRatesForRent(rates.rentValue || 0).benefitsFee
    const benefitsFee = isActive ? 0 : (rates.benefitsFee > 0 ? rates.benefitsFee : catalogFee)

    return {
      isActive,
      benefitsFee,
      rentValue: rates.rentValue,
      currency: 'NGN',
      startsAt: subscription?.startsAt || null,
      endsAt: subscription?.endsAt || null,
      source: subscription?.source || null,
      packageName: 'Tenant Protection Package',
      benefits: [
        'Rent protection and eviction support',
        'Instant digital rent receipts',
        'Credit score building',
        'Priority support',
      ],
    }
  }
}

@Injectable()
export class InitializeBenefitsPaymentUseCase {
  private readonly logger = new Logger(InitializeBenefitsPaymentUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(BENEFITS_SUBSCRIPTION_REPOSITORY)
    private readonly benefitsRepo: IBenefitsSubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(data: { userUuid: string }) {
    const user = await this.userRepository.findByUuid(data.userUuid)
    if (!user) throw new UnauthorizedException('User not found')
    if (!user.email) throw new BadRequestException('User email is required to initialize payment')

    const existing = await this.benefitsRepo.findActiveByUser(user.id!)
    if (existing && existing.endsAt > new Date()) {
      throw new BadRequestException(
        `Upward Benefits is already active until ${existing.endsAt.toISOString().slice(0, 10)}`,
      )
    }

    const rates = await this.paymentConfig.getDynamicProcessingRates(user.id!)
    const catalogFee = this.paymentConfig.calculateRatesForRent(rates.rentValue || 0).benefitsFee
    const amount = rates.benefitsFee > 0 ? rates.benefitsFee : catalogFee
    if (!amount || amount <= 0) {
      throw new BadRequestException('Benefits fee is not available for this account')
    }
    const activeProperty = await this.prisma.upward_user_property.findFirst({
      where: { userId: user.id!, isPastTenancy: false },
      orderBy: { createdAt: 'desc' },
    })

    const lineItems = [
      {
        id: -3,
        name: 'Upward Benefits',
        label: 'Upward Benefits',
        amount,
        amountPaid: amount,
        category: 'Fee',
      },
    ]

    const metadata = {
      source_app: 'upward',
      type: 'BENEFITS_SUBSCRIPTION',
      paymentKind: 'BENEFITS_SUBSCRIPTION',
      userId: user.id,
      userUuid: user.uuid,
      userPropertyUuid: activeProperty?.uuid,
      userPropertyId: activeProperty?.id,
      excludeBenefits: false,
      description: 'Upward Benefits — Tenant Protection Package (annual)',
      lineItems,
    }

    this.logger.log(
      `Initializing standalone benefits Paystack payment for user ${user.uuid}: ₦${amount}`,
    )

    const initialization = await this.gateway.initializeTransaction({
      email: user.email,
      amount: Math.round(amount * 100),
      reference: `BEN-${randomUUID()}`,
      metadata,
      channels: ['card', 'bank', 'bank_transfer'],
    })

    return {
      type: 'PAYSTACK',
      ...initialization,
      amount,
      fee: 0,
      benefitsFee: amount,
    }
  }
}

@Injectable()
export class ActivateBenefitsSubscriptionUseCase {
  private readonly logger = new Logger(ActivateBenefitsSubscriptionUseCase.name)

  constructor(
    @Inject(BENEFITS_SUBSCRIPTION_REPOSITORY)
    private readonly benefitsRepo: IBenefitsSubscriptionRepository,
  ) {}

  async execute(params: {
    userId: number
    userPropertyId?: number | null
    transactionId: number
    amountPaid: number
    currency?: string
    source: 'RENT_CHECKOUT' | 'STANDALONE'
    txClient?: any
  }) {
    const {
      userId,
      userPropertyId,
      transactionId,
      amountPaid,
      currency = 'NGN',
      source,
      txClient,
    } = params

    if (!amountPaid || amountPaid <= 0) return null

    const now = new Date()
    const existing = await this.benefitsRepo.findActiveByUser(userId, txClient)

    if (existing && existing.endsAt > now) {
      const base = existing.endsAt > now ? existing.endsAt : now
      const endsAt = new Date(base)
      endsAt.setFullYear(endsAt.getFullYear() + 1)

      this.logger.log(
        `Extending benefits subscription ${existing.uuid} for user ${userId} until ${endsAt.toISOString()}`,
      )

      return this.benefitsRepo.update(
        existing.id,
        {
          endsAt,
          amountPaid: existing.amountPaid + amountPaid,
          sourceTransactionId: transactionId,
          source,
          userPropertyId: userPropertyId ?? existing.userPropertyId,
        },
        txClient,
      )
    }

    const endsAt = new Date(now)
    endsAt.setFullYear(endsAt.getFullYear() + 1)

    this.logger.log(
      `Activating benefits subscription for user ${userId} until ${endsAt.toISOString()} (source=${source})`,
    )

    return this.benefitsRepo.create(
      {
        userId,
        userPropertyId: userPropertyId ?? null,
        status: 'ACTIVE',
        startsAt: now,
        endsAt,
        amountPaid,
        currency,
        source,
        sourceTransactionId: transactionId,
      },
      txClient,
    )
  }
}

@Injectable()
export class ConfirmBenefitsPaymentUseCase {
  private readonly logger = new Logger(ConfirmBenefitsPaymentUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async execute(data: { userUuid: string; reference: string }) {
    const user = await this.userRepository.findByUuid(data.userUuid)
    if (!user) throw new UnauthorizedException('User not found')

    const rates = await this.paymentConfig.getDynamicProcessingRates(user.id!)
    const catalogFee = this.paymentConfig.calculateRatesForRent(rates.rentValue || 0).benefitsFee
    const amount = rates.benefitsFee > 0 ? rates.benefitsFee : catalogFee
    if (!amount || amount <= 0) {
      throw new BadRequestException('Benefits fee is not available for this account')
    }

    this.logger.log(`Confirming benefits payment ${data.reference} for user ${user.uuid}`)

    const { RecordTransactionUseCase } = await import('./payment.use-cases')
    const recordTransaction = this.moduleRef.get(RecordTransactionUseCase, { strict: false })

    return recordTransaction.execute({
      userId: user.uuid!,
      reference: data.reference,
      amount,
      currency: 'NGN',
      type: 'BENEFITS_SUBSCRIPTION',
      status: 'SUCCESS',
      narration: 'Upward Benefits — Tenant Protection Package (annual)',
      settlementStatus: 'SETTLED',
      lineItemPayments: [
        {
          id: -3,
          name: 'Upward Benefits',
          amount,
          amountPaid: amount,
        },
      ],
    })
  }
}
