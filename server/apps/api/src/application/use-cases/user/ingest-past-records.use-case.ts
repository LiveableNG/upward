import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository';
import { RentalPeriodService } from '../../services/rental-period.service';

export interface PastRecordItem {
  amount: number;
  expectedAmount?: number;
  isPartial?: boolean;
  paymentDate?: string;
  paidDate?: string;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  method?: string;
  notes?: string;
}

export interface PastRecordInput {
  propertyUuid: string;
  records: PastRecordItem[];
}

@Injectable()
export class IngestPastRecordsUseCase {
  private readonly logger = new Logger(IngestPastRecordsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository,
    private readonly rentalPeriodService: RentalPeriodService,
  ) {}

  async execute(userId: string, input: PastRecordInput) {
    if (!input.records || input.records.length === 0) {
      throw new BadRequestException('At least one past payment record is required.');
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
    });

    if (!user) throw new NotFoundException('User not found');

    const property = user.properties.find((p: any) => p.uuid === input.propertyUuid);
    if (!property) throw new NotFoundException('Property not found on user profile');

    const results = [];

    // 2. Insert records logically into rent_cycle table and ledger
    for (const record of input.records) {
      const amount = Number(record.amount);
      if (isNaN(amount) || amount <= 0) continue;

      const rawPaymentDate = record.paymentDate || record.paidDate;
      const paymentDate = this.rentalPeriodService.parseCalendarDate(rawPaymentDate) || new Date();
      const periodStart = this.rentalPeriodService.parseCalendarDate(record.periodStart);
      let periodEnd = this.rentalPeriodService.parseCalendarDate(record.periodEnd);

      if (periodStart && !periodEnd) {
        periodEnd = this.rentalPeriodService.calculatePeriodEnd(
          periodStart,
          property.rentType,
          (property as any).leaseYears,
        );
      }

      const dueDate = this.rentalPeriodService.parseCalendarDate(record.dueDate)
        || periodStart
        || periodEnd
        || paymentDate;

      // Determine partial vs full payment and on-time vs late
      const isPaidOnTime = paymentDate.getTime() <= dueDate.getTime();
      const isPartial = Boolean(
        record.isPartial || (record.expectedAmount && Number(record.expectedAmount) > amount)
      );
      const amountPaid = amount;
      const amountOwed = isPartial && record.expectedAmount ? Number(record.expectedAmount) : (property.rentAmount ? Number(property.rentAmount) : amount);

      const status = isPartial
        ? (isPaidOnTime ? 'PARTIAL_ON_TIME' : 'PARTIAL_LATE')
        : (isPaidOnTime ? 'PAID_ON_TIME' : 'PAID_LATE');

      const cycle = await this.rentCycleRepo.create({
        userId: user.id,
        userPropertyId: property.id,
        source: 'PAST_RECORD',
        amountOwed: amountOwed,
        amountPaid: amountPaid,
        currency: property.currency || 'NGN',
        dueDate: dueDate,
        paidAt: paymentDate,
        status: status,
        description: record.notes || (isPartial ? 'Partial Rent Payment (Past Record)' : 'Rent Payment (Past Record)'),
      });

      results.push(cycle);
    }

    await this.prisma.upward_user_property.update({
      where: { id: property.id },
      data: { isVerified: true },
    });

    return { success: true, message: `Ingested ${results.length} past records for scoring`, ingested: results.length };
  }
}
