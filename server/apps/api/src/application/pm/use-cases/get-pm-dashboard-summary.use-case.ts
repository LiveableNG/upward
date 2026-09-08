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

  private calculateLapsedPeriods(rentDueDate: Date, today: Date, rentType?: string | null): number {
    if (rentDueDate >= today) return 0;
    const type = rentType || 'Monthly';
    if (type === 'Monthly') {
      const months = (today.getFullYear() - rentDueDate.getFullYear()) * 12 + (today.getMonth() - rentDueDate.getMonth());
      return Math.max(1, months);
    } else if (type === 'Annually' || type === 'Yearly') {
      const diffYears = (today.getTime() - rentDueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return Math.max(1, Math.ceil(diffYears));
    } else if (type === 'Quarterly') {
      const months = (today.getFullYear() - rentDueDate.getFullYear()) * 12 + (today.getMonth() - rentDueDate.getMonth());
      return Math.max(1, Math.ceil(months / 3));
    }
    return 1;
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

    // 7. Fetch all recorded rent payments (actual collections)
    const rentPayments = await this.prisma.upward_pm_rent_payment.findMany({
      where: {
        unit: { propertyId: { in: accessiblePropertyIds } },
        status: 'SUCCESS'
      },
      include: {
        unit: { include: { property: true } },
        tenant: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    // 8. Fetch payment requests
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

    // Map payment requests
    const mappedRequests = paymentRequests.map(r => ({
      uuid: r.uuid,
      amount: r.amount,
      amountPaid: r.amountPaid,
      status: r.status,
      dueDate: r.dueDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      paymentDate: r.updatedAt || r.createdAt,
      periodStart: r.rentStartDate || null,
      periodEnd: r.rentEndDate || null,
      method: 'Online',
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

    // Map rent payments into completed payment structures
    const mappedRentPayments = rentPayments.map(p => ({
      uuid: p.uuid,
      amount: p.amount,
      amountPaid: p.amount,
      status: 'PAID',
      dueDate: p.paymentDate,
      createdAt: p.createdAt,
      updatedAt: p.paymentDate || p.createdAt,
      paymentDate: p.paymentDate,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      method: p.method || 'Bank Transfer',
      notes: p.notes,
      coreRequestUuid: null,
      tenant: this.decryptTenant(p.tenant),
      unit: {
        id: p.unit.id,
        uuid: p.unit.uuid,
        unitName: p.unit.unitName,
        isSynced: p.unit.isSynced,
        rentAmount: p.unit.rentAmount,
        rentStartDate: p.unit.rentStartDate,
        rentDueDate: p.unit.rentDueDate,
        rentType: p.unit.rentType,
        managementFee: p.unit.managementFee,
        property: {
          id: p.unit.property.id,
          uuid: p.unit.property.uuid,
          name: p.unit.property.name
        }
      }
    }));

    // Find active payment requests (pending / partial)
    const activeRequests = mappedRequests.filter(r => r.status === 'PENDING' || r.status === 'PARTIAL');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply Rent Expiry Date Filters (if startDate and/or endDate supplied)
    let filterStart: Date | null = startDate ? new Date(startDate) : null;
    let filterEnd: Date | null = endDate ? new Date(endDate) : null;

    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd) filterEnd.setHours(23, 59, 59, 999);

    // Combine completed payments from rentPayments and any standalone paid payment requests
    const rentPaymentUuids = new Set(mappedRentPayments.map(p => p.uuid));
    const standalonePaidRequests = mappedRequests.filter(r => r.status === 'PAID' && !rentPaymentUuids.has(r.uuid));
    let completedPayments = [...mappedRentPayments, ...standalonePaidRequests]
      .sort((a, b) => new Date(b.paymentDate || b.updatedAt || b.createdAt).getTime() - new Date(a.paymentDate || a.updatedAt || a.createdAt).getTime());

    // Filter completed payments by payment date if date filters applied
    if (filterStart || filterEnd) {
      completedPayments = completedPayments.filter(p => {
        const d = new Date(p.paymentDate || p.updatedAt || p.createdAt);
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
      });
    }

    // Calculate total rent collected
    const totalCollected = completedPayments.reduce((sum, p) => sum + (p.amountPaid || p.amount || 0), 0);

    // Find unbilled units: occupied units with tenant and rentDueDate that don't have an active pending payment request
    const unbilledUnits = units.filter(u => {
      if (u.status !== 'OCCUPIED' || !u.tenantId || !u.rentDueDate) return false;
      return !activeRequests.some(r => r.unit.id === u.id);
    });

    const unbilledArrears: any[] = [];
    const unbilledUpcoming: any[] = [];

    for (const u of unbilledUnits) {
      const property = allAccessibleProperties.find(p => p.id === u.propertyId);
      const dueDate = new Date(u.rentDueDate!);
      dueDate.setHours(0, 0, 0, 0);

      const propData = property ? { id: property.id, uuid: property.uuid, name: property.name } : null;
      const unitData = {
        id: u.id,
        uuid: u.uuid,
        unitName: u.unitName,
        isSynced: u.isSynced,
        rentAmount: u.rentAmount,
        rentStartDate: u.rentStartDate,
        rentDueDate: u.rentDueDate,
        rentType: u.rentType,
        managementFee: u.managementFee,
        property: propData
      };

      if (dueDate < today) {
        // Overdue tenancy in Arrears
        const lapsedPeriods = this.calculateLapsedPeriods(dueDate, today, u.rentType);
        const overdueAmount = lapsedPeriods * u.rentAmount;

        unbilledArrears.push({
          uuid: u.uuid,
          amount: overdueAmount,
          amountPaid: 0,
          status: 'UNBILLED',
          dueDate: u.rentDueDate!,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          coreRequestUuid: null,
          tenant: this.decryptTenant(u.tenant),
          unit: unitData,
          isUnbilled: true,
          lapsedPeriods
        });
      } else {
        // Upcoming renewal
        const unitPayments = rentPayments.filter(p => p.unitId === u.id);
        const advancePayments = unitPayments.filter(p => p.periodStart && new Date(p.periodStart) >= dueDate);
        const advancePaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingOwing = Math.max(0, u.rentAmount - advancePaid);

        unbilledUpcoming.push({
          uuid: u.uuid,
          amount: u.rentAmount,
          amountPaid: advancePaid,
          status: advancePaid >= u.rentAmount ? 'PAID' : (advancePaid > 0 ? 'PARTIAL' : 'UNBILLED'),
          dueDate: u.rentDueDate!,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          coreRequestUuid: null,
          tenant: this.decryptTenant(u.tenant),
          unit: unitData,
          isUnbilled: true,
          remainingOwing
        });
      }
    }

    // Active PRs separated into overdue and upcoming
    const activeOverdueRequests = activeRequests.filter(r => new Date(r.dueDate) < today);
    const activeUpcomingRequests = activeRequests.filter(r => new Date(r.dueDate) >= today);

    let overduePayments = [...activeOverdueRequests, ...unbilledArrears]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    let upcomingPayments = [...activeUpcomingRequests, ...unbilledUpcoming]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Apply date filters to Arrears and Upcoming if specified
    if (filterStart || filterEnd) {
      overduePayments = overduePayments.filter(r => {
        const d = new Date(r.dueDate);
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
      });

      upcomingPayments = upcomingPayments.filter(r => {
        const d = new Date(r.dueDate);
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
      });
    }

    // Total Owing calculation:
    // 1) All arrears (past due overdue amounts)
    const arrearsOwing = overduePayments.reduce((sum, r) => sum + (r.amount - (r.amountPaid || 0)), 0);
    // 2) If looking at 'all' (all expiry dates), total owing is arrears + active pending invoices
    // If looking at a date preset / range, total owing includes upcoming renewals due within that window
    let upcomingOwing = 0;
    if (filterStart || filterEnd) {
      upcomingOwing = upcomingPayments.reduce((sum, r) => {
        const owing = r.remainingOwing !== undefined ? r.remainingOwing : (r.amount - (r.amountPaid || 0));
        return sum + owing;
      }, 0);
    } else {
      upcomingOwing = activeUpcomingRequests.reduce((sum, r) => sum + (r.amount - (r.amountPaid || 0)), 0);
    }

    const totalOwing = arrearsOwing + upcomingOwing;
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
      openRequestsCount: overduePayments.length + upcomingPayments.length
    };
  }
}
