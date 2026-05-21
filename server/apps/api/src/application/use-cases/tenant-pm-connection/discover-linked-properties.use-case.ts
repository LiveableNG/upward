import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SyncUnitToUpwardUseCase } from '../../pm/use-cases/units/sync-unit.use-case';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class DiscoverLinkedPropertiesUseCase {
  private readonly logger = new Logger(DiscoverLinkedPropertiesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncUnitUseCase: SyncUnitToUpwardUseCase,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(user: any) {
    const fullUser = await this.prisma.upward_user.findUnique({
      where: { uuid: user.id }
    });

    if (!fullUser) {
      throw new Error('User not found');
    }

    // 1. Find all PM Tenant records matching this user's email hash
    const pmTenants = await this.prisma.upward_pm_tenant.findMany({
      where: { emailHash: fullUser.emailHash },
      include: {
        pm: {
          select: {
            id: true,
            businessName: true,
            firstName: true,
            lastName: true,
          }
        },
        units: {
          include: {
            property: true
          }
        }
      }
    });

    if (pmTenants.length === 0) {
      return { found: false, properties: [] };
    }

    const discoveredProperties = [];

    // 2. For each PM record, sync the units
    for (const tenantRecord of pmTenants) {
      const decryptedBusinessName = tenantRecord.pm?.businessName ? this.encryption.decrypt(tenantRecord.pm.businessName) : '';
      const decryptedFirstName = tenantRecord.pm?.firstName ? this.encryption.decrypt(tenantRecord.pm.firstName) : '';
      const decryptedLastName = tenantRecord.pm?.lastName ? this.encryption.decrypt(tenantRecord.pm.lastName) : '';
      const pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Property Manager';

      for (const unit of tenantRecord.units) {
        try {
          // Check if already synced to this user
          const existingSync = await this.prisma.upward_user_property.findFirst({
            where: {
                userId: fullUser.id,
                pmUnitId: unit.id
            }
          });

          if (!existingSync) {
            await this.syncUnitUseCase.execute(unit.uuid, tenantRecord.pmId);
            
            discoveredProperties.push({
              address: unit.property.name,
              unitName: unit.unitName,
              pmName,
              rentAmount: unit.rentAmount,
              currency: unit.currency
            });
          } else {
             // Already synced, still include in results for display
             discoveredProperties.push({
                address: unit.property.name,
                unitName: unit.unitName,
                pmName,
                rentAmount: unit.rentAmount,
                currency: unit.currency,
                alreadySynced: true
              });
          }
        } catch (e) {
          this.logger.error(`Failed to auto-sync unit ${unit.uuid}:`, e);
        }
      }

      // Update tenant status to ON_UPWARD if it was pending
      if (['PENDING', 'SENT'].includes(tenantRecord.inviteStatus)) {
        await this.prisma.upward_pm_tenant.update({
          where: { id: tenantRecord.id },
          data: { inviteStatus: 'ON_UPWARD' }
        });
      }
    }

    return {
      found: discoveredProperties.length > 0,
      properties: discoveredProperties
    };
  }
}
