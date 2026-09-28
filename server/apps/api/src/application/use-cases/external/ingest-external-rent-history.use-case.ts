import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository';
import { RentalPeriodService } from '../../services/rental-period.service';
import { RentHistoryDto } from './external-api.dto';

@Injectable()
export class IngestExternalRentHistoryUseCase {
  private readonly logger = new Logger(IngestExternalRentHistoryUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository,
    private readonly rentalPeriodService: RentalPeriodService,
  ) {}

  async execute(
    propertyIdentifier: string | number,
    records: RentHistoryDto[],
    platformId?: number
  ): Promise<{
    success: boolean;
    message: string;
    recordsIngested: number;
    propertyUuid: string;
    userUuid?: string;
  }> {
    if (!records || records.length === 0) {
      throw new BadRequestException('At least one rent payment record is required.');
    }

    const isUuid = typeof propertyIdentifier === 'string' && propertyIdentifier.length > 20;

    const property = await this.prisma.upward_user_property.findFirst({
      where: isUuid
        ? { uuid: String(propertyIdentifier) }
        : { id: Number(propertyIdentifier) },
      include: {
        user: true,
        location: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${propertyIdentifier}' not found.`);
    }

    if (platformId && property.platformId && property.platformId !== platformId) {
      throw new ForbiddenException('You do not have access to this property.');
    }

    let ingestedCount = 0;

    for (const record of records) {
      const paymentDate = this.rentalPeriodService.parseCalendarDate(record.paymentDate) || new Date();
      const periodStart = this.rentalPeriodService.parseCalendarDate(record.periodStart);
      let periodEnd = this.rentalPeriodService.parseCalendarDate(record.periodEnd);

      if (periodStart && !periodEnd) {
        periodEnd = this.rentalPeriodService.calculatePeriodEnd(
          periodStart,
          property.rentType,
          (property as any).leaseYears,
        );
      }

      const dueDate = this.rentalPeriodService.parseCalendarDate(record.dueDate) || periodStart || periodEnd || paymentDate;
      const isPaidOnTime = paymentDate.getTime() <= dueDate.getTime();
      const status = isPaidOnTime ? 'PAID_ON_TIME' : 'PAID_LATE';

      // 1. Create upward_platform_rent_payment record
      await this.prisma.upward_platform_rent_payment.create({
        data: {
          userPropertyId: property.id,
          amount: record.amount,
          rentAmountAtPayment: property.rentAmount || record.amount,
          paymentDate,
          method: record.method || 'EXTERNAL_IMPORT',
          status: 'SUCCESS',
          notes: record.notes || 'External Rent History Record',
          periodStart: periodStart ?? undefined,
          periodEnd: periodEnd ?? undefined,
        },
      });

      // 2. Create upward_rent_cycle for scoring
      await this.rentCycleRepo.create({
        userId: property.userId,
        userPropertyId: property.id,
        source: 'PAST_RECORD',
        amountOwed: record.amount,
        amountPaid: record.amount,
        currency: property.currency || 'NGN',
        dueDate,
        paidAt: paymentDate,
        status,
        description: record.notes || 'Rent Payment (External Record)',
      });

      ingestedCount++;
    }

    // Mark property as verified since verified records were provided
    await this.prisma.upward_user_property.update({
      where: { id: property.id },
      data: { isVerified: true },
    });

    // 3. Recalculate and synchronize property rent period state
    await this.rentalPeriodService.syncPlatformPropertyState(property.id);

    this.logger.log(
      `Ingested ${ingestedCount} rent records for property ${property.uuid} (User: ${property.user?.uuid})`,
    );

    return {
      success: true,
      message: `Successfully ingested ${ingestedCount} rent payment record(s).`,
      recordsIngested: ingestedCount,
      propertyUuid: property.uuid,
      userUuid: property.user?.uuid,
    };
  }
}
