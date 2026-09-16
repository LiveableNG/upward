import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetLandlordReportsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, landlordEmail: string, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;

    if (actor?.isEmployee && actor.accessLevel !== 'ALL') {
      if (!actor.employeeId) {
        throw new ForbiddenException('You do not have access to this landlord');
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
        throw new ForbiddenException('You do not have access to this landlord');
      }

      const emailHash = this.encryption.hash(landlordEmail.toLowerCase());
      const hasProperty = await this.prisma.upward_pm_property.findFirst({
        where: {
          id: { in: propertyIds },
          pmId: actor.ownerPmId,
          landlord: { emailHash },
        },
      });

      if (!hasProperty) {
        throw new ForbiddenException('You do not have access to this landlord');
      }
    }

    return (this.prisma as any).upward_pm_landlord_report.findMany({
      where: {
        pmId: ownerPmId,
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

