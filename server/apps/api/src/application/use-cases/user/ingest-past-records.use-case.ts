import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository';

interface PastRecordInput {
  propertyUuid: string;
  records: {
    amount: number;
    dueDate: string; 
    paidDate: string; 
  }[];
}

@Injectable()
export class IngestPastRecordsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository
  ) {}

  async execute(userId: string, input: PastRecordInput) {
    // 1. Find user and property
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId },
      include: {
        properties: true,
      }
    });

    if (!user) throw new NotFoundException('User not found');

    const property = user.properties.find((p: any) => p.uuid === input.propertyUuid);
    if (!property) throw new NotFoundException('Property not found on user profile');

    const results = [];

    // 2. Insert records logically into rent_cycle table
    for (const record of input.records) {
      const dueDate = new Date(record.dueDate);
      const paidDate = new Date(record.paidDate);
      
      // Determine status based on dates
      const isPaidOnTime = paidDate <= dueDate;
      const status = isPaidOnTime ? 'PAID_ON_TIME' : 'PAID_LATE';

      const cycle = await this.rentCycleRepo.create({
        userId: user.id,
        userPropertyId: property.id,
        source: 'PAST_RECORD',
        amountOwed: record.amount,
        amountPaid: record.amount,
        currency: 'NGN',
        dueDate: dueDate,
        paidAt: paidDate,
        status: status,
        description: `Rent Payment (Past Record)`
      });

      results.push(cycle);
    }

    return { success: true, message: `Ingested ${input.records.length} past records`, ingested: results.length };
  }
}
