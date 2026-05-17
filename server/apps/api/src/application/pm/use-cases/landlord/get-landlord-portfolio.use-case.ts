import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetLandlordPortfolioUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}
  async execute(landlordEmail: string) {
    const emailHash = this.encryption.hash(landlordEmail);

    // 1. Find shadow PM profile for this landlord
    const pm = await (this.prisma as any).upward_property_manager.findUnique({
      where: { emailHash }
    });
    const pmId = pm?.id;

    // 2. Get all properties linked to this landlord (either via landlordEmailHash or pmId/collaborations)
    const properties = await (this.prisma as any).upward_pm_property.findMany({
      where: {
        OR: [
          { landlordEmailHash: emailHash },
          ...(pmId ? [
            { pmId: pmId },
            {
              collaborators: {
                some: { collaboratorPmId: pmId }
              }
            }
          ] : [])
        ]
      },
      include: {
        pm: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
            email: true,
            phone: true
          }
        },
        units: {
          include: {
            tenant: true,
            paymentRequests: true,
            rentPayments: true
          }
        }
      }
    });

    // 2. Aggregate Data
    let totalUnits = 0;
    let totalActiveTenants = 0;
    let totalRevenue = 0;
    let totalOutstanding = 0;

    const propertyDetails = properties.map((p: any) => {
      const unitsCount = p.units.length;
      totalUnits += unitsCount;

      let propertyRevenue = 0;
      let propertyOutstanding = 0;

      p.units.forEach((u: any) => {
        if (u.tenantId) totalActiveTenants++;
        
        const paid = u.paymentRequests
          .filter((pr: any) => pr.status === 'PAID' || pr.status === 'PARTIAL')
          .reduce((sum: number, pr: any) => sum + pr.amountPaid, 0);
        
        const total = u.paymentRequests.reduce((sum: number, pr: any) => sum + pr.amount, 0);
        
        propertyRevenue += paid;
        propertyOutstanding += (total - paid);
      });

      totalRevenue += propertyRevenue;
      totalOutstanding += propertyOutstanding;

      return {
        uuid: p.uuid,
        name: p.name,
        address: p.address,
        propertyType: p.propertyType,
        unitsCount,
        revenue: propertyRevenue,
        outstanding: propertyOutstanding,
        manager: {
          name: `${this.encryption.decrypt(p.pm.firstName)} ${this.encryption.decrypt(p.pm.lastName)}`,
          business: p.pm.businessName ? this.encryption.decrypt(p.pm.businessName) : null,
          email: this.encryption.decrypt(p.pm.email)
        }
      };
    });

    return {
      summary: {
        totalProperties: properties.length,
        totalUnits,
        totalActiveTenants,
        totalRevenue,
        totalOutstanding,
        collectionRate: totalRevenue + totalOutstanding > 0 ? (totalRevenue / (totalRevenue + totalOutstanding)) * 100 : 0
      },
      properties: propertyDetails
    };
  }
}
