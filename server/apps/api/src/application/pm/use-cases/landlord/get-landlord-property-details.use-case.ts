import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetLandlordPropertyDetailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(landlordEmail: string, propertyUuid: string) {
    const emailHash = this.encryption.hash(landlordEmail);

    const pm = await (this.prisma as any).upward_property_manager.findUnique({
      where: { emailHash }
    });
    const pmId = pm?.id;

    const property = await (this.prisma as any).upward_pm_property.findFirst({
      where: { 
        uuid: propertyUuid,
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
        pm: true,
        units: {
          include: {
            tenant: true,
            paymentRequests: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!property) {
      throw new UnauthorizedException('Property not found or access denied');
    }

    const units = property.units.map((u: any) => {
      const totalPaid = u.paymentRequests
        .filter((pr: any) => pr.status === 'PAID' || pr.status === 'PARTIAL')
        .reduce((sum: number, pr: any) => sum + pr.amountPaid, 0);
      
      const totalRequested = u.paymentRequests.reduce((sum: number, pr: any) => sum + pr.amount, 0);

      return {
        uuid: u.uuid,
        unitNumber: u.unitNumber,
        unitType: u.unitType,
        status: u.tenantId ? 'OCCUPIED' : 'VACANT',
        tenant: u.tenant ? {
          name: `${this.encryption.decrypt(u.tenant.firstNameEncrypted)} ${this.encryption.decrypt(u.tenant.lastNameEncrypted)}`,
          email: this.encryption.decrypt(u.tenant.emailEncrypted)
        } : null,
        revenue: totalPaid,
        outstanding: totalRequested - totalPaid,
        recentPayments: u.paymentRequests.slice(0, 5).map((pr: any) => ({
          uuid: pr.uuid,
          amount: pr.amount,
          amountPaid: pr.amountPaid,
          status: pr.status,
          dueDate: pr.dueDate,
          type: pr.type
        }))
      };
    });

    return {
      uuid: property.uuid,
      name: property.name,
      address: property.address,
      propertyType: property.propertyType,
      imageUrl: property.imageUrl,
      manager: {
        name: `${this.encryption.decrypt(property.pm.firstName)} ${this.encryption.decrypt(property.pm.lastName)}`,
        business: property.pm.businessName ? this.encryption.decrypt(property.pm.businessName) : null,
        email: this.encryption.decrypt(property.pm.email),
        phone: this.encryption.decrypt(property.pm.phone)
      },
      units,
      summary: {
        totalUnits: units.length,
        occupiedUnits: units.filter((u: any) => u.status === 'OCCUPIED').length,
        totalRevenue: units.reduce((sum: number, u: any) => sum + u.revenue, 0),
        totalOutstanding: units.reduce((sum: number, u: any) => sum + u.outstanding, 0)
      }
    };
  }
}
