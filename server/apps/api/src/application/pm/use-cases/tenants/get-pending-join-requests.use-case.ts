import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetPendingJoinRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const logs = await this.prisma.upward_pm_activity_log.findMany({
      where: {
        ownerPmId,
        action: 'TENANT_JOIN_REQUEST',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for PENDING logs using the JSON metadata field
    let pendingLogs = logs.filter((log: any) => {
      const metadata = log.metadata as any;
      return metadata && metadata.status === 'PENDING';
    });

    let assignedPropertyIds: Set<number> | null = null;
    if (actor?.isEmployee && actor.accessLevel !== 'ALL') {
      if (!actor.employeeId) return [];
      const assignedLinks = await (this.prisma as any).upward_pm_employee_property.findMany({
        where: {
          employeeId: actor.employeeId,
          ownerPmId: actor.ownerPmId,
        },
        select: { propertyId: true },
      });
      assignedPropertyIds = new Set(assignedLinks.map((al: any) => al.propertyId));
    }

    const results = await Promise.all(
      pendingLogs.map(async (log: any) => {
        const metadata = log.metadata as any;
        const tenantEmail = this.encryption.decrypt(metadata.userEmail);
        const emailHash = this.encryption.hash(tenantEmail.toLowerCase());

        // Look up if this PM already has this tenant assigned to a unit
        const pmTenant = await this.prisma.upward_pm_tenant.findFirst({
          where: {
            pmId: ownerPmId,
            emailHash,
          },
          include: {
            units: {
              include: {
                property: true
              }
            }
          }
        });

        let existingConnection = null;
        if (pmTenant && pmTenant.units && pmTenant.units.length > 0) {
          const activeUnit = pmTenant.units.find(u => u.status === 'OCCUPIED');
          if (activeUnit) {
            existingConnection = {
              tenantUuid: pmTenant.uuid,
              unitUuid: activeUnit.uuid,
              unitName: activeUnit.unitName,
              propertyName: activeUnit.property.name,
              propertyId: activeUnit.propertyId,
              isSynced: activeUnit.isSynced
            };
          }
        }

        return {
          uuid: log.uuid,
          tenantFirstName: this.encryption.decrypt(metadata.userFirstName),
          tenantLastName: this.encryption.decrypt(metadata.userLastName),
          tenantEmail,
          tenantPhone: metadata.userPhone ? this.encryption.decrypt(metadata.userPhone) : null,
          tenantUuid: metadata.userUuid,
          unitDetails: metadata.unitDetails,
          createdAt: log.createdAt,
          existingConnection,
        };
      })
    );

    if (assignedPropertyIds) {
      return results.filter(r => {
        if (!r.existingConnection) return true;
        return assignedPropertyIds!.has(r.existingConnection.propertyId);
      });
    }

    return results;
  }
}

