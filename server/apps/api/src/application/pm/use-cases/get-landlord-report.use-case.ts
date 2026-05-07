import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetLandlordReportUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, uuid: string) {
    const report = await (this.prisma as any).upward_pm_landlord_report.findUnique({
      where: {
        uuid,
        pmId
      }
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }
}
