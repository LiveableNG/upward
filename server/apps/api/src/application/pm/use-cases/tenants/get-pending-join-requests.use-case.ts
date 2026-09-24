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

    // Pre-fetch PM registered accounts & profile for destination audit
    const pmManualAccounts = await this.prisma.upward_manual_account.findMany({
      where: { pmId: ownerPmId },
    });
    const pmRecord = await this.prisma.upward_property_manager.findUnique({
      where: { id: ownerPmId },
    });

    const pmAccountNumbers = new Set(
      pmManualAccounts
        .map((a: any) => a.accountNumber)
        .concat(pmRecord?.accountNumber ? [pmRecord.accountNumber] : [])
        .filter(Boolean)
    );

    const results = await Promise.all(
      pendingLogs.map(async (log: any) => {
        const metadata = log.metadata as any;
        let tenantEmail = '';
        try {
          tenantEmail = this.encryption.decrypt(metadata.userEmail);
        } catch {
          tenantEmail = metadata.userEmail || '';
        }
        const emailHash = this.encryption.hash(tenantEmail.toLowerCase());

        let tenantFirstName = '';
        try {
          tenantFirstName = this.encryption.decrypt(metadata.userFirstName);
        } catch {
          tenantFirstName = metadata.userFirstName || '';
        }

        let tenantLastName = '';
        try {
          tenantLastName = this.encryption.decrypt(metadata.userLastName);
        } catch {
          tenantLastName = metadata.userLastName || '';
        }

        let tenantPhone = null;
        if (metadata.userPhone) {
          try {
            tenantPhone = this.encryption.decrypt(metadata.userPhone);
          } catch {
            tenantPhone = metadata.userPhone;
          }
        }

        // Look up if this PM already has this tenant assigned to a unit
        const pmTenant = await this.prisma.upward_pm_tenant.findFirst({
          where: {
            pmId: ownerPmId,
            emailHash,
          },
          include: {
            units: {
              include: {
                property: true,
              },
            },
          },
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
              isSynced: activeUnit.isSynced,
            };
          }
        }

        // Look up tenant's live Upward user & user_property
        let upwardUser: any = null;
        if (metadata.userUuid) {
          upwardUser = await this.prisma.upward_user.findUnique({
            where: { uuid: metadata.userUuid },
          });
        }
        if (!upwardUser && tenantEmail) {
          upwardUser = await this.prisma.upward_user.findFirst({
            where: { email: tenantEmail },
          });
        }

        let userProperty: any = null;
        if (upwardUser) {
          userProperty = await this.prisma.upward_user_property.findFirst({
            where: {
              userId: upwardUser.id,
              pmId: ownerPmId,
            },
            include: {
              location: true,
              manualAccount: true,
              subaccount: true,
              tenancyPeriods: {
                orderBy: { startDate: 'desc' },
              },
              paymentRequests: {
                where: { status: { in: ['PENDING', 'PARTIAL'] } },
                include: {
                  lineItemRecords: true,
                  subaccount: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              platformRentPayments: {
                orderBy: { paymentDate: 'desc' },
              },
            },
          });

          if (!userProperty) {
            userProperty = await this.prisma.upward_user_property.findFirst({
              where: {
                userId: upwardUser.id,
                isPastTenancy: false,
              },
              include: {
                location: true,
                manualAccount: true,
                subaccount: true,
                tenancyPeriods: {
                  orderBy: { startDate: 'desc' },
                },
                paymentRequests: {
                  where: { status: { in: ['PENDING', 'PARTIAL'] } },
                  include: {
                    lineItemRecords: true,
                    subaccount: true,
                  },
                  orderBy: { createdAt: 'desc' },
                },
                platformRentPayments: {
                  orderBy: { paymentDate: 'desc' },
                },
              },
              orderBy: { createdAt: 'desc' },
            });
          }
        }

        let platformActivity = null;
        let activePaymentRequest = null;
        let paymentDestinationAudit = null;

        if (userProperty) {
          const currentTenure = {
            rentStartDate: userProperty.rentStartDate,
            rentEndDate: userProperty.rentEndDate,
            rentAmount: userProperty.rentAmount,
            rentType: userProperty.rentType,
            amountPaid: userProperty.amountPaid,
            amountRemaining: userProperty.amountRemaining,
            isFirstRent: userProperty.isFirstRent,
          };

          const platformPayments = (userProperty.platformRentPayments || []).map((p: any) => ({
            id: p.id,
            uuid: p.uuid,
            amount: p.amount,
            paymentDate: p.paymentDate,
            method: p.method,
            status: p.status,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
          }));

          const totalPlatformPaid = platformPayments
            .filter((p: any) => p.status === 'SUCCESS')
            .reduce((sum: number, p: any) => sum + p.amount, 0);

          const settledPeriodsCount = (userProperty.tenancyPeriods || []).filter(
            (tp: any) => tp.status === 'SETTLED'
          ).length;

          platformActivity = {
            currentTenure,
            platformPayments,
            totalPlatformPaid,
            settledPeriodsCount,
          };

          const activePR = (userProperty.paymentRequests || []).find(
            (pr: any) => pr.status === 'PENDING' || pr.status === 'PARTIAL'
          );

          if (activePR) {
            activePaymentRequest = {
              id: activePR.id,
              uuid: activePR.uuid,
              amount: activePR.amount,
              amountPaid: activePR.amountPaid,
              amountRemaining: Math.max(0, activePR.amount - activePR.amountPaid),
              dueDate: activePR.dueDate,
              rentStartDate: activePR.rentStartDate,
              rentEndDate: activePR.rentEndDate,
              status: activePR.status,
              description: activePR.description,
              lineItems: (activePR.lineItemRecords || []).map((li: any) => ({
                id: li.id,
                name: li.name,
                totalAmount: li.totalAmount,
                amountPaid: li.amountPaid,
                status: li.status,
              })),
            };
          }

          const propManualAccount = userProperty.manualAccount;
          let isRegisteredPmAccount = false;
          let bankName = propManualAccount?.bankName || pmRecord?.bankName || null;
          let accountNumber = propManualAccount?.accountNumber || pmRecord?.accountNumber || null;

          if (propManualAccount) {
            if (propManualAccount.pmId === ownerPmId || pmAccountNumbers.has(propManualAccount.accountNumber)) {
              isRegisteredPmAccount = true;
            }
          } else if (userProperty.pmId === ownerPmId) {
            isRegisteredPmAccount = true;
          }

          const maskedAccountNumber = accountNumber
            ? `****${accountNumber.slice(-4)}`
            : null;

          let warningMessage: string | null = null;
          if (!isRegisteredPmAccount && totalPlatformPaid > 0) {
            warningMessage = `Caution: Platform payments (₦${totalPlatformPaid.toLocaleString()}) were routed to an account (${bankName || 'Unknown Bank'} · ${maskedAccountNumber || 'Unknown'}) not verified in your PM payout settings. Verify funds in your bank account before acknowledging receipt.`;
          }

          paymentDestinationAudit = {
            isRegisteredPmAccount,
            bankName,
            maskedAccountNumber,
            warningMessage,
          };
        }

        return {
          uuid: log.uuid,
          tenantFirstName,
          tenantLastName,
          tenantEmail,
          tenantPhone,
          tenantUuid: metadata.userUuid,
          unitDetails: metadata.unitDetails,
          originalDeclaration: metadata.unitDetails,
          platformActivity,
          activePaymentRequest,
          paymentDestinationAudit,
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

