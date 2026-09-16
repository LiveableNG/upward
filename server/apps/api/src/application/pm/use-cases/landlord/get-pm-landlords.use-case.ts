import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetPmLandlordsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;

    if (actor?.isEmployee && actor.accessLevel !== 'ALL') {
      if (!actor.employeeId) return [];

      const assignedLinks = await (this.prisma as any).upward_pm_employee_property.findMany({
        where: {
          employeeId: actor.employeeId,
          ownerPmId: actor.ownerPmId,
        },
        select: { propertyId: true },
      });

      const propertyIds = assignedLinks.map((al: any) => al.propertyId);
      if (propertyIds.length === 0) return [];

      const propertiesWithLandlords = await this.prisma.upward_pm_property.findMany({
        where: {
          id: { in: propertyIds },
          pmId: actor.ownerPmId,
          landlordId: { not: null },
        },
        select: { landlordId: true },
      });

      const landlordIds = Array.from(new Set(propertiesWithLandlords.map(p => p.landlordId).filter(Boolean))) as number[];
      if (landlordIds.length === 0) return [];

      const relations = await this.prisma.upward_pm_landlord_relation.findMany({
        where: {
          pmId: ownerPmId,
          landlordId: { in: landlordIds },
        },
        include: { landlord: true },
        orderBy: { createdAt: 'desc' },
      });

      return relations.map((r: any) => {
        const l = r.landlord;
        return {
          id: l.id,
          uuid: l.uuid,
          name: l.firstName ? this.encryption.decrypt(l.firstName) + (l.lastName ? ' ' + this.encryption.decrypt(l.lastName) : '') : 'Landlord',
          email: l.email ? this.encryption.decrypt(l.email) : '',
          phone: l.phone ? this.encryption.decrypt(l.phone) : '',
          createdAt: l.createdAt,
        };
      });
    }

    const relations = await this.prisma.upward_pm_landlord_relation.findMany({
      where: { pmId: ownerPmId },
      include: { landlord: true },
      orderBy: { createdAt: 'desc' }
    });

    return relations.map((r:any) => {
      const l = r.landlord;
      return {
        id: l.id,
        uuid: l.uuid,
        name: l.firstName ? this.encryption.decrypt(l.firstName) + (l.lastName ? ' ' + this.encryption.decrypt(l.lastName) : '') : 'Landlord',
        email: l.email ? this.encryption.decrypt(l.email) : '',
        phone: l.phone ? this.encryption.decrypt(l.phone) : '',
        createdAt: l.createdAt,
      };
    });
  }
}

