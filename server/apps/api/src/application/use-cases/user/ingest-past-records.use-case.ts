import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository';
import { RentalPeriodService } from '../../services/rental-period.service';

export interface PastRecordItem {
  amount: number;
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

      // Determine status based on dates
      const isPaidOnTime = paymentDate.getTime() <= dueDate.getTime();
      const status = isPaidOnTime ? 'PAID_ON_TIME' : 'PAID_LATE';

      // 2a. Insert into upward_rent_cycle for scoring
      const cycle = await this.rentCycleRepo.create({
        userId: user.id,
        userPropertyId: property.id,
        source: 'PAST_RECORD',
        amountOwed: amount,
        amountPaid: amount,
        currency: property.currency || 'NGN',
        dueDate: dueDate,
        paidAt: paymentDate,
        status: status,
        description: record.notes || 'Rent Payment (Past Record)',
      });

      // 2b. Also insert into upward_platform_rent_payment or PM unit payment so the ledger reflects it
      if (property.pmUnitId) {
        await this.prisma.upward_pm_rent_payment.create({
          data: {
            unitId: property.pmUnitId,
            tenantId: property.pmUnit?.tenantId || undefined,
            amount,
            rentAmountAtPayment: property.rentAmount || amount,
            paymentDate,
            periodStart: periodStart ?? undefined,
            periodEnd: periodEnd ?? undefined,
            method: record.method || 'Bank Transfer',
            status: 'SUCCESS',
            notes: record.notes || 'Past Tenancy Verification',
          },
        }).catch(err => this.logger.error('Failed to create pm rent payment record:', err));
      } else {
        await this.prisma.upward_platform_rent_payment.create({
          data: {
            userPropertyId: property.id,
            amount,
            rentAmountAtPayment: property.rentAmount || amount,
            paymentDate,
            periodStart: periodStart ?? undefined,
            periodEnd: periodEnd ?? undefined,
            method: record.method || 'Bank Transfer',
            status: 'SUCCESS',
            notes: record.notes || 'Past Tenancy Verification',
          },
        }).catch(err => this.logger.error('Failed to create platform rent payment record:', err));
      }

      results.push(cycle);
    }

    // 3. Mark property as verified since records are coming from a PM fulfillment
    await this.prisma.upward_user_property.update({
      where: { id: property.id },
      data: { isVerified: true },
    });

    // 4. Synchronize rental period state to update active occupancy and due date windows
    await this.rentalPeriodService.syncPlatformPropertyState(property.id).catch(err => {
      this.logger.error('Failed to sync rental period state after past records ingestion:', err);
    });

    return { success: true, message: `Ingested ${results.length} past records`, ingested: results.length };
  }
}
