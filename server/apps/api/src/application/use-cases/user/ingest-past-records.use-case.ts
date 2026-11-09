import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import {
  RENT_CYCLE_REPOSITORY,
  IRentCycleRepository,
} from '../../../domains/scoring/rent-cycle.repository'
import { RentalPeriodService } from '../../services/rental-period.service'

export interface PastRecordItem {
  amount: number
  expectedAmount?: number
  isPartial?: boolean
  paymentDate?: string
  paidDate?: string
  dueDate?: string
  periodStart?: string
  periodEnd?: string
  method?: string
  notes?: string
}

export interface PastRecordInput {
  propertyUuid: string
  records: PastRecordItem[]
  verifiedByPm?: boolean
}

@Injectable()
export class IngestPastRecordsUseCase {
  private readonly logger = new Logger(IngestPastRecordsUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository,
    private readonly rentalPeriodService: RentalPeriodService,
  ) {}

  async execute(userId: string, input: PastRecordInput, verifiedByPm = false) {
    if (!input.records || input.records.length === 0) {
      throw new BadRequestException('At least one past payment record is required.')
    }

    // 1. Find user and property
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId },
      include: {
        properties: {
          include: {
            pmUnit: true,
          },
        },
      },
    })

    if (!user) throw new NotFoundException('User not found')

    const property = user.properties.find((p: any) => p.uuid === input.propertyUuid)
    if (!property) throw new NotFoundException('Property not found on user profile')

    const isPmConfirmed = Boolean(verifiedByPm || input.verifiedByPm)
    const isTrustedRecord = isPmConfirmed || Boolean(property.isVerified)
    const cycleSource = isTrustedRecord ? 'PAST_RECORD' : 'SELF_REPORTED'

    const results = []

    // 2. Insert records logically into rent_cycle table and ledger
    for (const record of input.records) {
      const amount = Number(record.amount)
      if (isNaN(amount) || amount <= 0) continue

      const rawPaymentDate = record.paymentDate || record.paidDate
      const paymentDate = this.rentalPeriodService.parseCalendarDate(rawPaymentDate) || new Date()
      const periodStart = this.rentalPeriodService.parseCalendarDate(record.periodStart)
      let periodEnd = this.rentalPeriodService.parseCalendarDate(record.periodEnd)

      if (periodStart && !periodEnd) {
        periodEnd = this.rentalPeriodService.calculatePeriodEnd(
          periodStart,
          property.rentType,
          (property as any).leaseYears,
        )
      }

      const dueDate =
        this.rentalPeriodService.parseCalendarDate(record.dueDate) ||
        periodStart ||
        periodEnd ||
        paymentDate

      // Determine partial vs full payment and on-time vs late (including 48-hour bank transfer grace)
      const graceMs = 2 * 24 * 60 * 60 * 1000
      const isPaidOnTime = paymentDate.getTime() <= dueDate.getTime() + graceMs
      const isPartial = Boolean(
        record.isPartial || (record.expectedAmount && Number(record.expectedAmount) > amount),
      )
      const amountPaid = amount
      const amountOwed =
        isPartial && record.expectedAmount
          ? Number(record.expectedAmount)
          : property.rentAmount
            ? Number(property.rentAmount)
            : amount

      const status = isPartial
        ? isPaidOnTime
          ? 'PARTIAL_ON_TIME'
          : 'PARTIAL_LATE'
        : isPaidOnTime
          ? 'PAID_ON_TIME'
          : 'PAID_LATE'

      const cycle = await this.rentCycleRepo.create({
        userId: user.id,
        userPropertyId: property.id,
        source: cycleSource,
        amountOwed: amountOwed,
        amountPaid: amountPaid,
        currency: property.currency || 'NGN',
        dueDate: dueDate,
        paidAt: paymentDate,
        status: status,
        description:
          record.notes ||
          (isPartial ? 'Partial Rent Payment (Past Record)' : 'Rent Payment (Past Record)'),
      })

      results.push(cycle)
    }

    if (isPmConfirmed) {
      await this.prisma.upward_user_property.update({
        where: { id: property.id },
        data: { isVerified: true, verificationStatus: 'VERIFIED' },
      })
      await this.prisma.upward_rent_cycle.updateMany({
        where: { userId: user.id, userPropertyId: property.id, source: 'SELF_REPORTED' },
        data: { source: 'PAST_RECORD' },
      })
    }

    return {
      success: true,
      message: isTrustedRecord
        ? `Ingested ${results.length} verified past records for scoring`
        : `Submitted ${results.length} past records pending landlord/PM verification`,
      ingested: results.length,
      verified: isTrustedRecord,
    }
  }
}
