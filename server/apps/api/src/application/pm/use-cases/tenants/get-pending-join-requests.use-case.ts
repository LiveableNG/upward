import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetPendingJoinRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number) {
    const logs = await this.prisma.upward_pm_activity_log.findMany({
      where: {
        ownerPmId: pmId,
        action: 'TENANT_JOIN_REQUEST',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for PENDING logs using the JSON metadata field
    const pendingLogs = logs.filter((log: any) => {
      const metadata = log.metadata as any;
      return metadata && metadata.status === 'PENDING';
    });

    return Promise.all(
      pendingLogs.map(async (log: any) => {
        const metadata = log.metadata as any;
        const tenantEmail = this.encryption.decrypt(metadata.userEmail);
        const emailHash = this.encryption.hash(tenantEmail.toLowerCase());

        // Look up if this PM already has this tenant assigned to a unit
        const pmTenant = await this.prisma.upward_pm_tenant.findFirst({
          where: {
            pmId,
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
  }
}
