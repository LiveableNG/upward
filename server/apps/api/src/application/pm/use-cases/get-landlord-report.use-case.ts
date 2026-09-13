import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetLandlordReportUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, uuid: string, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const report = await (this.prisma as any).upward_pm_landlord_report.findUnique({
      where: {
        uuid,
        pmId: ownerPmId
      }
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (actor?.isEmployee && actor.accessLevel !== 'ALL') {
      if (!actor.employeeId) {
        throw new ForbiddenException('You do not have access to this report');
      }

      const assignedLinks = await (this.prisma as any).upward_pm_employee_property.findMany({
        where: {
          employeeId: actor.employeeId,
          ownerPmId: actor.ownerPmId,
        },
        select: { propertyId: true },
      });

      const propertyIds = assignedLinks.map((al: any) => al.propertyId);
      if (propertyIds.length === 0) {
        throw new ForbiddenException('You do not have access to this report');
      }

      const emailHash = this.encryption.hash(report.landlordEmail.toLowerCase());
      const hasProperty = await this.prisma.upward_pm_property.findFirst({
        where: {
          id: { in: propertyIds },
          pmId: actor.ownerPmId,
          landlord: { emailHash },
        },
      });

      if (!hasProperty) {
        throw new ForbiddenException('You do not have access to this report');
      }
    }

    return report;
  }
}

