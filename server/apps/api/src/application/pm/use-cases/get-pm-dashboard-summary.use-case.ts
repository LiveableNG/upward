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
      commercialName: tenant.commercialNameEncrypted ? this.encryption.decrypt(tenant.commercialNameEncrypted) : null,
      email: tenant.emailEncrypted ? this.encryption.decrypt(tenant.emailEncrypted) : null,
      phone: tenant.phoneEncrypted ? this.encryption.decrypt(tenant.phoneEncrypted) : null,
      inviteStatus: tenant.inviteStatus,
      inviteSentAt: tenant.inviteSentAt,
      hasReceivedWelcomeTemplate: tenant.hasReceivedWelcomeTemplate ?? false,
    };
  }

  async execute(pmId: number, query: any = {}) {
    const { startDate, endDate, managerUuid, propertyUuid } = query || {};

    // 1. Get owned property IDs
    const ownedProps = await this.prisma.upward_pm_property.findMany({
      where: { pmId },
      select: { id: true, uuid: true, name: true }
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
      select: { id: true, uuid: true, name: true }
    }) : [];
    const collabOwnerPropertyIds = collabOwnerProps.map(p => p.id);

    // 3. Get custom property collaborations
    const propCollabs = await (this.prisma as any).upward_pm_property_collaboration.findMany({
      where: { collaboratorPmId: pmId },
      select: { propertyId: true }
    });
    const customCollabPropertyIds = propCollabs.map((pc: any) => pc.propertyId);

    // Consolidated list of accessible property IDs
    let accessiblePropertyIds = Array.from(new Set([
      ...ownedPropertyIds,
      ...collabOwnerPropertyIds,
      ...customCollabPropertyIds
    ]));

    // Determine user role (Admin vs Manager)
    const isCompanyAdmin = ownedProps.length > 0 || ownerPmIds.length === 0;

    // Handle Manager Filter (if Admin filters by specific Manager)
    let filteredManagerName = null;
    if (isCompanyAdmin && managerUuid) {
      const targetManager = await (this.prisma as any).upward_property_manager.findUnique({
        where: { uuid: managerUuid },
        select: { id: true, firstName: true, lastName: true, businessName: true }
      });

      if (targetManager) {
        filteredManagerName = `${this.encryption.decrypt(targetManager.firstName) || ''} ${this.encryption.decrypt(targetManager.lastName) || ''}`.trim() || targetManager.businessName;
        // Get custom property collabs for this manager
        const managerPropCollabs = await (this.prisma as any).upward_pm_property_collaboration.findMany({
          where: { collaboratorPmId: targetManager.id, ownerPmId: pmId },
          select: { propertyId: true }
        });
        const managerPropIds = managerPropCollabs.map((pc: any) => pc.propertyId);

        // Check if manager has ALL access
        const managerTeamCollab = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
          where: { collaboratorPmId: targetManager.id, ownerPmId: pmId, status: 'ACCEPTED' },
          select: { accessLevel: true }
        });

        if (managerTeamCollab?.accessLevel === 'ALL') {
          // Keep all owned property IDs
        } else {
          accessiblePropertyIds = accessiblePropertyIds.filter(id => managerPropIds.includes(id));
        }
      }
    }

    // Handle Specific Property Filter
    if (propertyUuid) {
      const targetProp = await this.prisma.upward_pm_property.findUnique({
        where: { uuid: propertyUuid },
        select: { id: true }
      });
      if (targetProp && accessiblePropertyIds.includes(targetProp.id)) {
        accessiblePropertyIds = [targetProp.id];
      }
    }

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
          { units: { some: { propertyId: { in: accessiblePropertyIds } } } }
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
        unit: { propertyId: { in: accessiblePropertyIds } }
      },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        paymentRequest: true
      },
      orderBy: { createdAt: 'desc' }
    });

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
        isSynced: r.unit.isSynced,
        rentAmount: r.unit.rentAmount,
        rentStartDate: r.unit.rentStartDate,
        rentDueDate: r.unit.rentDueDate,
        rentType: r.unit.rentType,
        managementFee: r.unit.managementFee,
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
          isSynced: u.isSynced,
          rentAmount: u.rentAmount,
          rentStartDate: u.rentStartDate,
          rentDueDate: u.rentDueDate,
          rentType: u.rentType,
          managementFee: u.managementFee,
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
    let allArrearsAndUpcoming = [...activeRequests, ...unbilledRequests];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply Rent Expiry Date Filters (if startDate and/or endDate supplied)
    let filterStart: Date | null = startDate ? new Date(startDate) : null;
    let filterEnd: Date | null = endDate ? new Date(endDate) : null;

    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd) filterEnd.setHours(23, 59, 59, 999);

    if (filterStart || filterEnd) {
      allArrearsAndUpcoming = allArrearsAndUpcoming.filter(r => {
        const d = new Date(r.dueDate);
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
      });
    }

    // Overdue payments (due date before today)
    const overduePayments = allArrearsAndUpcoming
      .filter(r => new Date(r.dueDate) < today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Upcoming payments (due date today or after)
    const upcomingPayments = allArrearsAndUpcoming
      .filter(r => new Date(r.dueDate) >= today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Completed payments (payment request PAID status)
    let completedPayments = mappedRequests
      .filter(r => r.status === 'PAID')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    if (filterStart || filterEnd) {
      completedPayments = completedPayments.filter(r => {
        const d = new Date(r.dueDate);
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
      });
    }

    // Calculate Collection Health Metrics for Selected Scope & Date Range
    const totalCollected = completedPayments.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalOwing = allArrearsAndUpcoming.reduce((sum, r) => sum + (r.amount - r.amountPaid), 0);
    const totalExpected = totalCollected + totalOwing;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 100;

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
      isCompanyAdmin,
      filteredManagerName,
      totalUnits,
      vacantUnits,
      occupiedUnits,
      activeTenants: activeTenantsCount,
      pendingInvites,
      pendingBalance: totalOwing,
      totalRevenue: totalCollected,
      totalCollected,
      totalOwing,
      collectionRate,
      overduePayments,
      upcomingPayments,
      completedPayments,
      properties: propertiesSummary,
      allAccessibleProperties: allAccessibleProperties.map(p => ({ uuid: p.uuid, name: p.name })),
      propertiesCount,
      hasProperties: propertiesCount > 0,
      openRequestsCount: allArrearsAndUpcoming.length
    };
  }
}
