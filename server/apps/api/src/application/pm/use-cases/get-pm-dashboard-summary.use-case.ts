import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetPmDashboardSummaryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly s3Service: S3Service,
  ) {}

  private decryptTenant(tenant: any) {
    if (!tenant) return null;
    return {
      id: tenant.id,
      uuid: tenant.uuid,
      pmId: tenant.pmId,
      firstName: tenant.firstNameEncrypted ? this.encryption.decrypt(tenant.firstNameEncrypted) : null,
      lastName: tenant.lastNameEncrypted ? this.encryption.decrypt(tenant.lastNameEncrypted) : null,
      email: tenant.emailEncrypted ? this.encryption.decrypt(tenant.emailEncrypted) : null,
      phone: tenant.phoneEncrypted ? this.encryption.decrypt(tenant.phoneEncrypted) : null,
      inviteStatus: tenant.inviteStatus,
      inviteSentAt: tenant.inviteSentAt,
    };
  }

  async execute(pmId: number) {
    // 1. Get owned property IDs
    const ownedProps = await this.prisma.upward_pm_property.findMany({
      where: { pmId },
      select: { id: true }
    });
    const ownedPropertyIds = ownedProps.map(p => p.id);

    // 2. Get team collaborations (ALL access)
    const teamCollabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
      where: { collaboratorPmId: pmId, status: 'ACCEPTED', accessLevel: 'ALL' },
      select: { ownerPmId: true }
    });
    const ownerPmIds = teamCollabs.map((tc: any) => tc.ownerPmId);

    const collabOwnerProps = ownerPmIds.length > 0 ? await this.prisma.upward_pm_property.findMany({
      where: { pmId: { in: ownerPmIds } },
      select: { id: true }
    }) : [];
    const collabOwnerPropertyIds = collabOwnerProps.map(p => p.id);

    // 3. Get custom property collaborations
    const propCollabs = await (this.prisma as any).upward_pm_property_collaboration.findMany({
      where: { collaboratorPmId: pmId },
      select: { propertyId: true }
    });
    const customCollabPropertyIds = propCollabs.map((pc: any) => pc.propertyId);

    // Consolidated list of accessible property IDs
    const accessiblePropertyIds = Array.from(new Set([
      ...ownedPropertyIds,
      ...collabOwnerPropertyIds,
      ...customCollabPropertyIds
    ]));

    // 4. Fetch all properties to compute propertyCount and top 3 properties
    const allAccessibleProperties = await this.prisma.upward_pm_property.findMany({
      where: { id: { in: accessiblePropertyIds } },
      orderBy: { createdAt: 'desc' }
    });

    const propertiesCount = allAccessibleProperties.length;

    // 5. Fetch all units for these properties
    const units = await this.prisma.upward_pm_unit.findMany({
      where: { propertyId: { in: accessiblePropertyIds } },
      include: {
        tenant: true
      }
    });

    const totalUnits = units.length;

    // 6. Fetch all tenants accessible
    const tenants = await this.prisma.upward_pm_tenant.findMany({
      where: {
        OR: [
          { pmId },
          { pmId: { in: ownerPmIds } },
          { units: { some: { propertyId: { in: customCollabPropertyIds } } } }
        ]
      }
    });

    const activeTenantsCount = tenants.filter(t => t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED').length;
    const pendingInvites = tenants.filter(t => t.inviteStatus === 'PENDING' || t.inviteStatus === 'SENT').length;
    const vacantUnits = units.filter(u => u.status === 'VACANT').length;
    const occupiedUnits = units.filter(u => u.status === 'OCCUPIED').length;

    // 7. Fetch payment requests
    const paymentRequests = await this.prisma.upward_pm_payment_request.findMany({
      where: {
        OR: [
          { pmId },
          { pmId: { in: ownerPmIds } },
          { unit: { propertyId: { in: customCollabPropertyIds } } }
        ]
      },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        paymentRequest: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 8. Calculations
    const pendingBalance = paymentRequests
      .filter(r => r.status !== 'PAID')
      .reduce((sum, r) => sum + (r.amount - r.amountPaid), 0);

    const totalRevenue = paymentRequests
      .reduce((sum, r) => sum + r.amountPaid, 0);

    // Map payment requests for response
    const mappedRequests = paymentRequests.map(r => ({
      uuid: r.uuid,
      amount: r.amount,
      amountPaid: r.amountPaid,
      status: r.status,
      dueDate: r.dueDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      coreRequestUuid: r.paymentRequest?.uuid || null,
      tenant: this.decryptTenant(r.tenant),
      unit: {
        id: r.unit.id,
        uuid: r.unit.uuid,
        unitName: r.unit.unitName,
        property: {
          id: r.unit.property.id,
          uuid: r.unit.property.uuid,
          name: r.unit.property.name
        }
      }
    }));

    // Find active requests
    const activeRequests = mappedRequests.filter(r => r.status === 'PENDING' || r.status === 'PARTIAL');

    // Find unbilled units
    const unbilledUnits = units.filter(u => {
      if (u.status !== 'OCCUPIED' || !u.tenantId || !u.rentDueDate) return false;
      return !activeRequests.some(r => r.unit.id === u.id);
    });

    // Map unbilled units to unbilled request structures
    const unbilledRequests = unbilledUnits.map(u => {
      const property = allAccessibleProperties.find(p => p.id === u.propertyId);
      return {
        uuid: u.uuid,
        amount: u.rentAmount,
        amountPaid: 0,
        status: 'UNBILLED',
        dueDate: u.rentDueDate!,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        coreRequestUuid: null,
        tenant: this.decryptTenant(u.tenant),
        unit: {
          id: u.id,
          uuid: u.uuid,
          unitName: u.unitName,
          property: property ? {
            id: property.id,
            uuid: property.uuid,
            name: property.name
          } : null
        },
        isUnbilled: true
      };
    });

    // Merge active payment requests with unbilled requests
    const allArrearsAndUpcoming = [...activeRequests, ...unbilledRequests];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Overdue payments (due date before today)
    const overduePayments = allArrearsAndUpcoming
      .filter(r => new Date(r.dueDate) < today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Upcoming payments (due date today or after)
    const upcomingPayments = allArrearsAndUpcoming
      .filter(r => new Date(r.dueDate) >= today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Completed payments (payment request PAID status)
    const completedPayments = mappedRequests
      .filter(r => r.status === 'PAID')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    // 9. Properties portfolio summary (top 3 properties)
    const topProperties = allAccessibleProperties.slice(0, 3);
    const propertiesSummary = await Promise.all(topProperties.map(async (prop) => {
      const propUnits = units.filter(u => u.propertyId === prop.id);
      const occupiedCount = propUnits.filter(u => u.status === 'OCCUPIED').length;
      const occupancyRate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0;
      
      let signedImageUrl = prop.imageUrl;
      if (prop.imageUrl) {
        try {
          signedImageUrl = await this.s3Service.getDownloadUrl(prop.imageUrl);
        } catch (e) {
          console.error('Error signing property image url in dashboard summary:', e);
        }
      }

      return {
        uuid: prop.uuid,
        name: prop.name,
        area: prop.area,
        state: prop.state,
        imageUrl: signedImageUrl,
        totalUnits: propUnits.length,
        occupancyRate
      };
    }));

    return {
      totalUnits,
      vacantUnits,
      occupiedUnits,
      activeTenants: activeTenantsCount,
      pendingInvites,
      pendingBalance,
      totalRevenue,
      overduePayments,
      upcomingPayments,
      completedPayments,
      properties: propertiesSummary,
      propertiesCount,
      hasProperties: propertiesCount > 0,
      openRequestsCount: paymentRequests.filter(r => r.status !== 'PAID').length
    };
  }
}
