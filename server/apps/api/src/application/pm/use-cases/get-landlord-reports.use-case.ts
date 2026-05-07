import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetLandlordReportsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, landlordEmail: string) {
    return (this.prisma as any).upward_pm_landlord_report.findMany({
      where: {
        pmId,
        landlordEmail: {
          equals: landlordEmail,
          mode: 'insensitive'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        uuid: true,
        subject: true,
        createdAt: true,
        status: true,
        landlordName: true
      }
    });
  }
}
