import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'

const MAX_SUM_ASSURED = 20_000_000
const DEFAULT_TERMS_VERSION = '2026-07-15'

export interface InitializeInsuranceEnrolmentDto {
  propertyUuid?: string
  fullName: string
  dateOfBirth: string
  gender: string
  phone?: string
  address: string
  occupation: string
  employmentType: string
  rentStartDate: string
  annualRent: number
  landlordName: string
  propertyAddress?: string
  termsVersion?: string
}

@Injectable()
export class GetUserInsuranceEnrolmentsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userUuidOrId: string | number) {
    const user =
      typeof userUuidOrId === 'number' || /^\d+$/.test(String(userUuidOrId))
        ? await this.userRepository.findById(Number(userUuidOrId))
        : await this.userRepository.findByUuid(String(userUuidOrId))

    if (!user || !user.id) {
      throw new UnauthorizedException('User not found')
    }

    const enrolments = await this.prisma.upward_insurance_enrolment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return enrolments
  }
}

@Injectable()
export class InitializeInsuranceEnrolmentUseCase {
  private readonly logger = new Logger(InitializeInsuranceEnrolmentUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly prisma: PrismaService,
    private readonly platformRates: PlatformRatesService,
  ) {}

  async execute(userUuidOrId: string | number, dto: InitializeInsuranceEnrolmentDto) {
    const user =
      typeof userUuidOrId === 'number' || /^\d+$/.test(String(userUuidOrId))
        ? await this.userRepository.findById(Number(userUuidOrId))
        : await this.userRepository.findByUuid(String(userUuidOrId))

    if (!user || !user.id) {
      throw new UnauthorizedException('User not found')
    }
    if (!user.email) {
      throw new BadRequestException('User email is required to initialize payment')
    }

    const annualRent = Number(dto.annualRent)
    if (!Number.isFinite(annualRent) || annualRent <= 0) {
      throw new BadRequestException('A valid annual rent amount is required')
    }

    const rates = await this.platformRates.getRates()
    const premiumRatePct = rates.insurancePremiumPct
    const sumAssured = Math.min(annualRent, MAX_SUM_ASSURED)
    const premiumAmount = Math.round(sumAssured * (premiumRatePct / 100))

    if (premiumAmount <= 0) {
      throw new BadRequestException('Calculated insurance premium must be greater than zero')
    }

    const reference = `INS-${randomUUID()}`

    const enrolment = await this.prisma.upward_insurance_enrolment.create({
      data: {
        userId: user.id,
        userPropertyUuid: dto.propertyUuid || null,
        fullName: dto.fullName.trim(),
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        phone: dto.phone?.trim() || user.phone || null,
        address: dto.address.trim(),
        occupation: dto.occupation.trim(),
        employmentType: dto.employmentType,
        rentStartDate: dto.rentStartDate,
        annualRent,
        sumAssured,
        premiumRatePct,
        premiumAmount,
        currency: 'NGN',
        landlordName: dto.landlordName.trim(),
        propertyAddress: dto.propertyAddress?.trim() || null,
        status: 'PENDING',
        paymentReference: reference,
        termsVersion: dto.termsVersion || DEFAULT_TERMS_VERSION,
      },
    })

    const lineItems = [
      {
        id: -4,
        name: 'Rent Support Insurance',
        label: `Rent Support Insurance (${premiumRatePct}% annual premium)`,
        amount: premiumAmount,
        amountPaid: premiumAmount,
        category: 'Insurance',
      },
    ]

    const metadata = {
      source_app: 'upward',
      type: 'RENT_SUPPORT_INSURANCE',
      paymentKind: 'RENT_SUPPORT_INSURANCE',
      userId: user.id,
      userUuid: user.uuid,
      enrolmentUuid: enrolment.uuid,
      propertyUuid: dto.propertyUuid || null,
      annualRent,
      sumAssured,
      premiumRatePct,
      premiumAmount,
      description: `Rent Support Insurance — ${premiumRatePct}% Annual Premium`,
      lineItems,
    }

    this.logger.log(
      `Initializing Rent Support Insurance payment for user ${user.uuid}: ₦${premiumAmount} (${premiumRatePct}% of ₦${sumAssured})`,
    )

    const initialization = await this.gateway.initializeTransaction({
      email: user.email,
      amount: premiumAmount,
      reference,
      metadata,
      channels: ['card', 'bank', 'bank_transfer', 'ussd'],
    })

    return {
      enrolmentUuid: enrolment.uuid,
      reference,
      accessCode: initialization.accessCode,
      authorizationUrl: initialization.authorizationUrl,
      premiumAmount,
      premiumRatePct,
      sumAssured,
      currency: 'NGN',
    }
  }
}

@Injectable()
export class ConfirmInsuranceEnrolmentUseCase {
  private readonly logger = new Logger(ConfirmInsuranceEnrolmentUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async execute(userUuidOrId: string | number, enrolmentUuid: string, reference?: string) {
    const user =
      typeof userUuidOrId === 'number' || /^\d+$/.test(String(userUuidOrId))
        ? await this.userRepository.findById(Number(userUuidOrId))
        : await this.userRepository.findByUuid(String(userUuidOrId))

    if (!user || !user.id) {
      throw new UnauthorizedException('User not found')
    }

    const enrolment = await this.prisma.upward_insurance_enrolment.findFirst({
      where: { uuid: enrolmentUuid, userId: user.id },
    })

    if (!enrolment) {
      throw new NotFoundException('Insurance enrolment not found')
    }

    const effectiveReference = reference || enrolment.paymentReference || `INS-${randomUUID()}`

    const updated = await this.prisma.upward_insurance_enrolment.update({
      where: { id: enrolment.id },
      data: {
        status: 'ACTIVE',
        paymentReference: effectiveReference,
        purchasedAt: enrolment.purchasedAt || new Date(),
      },
    })

    try {
      const { RecordTransactionUseCase } = await import('./payment.use-cases')
      const recordTransaction = this.moduleRef.get(RecordTransactionUseCase, { strict: false })
      if (recordTransaction && user.uuid) {
        await recordTransaction.execute({
          userId: user.uuid,
          reference: effectiveReference,
          amount: updated.premiumAmount,
          currency: updated.currency || 'NGN',
          type: 'RENT_SUPPORT_INSURANCE',
          status: 'SUCCESS',
          narration: `Rent Support Insurance — ${updated.premiumRatePct}% Annual Premium`,
          settlementStatus: 'SETTLED',
          lineItemPayments: [
            {
              id: -4,
              name: 'Rent Support Insurance',
              amount: updated.premiumAmount,
              amountPaid: updated.premiumAmount,
            },
          ],
        })
      }
    } catch (err: any) {
      this.logger.warn(`Non-blocking insurance transaction record note: ${err?.message}`)
    }

    return updated
  }
}
