import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';

export interface DailyBriefingResult {
  totalEligible: number;
  sentCount: number;
  suppressedCount: number;
  errorCount: number;
}


export function getLagosYesterdayRange(referenceDate: Date = new Date()): {
  startOfYesterday: Date;
  endOfYesterday: Date;
  startOfToday: Date;
  yesterdayFormatted: string;
} {
  const lagosOffsetMs = 60 * 60 * 1000;
  const lagosNow = new Date(referenceDate.getTime() + lagosOffsetMs);

  const todayYear = lagosNow.getUTCFullYear();
  const todayMonth = lagosNow.getUTCMonth();
  const todayDay = lagosNow.getUTCDate();

  const startOfTodayUtcMs = Date.UTC(todayYear, todayMonth, todayDay) - lagosOffsetMs;
  const startOfToday = new Date(startOfTodayUtcMs);
  const startOfYesterday = new Date(startOfTodayUtcMs - 24 * 60 * 60 * 1000);
  const endOfYesterday = new Date(startOfTodayUtcMs - 1);

  const yesterdayLagos = new Date(startOfYesterday.getTime() + lagosOffsetMs);
  const yesterdayFormatted = yesterdayLagos.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return { startOfYesterday, endOfYesterday, startOfToday, yesterdayFormatted };
}

@Injectable()
export class SendPmDailyBriefingUseCase {
  private readonly logger = new Logger(SendPmDailyBriefingUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(targetDate?: Date): Promise<DailyBriefingResult> {
    const { startOfYesterday, startOfToday, yesterdayFormatted } = getLagosYesterdayRange(targetDate || new Date());
    const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim();

    this.logger.log(`Starting Upward PM Daily Morning Briefing run for ${yesterdayFormatted} (window: ${startOfYesterday.toISOString()} -> ${startOfToday.toISOString()})`);

    // 1. Fetch all active, non-blocked property managers
    const managers = await this.prisma.upward_property_manager.findMany({
      where: {
        isBlocked: false,
        disabledAt: null,
      },
    });

    let sentCount = 0;
    let suppressedCount = 0;
    let errorCount = 0;

    for (const pm of managers) {
      try {
        // Preference check: Skip if explicitly opted out
        if ((pm as any).dailyBriefingEnabled === false) {
          this.logger.debug(`PM ${pm.id} has disabled the Daily Morning Briefing. Skipping.`);
          continue;
        }

        const pmEmail = pm.email ? this.encryption.decrypt(pm.email) : null;
        if (!pmEmail || pmEmail.endsWith('@upward.com')) {
          continue;
        }

        const pmFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName) : '';
        const pmLastName = pm.lastName ? this.encryption.decrypt(pm.lastName) : '';
        const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : '';
        const pmName = decryptedBusinessName || `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager';
        const pmPhone = pm.phone ? this.encryption.decrypt(pm.phone).trim() : null;


        const collections = await this.prisma.upward_pm_rent_payment.findMany({
          where: {
            unit: { property: { pmId: pm.id } },
            status: 'SUCCESS',
            paymentDate: {
              gte: startOfYesterday,
              lt: startOfToday,
            },
          },
          include: {
            unit: {
              include: { property: true },
            },
            tenant: true,
          },
          orderBy: { paymentDate: 'desc' },
        });

        const totalCollectedYesterday = collections.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // -------------------------------------------------------------
        // Query 2: Tenant Onboarding / Invitations
        // -------------------------------------------------------------
        // A. Newly accepted invites yesterday
        const newlyAcceptedTenants = await (this.prisma as any).upward_pm_tenant.findMany({
          where: {
            pmId: pm.id,
            inviteAcceptedAt: {
              gte: startOfYesterday,
              lt: startOfToday,
            },
          },
          include: {
            units: { include: { property: true } },
          },
        });

        // B. New bulk invites dispatched yesterday
        const dispatchedInvitesCount = await this.prisma.upward_pm_bulk_invite.count({
          where: {
            pmId: pm.id,
            createdAt: {
              gte: startOfYesterday,
              lt: startOfToday,
            },
          },
        });

        // -------------------------------------------------------------
        // Query 3: Pending Action Items (Point-in-time Snapshot)
        // -------------------------------------------------------------
        // A. Pending tenant join requests
        const pendingJoinRequests = await this.prisma.upward_tenant_join_request.findMany({
          where: {
            ownerPmId: pm.id,
            status: 'PENDING',
          },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        });

        // B. Pending rent history / credibility requests matching PM phone/email
        const allPendingCredibility = await this.prisma.upward_credibility_request.findMany({
          where: { status: 'PENDING' },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        });

        const pendingCredibilityRequests = allPendingCredibility.filter((req: any) => {
          try {
            if (req.email && pmEmail) {
              const dec = this.encryption.decrypt(req.email).toLowerCase().trim();
              if (dec === pmEmail.toLowerCase().trim()) return true;
            }
            if (req.phone && pmPhone) {
              const decPhone = this.encryption.decrypt(req.phone).trim();
              if (decPhone === pmPhone) return true;
            }
          } catch {
            return false;
          }
          return false;
        });

        // C. Pending employee approval requests (unit/property changes)
        const pendingApprovalRequests = await this.prisma.upward_pm_approval_request.findMany({
          where: {
            ownerPmId: pm.id,
            status: 'PENDING',
          },
        });

        // -------------------------------------------------------------
        // Query 4: Employee & Team Activity Yesterday (Role-Aware)
        // -------------------------------------------------------------
        const employeeCount = await (this.prisma as any).upward_pm_employee.count({
          where: { ownerPmId: pm.id },
        });

        let employeeActivities: any[] = [];
        if (employeeCount > 0) {
          employeeActivities = await (this.prisma as any).upward_pm_activity_log.findMany({
            where: {
              ownerPmId: pm.id,
              employeeId: { not: null },
              createdAt: {
                gte: startOfYesterday,
                lt: startOfToday,
              },
            },
            include: {
              employee: {
                select: { firstName: true, lastName: true, jobTitle: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 15,
          });
        }

        // -------------------------------------------------------------
        // Query 5: Urgent Rent Alerts (Upcoming & Overdue Rents)
        // -------------------------------------------------------------
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const occupiedUnits = await this.prisma.upward_pm_unit.findMany({
          where: {
            property: { pmId: pm.id },
            status: 'OCCUPIED',
            tenantId: { not: null },
            rentDueDate: { not: null },
          },
          include: {
            tenant: true,
            property: true,
          },
        });

        const upcomingRentItems: any[] = [];
        const overdueRentItems: any[] = [];

        for (const unit of occupiedUnits) {
          const tenantName = this.formatTenantName(unit.tenant);
          const dueDate = new Date(unit.rentDueDate!);
          const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1 || diffDays === 3) {
            upcomingRentItems.push({
              tenantName,
              unitName: unit.unitName,
              propertyName: unit.property?.name || 'N/A',
              amount: unit.rentAmount,
              dueLabel: diffDays === 1 ? 'Tomorrow' : 'In 3 days',
              dueDate: dueDate.toDateString(),
            });
          } else if (diffDays < 0) {
            const daysOverdue = Math.abs(diffDays);
            if (daysOverdue === 1 || daysOverdue === 7 || daysOverdue === 14) {
              overdueRentItems.push({
                tenantName,
                unitName: unit.unitName,
                propertyName: unit.property?.name || 'N/A',
                amount: unit.rentAmount,
                dueLabel: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
                dueDate: dueDate.toDateString(),
              });
            }
          }
        }

        // -------------------------------------------------------------
        // Zero-Activity Suppression Check
        // -------------------------------------------------------------
        const totalPendingActions =
          pendingJoinRequests.length + pendingCredibilityRequests.length + pendingApprovalRequests.length;

        const hasActivity =
          collections.length > 0 ||
          newlyAcceptedTenants.length > 0 ||
          dispatchedInvitesCount > 0 ||
          totalPendingActions > 0 ||
          employeeActivities.length > 0 ||
          upcomingRentItems.length > 0 ||
          overdueRentItems.length > 0;

        if (!hasActivity) {
          this.logger.log(`[PmDailyBriefing] Zero activity or alerts for PM ${pm.id} on ${yesterdayFormatted}. Briefing suppressed.`);
          suppressedCount++;
          continue;
        }

        // -------------------------------------------------------------
        // Build & Send Upward-Branded HTML Briefing Email
        // -------------------------------------------------------------
        const emailHtml = this.buildBriefingHtml({
          pmName,
          yesterdayFormatted,
          baseUrl,
          totalCollectedYesterday,
          collections,
          newlyAcceptedTenants,
          dispatchedInvitesCount,
          pendingJoinRequests,
          pendingCredibilityRequests,
          pendingApprovalRequests,
          employeeActivities,
          upcomingRentItems,
          overdueRentItems,
        });

        const subjectBadge = totalCollectedYesterday > 0
          ? `₦${totalCollectedYesterday.toLocaleString()} Collected`
          : totalPendingActions > 0
          ? `${totalPendingActions} Action Item${totalPendingActions === 1 ? '' : 's'}`
          : `${overdueRentItems.length + upcomingRentItems.length} Rent Alerts`;

        await this.unifiedCommService.processCommunication({
          recipientEmail: pmEmail,
          recipientName: pmName,
          recipientRole: 'PM',
          pmUuid: pm.uuid,
          type: 'PM_DAILY_BRIEFING',
          context: {
            htmlOverride: emailHtml,
            title: `[Upward] Morning Briefing (${yesterdayFormatted}): ${subjectBadge}`,
          },
        });

        sentCount++;
        this.logger.log(`[PmDailyBriefing] Briefing delivered to PM ${pm.id} (${pmEmail})`);
      } catch (err: any) {
        errorCount++;
        this.logger.error(`[PmDailyBriefing] Failed to process briefing for PM ${pm.id}: ${err?.message}`);
      }
    }

    this.logger.log(
      `[PmDailyBriefing] Finished run for ${yesterdayFormatted}: ${sentCount} sent, ${suppressedCount} suppressed, ${errorCount} errors (Total eligible: ${managers.length})`,
    );

    return {
      totalEligible: managers.length,
      sentCount,
      suppressedCount,
      errorCount,
    };
  }

  private formatTenantName(tenant: any): string {
    if (!tenant) return 'Tenant';
    const commercial = tenant.commercialNameEncrypted ? this.encryption.decrypt(tenant.commercialNameEncrypted) : '';
    const first = tenant.firstNameEncrypted ? this.encryption.decrypt(tenant.firstNameEncrypted) : '';
    const last = tenant.lastNameEncrypted ? this.encryption.decrypt(tenant.lastNameEncrypted) : '';
    return commercial || `${first} ${last}`.trim() || 'Tenant';
  }

  private buildBriefingHtml(data: {
    pmName: string;
    yesterdayFormatted: string;
    baseUrl: string;
    totalCollectedYesterday: number;
    collections: any[];
    newlyAcceptedTenants: any[];
    dispatchedInvitesCount: number;
    pendingJoinRequests: any[];
    pendingCredibilityRequests: any[];
    pendingApprovalRequests: any[];
    employeeActivities: any[];
    upcomingRentItems: any[];
    overdueRentItems: any[];
  }): string {
    const totalPendingActions =
      data.pendingJoinRequests.length +
      data.pendingCredibilityRequests.length +
      data.pendingApprovalRequests.length;

    // Collections Table Rows
    const collectionRows = data.collections
      .map((c) => {
        const tenantName = this.formatTenantName(c.tenant);
        const unitName = c.unit?.unitName || 'Unit';
        const propertyName = c.unit?.property?.name || 'Property';
        const method = c.method || 'Transfer';
        return `
          <tr style="border-bottom: 1px solid #f0f0dc; font-size: 13px;">
            <td style="padding: 10px 12px;">
              <strong style="color: #1b4332;">${tenantName}</strong><br/>
              <span style="font-size: 11px; color: #607366;">${unitName} &bull; ${propertyName}</span>
            </td>
            <td style="padding: 10px 12px; color: #506256; font-size: 12px;">${method}</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1b4332;">
              NGN ${Number(c.amount || 0).toLocaleString()}
            </td>
          </tr>
        `;
      })
      .join('');

    // Onboarding Rows
    const onboardingRows = data.newlyAcceptedTenants
      .map((t) => {
        const name = this.formatTenantName(t);
        const unitInfo = t.units && t.units.length > 0
          ? `${t.units[0].unitName} (${t.units[0].property?.name || ''})`
          : 'Pending Unit Assignment';
        return `
          <tr style="border-bottom: 1px solid #f0f0dc; font-size: 13px;">
            <td style="padding: 10px 12px;">
              <strong style="color: #1b4332;">${name}</strong><br/>
              <span style="font-size: 11px; color: #607366;">${unitInfo}</span>
            </td>
            <td style="padding: 10px 12px; text-align: right;">
              <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                Connected
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    // Pending Action Item Rows
    const pendingActionRows: string[] = [];

    data.pendingJoinRequests.forEach((req) => {
      let userName = 'Prospective Tenant';
      if (req.user) {
        const f = req.user.firstName ? this.encryption.decrypt(req.user.firstName) : '';
        const l = req.user.lastName ? this.encryption.decrypt(req.user.lastName) : '';
        userName = `${f} ${l}`.trim() || 'Prospective Tenant';
      }
      pendingActionRows.push(`
        <tr style="border-bottom: 1px solid #f0f0dc; font-size: 13px;">
          <td style="padding: 10px 12px;">
            <strong style="color: #1b4332;">${userName}</strong><br/>
            <span style="font-size: 11px; color: #607366;">Requested to link unit at ${req.address || 'Property'}</span>
          </td>
          <td style="padding: 10px 12px; text-align: right;">
            <a href="${data.baseUrl}/requests" style="display: inline-block; background-color: #1b4332; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">Review</a>
          </td>
        </tr>
      `);
    });

    data.pendingCredibilityRequests.forEach((req) => {
      let userName = 'Tenant';
      if (req.user) {
        const f = req.user.firstName ? this.encryption.decrypt(req.user.firstName) : '';
        const l = req.user.lastName ? this.encryption.decrypt(req.user.lastName) : '';
        userName = `${f} ${l}`.trim() || 'Tenant';
      }
      pendingActionRows.push(`
        <tr style="border-bottom: 1px solid #f0f0dc; font-size: 13px;">
          <td style="padding: 10px 12px;">
            <strong style="color: #1b4332;">${userName}</strong><br/>
            <span style="font-size: 11px; color: #607366;">Requested Rent History Verification</span>
          </td>
          <td style="padding: 10px 12px; text-align: right;">
            <a href="${data.baseUrl}/requests" style="display: inline-block; background-color: #8A4A2A; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">Fulfill</a>
          </td>
        </tr>
      `);
    });

    data.pendingApprovalRequests.forEach((req) => {
      pendingActionRows.push(`
        <tr style="border-bottom: 1px solid #f0f0dc; font-size: 13px;">
          <td style="padding: 10px 12px;">
            <strong style="color: #1b4332;">Staff Approval Request</strong><br/>
            <span style="font-size: 11px; color: #607366;">${req.type?.replace(/_/g, ' ') || 'Action'} on ${req.propertyName || 'Property'}</span>
          </td>
          <td style="padding: 10px 12px; text-align: right;">
            <a href="${data.baseUrl}/settings?tab=approvals" style="display: inline-block; background-color: #1b4332; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">Approve</a>
          </td>
        </tr>
      `);
    });

    // Employee Activities Rows
    const employeeRows = data.employeeActivities
      .map((log) => {
        const f = log.employee?.firstName ? this.encryption.decrypt(log.employee.firstName) : '';
        const l = log.employee?.lastName ? this.encryption.decrypt(log.employee.lastName) : '';
        const empName = `${f} ${l}`.trim() || 'Staff Officer';
        const role = log.employee?.jobTitle || 'Property Officer';
        return `
          <tr style="border-bottom: 1px solid #f0f0dc; font-size: 13px;">
            <td style="padding: 8px 12px;">
              <strong style="color: #1b4332;">${empName}</strong> <span style="font-size: 11px; color: #88998e;">(${role})</span><br/>
              <span style="font-size: 12px; color: #506256;">${log.description || log.action}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    // Overdue Rent Rows
    const overdueRows = data.overdueRentItems
      .map((item) => `
        <tr style="border-bottom: 1px solid #fee2e2; font-size: 13px;">
          <td style="padding: 10px 12px;">
            <strong style="color: #2f3e35;">${item.tenantName}</strong><br/>
            <span style="font-size: 11px; color: #607366;">${item.unitName} &bull; ${item.propertyName}</span>
          </td>
          <td style="padding: 10px 12px; color: #b91c1c; font-weight: 600;">${item.dueLabel}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #991b1b;">
            NGN ${Number(item.amount || 0).toLocaleString()}
          </td>
        </tr>
      `)
      .join('');

    // Upcoming Rent Rows
    const upcomingRows = data.upcomingRentItems
      .map((item) => `
        <tr style="border-bottom: 1px solid #fef3c7; font-size: 13px;">
          <td style="padding: 10px 12px;">
            <strong style="color: #2f3e35;">${item.tenantName}</strong><br/>
            <span style="font-size: 11px; color: #607366;">${item.unitName} &bull; ${item.propertyName}</span>
          </td>
          <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">${item.dueLabel}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #92400e;">
            NGN ${Number(item.amount || 0).toLocaleString()}
          </td>
        </tr>
      `)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upward PM Daily Morning Briefing</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fafae6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2f3e35;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafae6; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #fffffb; border: 1px solid #e3e2cf; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(27, 67, 50, 0.04);">
                
                <!-- HEADER -->
                <tr>
                  <td style="background-color: #1b4332; padding: 32px 28px; text-align: left;">
                    <div style="font-size: 12px; font-weight: 700; color: #a3b899; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Upward Property Management
                    </div>
                    <h1 style="color: #fffff0; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
                      Daily Morning Briefing
                    </h1>
                    <p style="color: #e2ebd8; font-size: 13px; margin: 8px 0 0 0;">
                      Summary of portfolio performance &amp; activity for <strong>${data.yesterdayFormatted}</strong>
                    </p>
                  </td>
                </tr>

                <!-- GREETING & INTRO -->
                <tr>
                  <td style="padding: 28px 28px 12px 28px;">
                    <p style="font-size: 15px; margin: 0; color: #2f3e35; line-height: 1.5;">
                      Good morning <strong>${data.pmName}</strong>,
                    </p>
                    <p style="font-size: 13px; margin: 6px 0 20px 0; color: #506256; line-height: 1.5;">
                      Here is your consolidated morning report of yesterday's transactions, tenant connections, team activity, and upcoming rent obligations.
                    </p>

                    <!-- KPI CARDS GRID -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                      <tr>
                        <td width="50%" style="padding: 0 6px 12px 0;">
                          <div style="background-color: #f6f7eb; border: 1px solid #e3e2cf; border-radius: 10px; padding: 14px 16px;">
                            <span style="font-size: 11px; font-weight: 700; color: #506256; text-transform: uppercase; letter-spacing: 0.5px;">Collected Yesterday</span>
                            <div style="font-size: 20px; font-weight: 800; color: #1b4332; margin-top: 4px;">
                              ₦${data.totalCollectedYesterday.toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td width="50%" style="padding: 0 0 12px 6px;">
                          <div style="background-color: #f6f7eb; border: 1px solid #e3e2cf; border-radius: 10px; padding: 14px 16px;">
                            <span style="font-size: 11px; font-weight: 700; color: #506256; text-transform: uppercase; letter-spacing: 0.5px;">Tenants Joined</span>
                            <div style="font-size: 20px; font-weight: 800; color: #1b4332; margin-top: 4px;">
                              ${data.newlyAcceptedTenants.length}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 0 6px 0 0;">
                          <div style="background-color: #f6f7eb; border: 1px solid #e3e2cf; border-radius: 10px; padding: 14px 16px;">
                            <span style="font-size: 11px; font-weight: 700; color: #506256; text-transform: uppercase; letter-spacing: 0.5px;">Pending Action Items</span>
                            <div style="font-size: 20px; font-weight: 800; color: ${totalPendingActions > 0 ? '#8A4A2A' : '#1b4332'}; margin-top: 4px;">
                              ${totalPendingActions}
                            </div>
                          </div>
                        </td>
                        <td width="50%" style="padding: 0 0 0 6px;">
                          <div style="background-color: #f6f7eb; border: 1px solid #e3e2cf; border-radius: 10px; padding: 14px 16px;">
                            <span style="font-size: 11px; font-weight: 700; color: #506256; text-transform: uppercase; letter-spacing: 0.5px;">Overdue Accounts</span>
                            <div style="font-size: 20px; font-weight: 800; color: ${data.overdueRentItems.length > 0 ? '#991b1b' : '#1b4332'}; margin-top: 4px;">
                              ${data.overdueRentItems.length}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${
                  data.collections.length > 0
                    ? `
                <!-- COLLECTIONS SECTION -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <div style="border: 1px solid #e3e2cf; border-radius: 12px; overflow: hidden;">
                      <div style="background-color: #1b4332; padding: 12px 16px;">
                        <h3 style="color: #fffff0; margin: 0; font-size: 14px; font-weight: 700;">
                          Rent Collections Yesterday (${data.collections.length})
                        </h3>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                        <thead>
                          <tr style="background-color: #fafae6; border-bottom: 1px solid #e3e2cf; font-size: 11px; text-transform: uppercase; color: #506256; text-align: left;">
                            <th style="padding: 8px 12px;">Tenant &amp; Unit</th>
                            <th style="padding: 8px 12px;">Method</th>
                            <th style="padding: 8px 12px; text-align: right;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>${collectionRows}</tbody>
                      </table>
                    </div>
                  </td>
                </tr>`
                    : ''
                }

                ${
                  data.newlyAcceptedTenants.length > 0
                    ? `
                <!-- ONBOARDING SECTION -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <div style="border: 1px solid #e3e2cf; border-radius: 12px; overflow: hidden;">
                      <div style="background-color: #27523f; padding: 12px 16px;">
                        <h3 style="color: #fffff0; margin: 0; font-size: 14px; font-weight: 700;">
                          New Tenant Connections (${data.newlyAcceptedTenants.length})
                        </h3>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                        <tbody>${onboardingRows}</tbody>
                      </table>
                    </div>
                  </td>
                </tr>`
                    : ''
                }

                ${
                  pendingActionRows.length > 0
                    ? `
                <!-- PENDING ACTION ITEMS -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <div style="border: 1px solid #f6d8c8; border-radius: 12px; overflow: hidden; background-color: #fffaf8;">
                      <div style="background-color: #8A4A2A; padding: 12px 16px;">
                        <h3 style="color: #fffff0; margin: 0; font-size: 14px; font-weight: 700;">
                          Pending Requests Requiring Your Action (${pendingActionRows.length})
                        </h3>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tbody>${pendingActionRows.join('')}</tbody>
                      </table>
                    </div>
                  </td>
                </tr>`
                    : ''
                }

                ${
                  data.employeeActivities.length > 0
                    ? `
                <!-- EMPLOYEE ACTIVITY -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <div style="border: 1px solid #e3e2cf; border-radius: 12px; overflow: hidden;">
                      <div style="background-color: #37473d; padding: 12px 16px;">
                        <h3 style="color: #fffff0; margin: 0; font-size: 14px; font-weight: 700;">
                          Team &amp; Property Officer Activity (${data.employeeActivities.length})
                        </h3>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                        <tbody>${employeeRows}</tbody>
                      </table>
                    </div>
                  </td>
                </tr>`
                    : ''
                }

                ${
                  data.overdueRentItems.length > 0
                    ? `
                <!-- OVERDUE RENT ALERTS -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <div style="border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; background-color: #fffafb;">
                      <div style="background-color: #991b1b; padding: 12px 16px;">
                        <h3 style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 700;">
                          Critical Rent Overdue Alerts (${data.overdueRentItems.length})
                        </h3>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <thead>
                          <tr style="background-color: #fde8e8; font-size: 11px; text-transform: uppercase; color: #991b1b; text-align: left;">
                            <th style="padding: 8px 12px;">Tenant &amp; Unit</th>
                            <th style="padding: 8px 12px;">Status</th>
                            <th style="padding: 8px 12px; text-align: right;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>${overdueRows}</tbody>
                      </table>
                    </div>
                  </td>
                </tr>`
                    : ''
                }

                ${
                  data.upcomingRentItems.length > 0
                    ? `
                <!-- UPCOMING RENT DUE -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <div style="border: 1px solid #fdf6e2; border-radius: 12px; overflow: hidden; background-color: #fffdf9;">
                      <div style="background-color: #b45309; padding: 12px 16px;">
                        <h3 style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 700;">
                          Upcoming Rent Due (${data.upcomingRentItems.length})
                        </h3>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <thead>
                          <tr style="background-color: #fef3c7; font-size: 11px; text-transform: uppercase; color: #92400e; text-align: left;">
                            <th style="padding: 8px 12px;">Tenant &amp; Unit</th>
                            <th style="padding: 8px 12px;">Due In</th>
                            <th style="padding: 8px 12px; text-align: right;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>${upcomingRows}</tbody>
                      </table>
                    </div>
                  </td>
                </tr>`
                    : ''
                }

                <!-- ACTION CTA BUTTON -->
                <tr>
                  <td style="padding: 24px 28px 20px 28px; text-align: center;">
                    <a href="${data.baseUrl}/portal/dashboard" style="display: inline-block; background-color: #1b4332; color: #fffff0; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.2px; box-shadow: 0 2px 6px rgba(27, 67, 50, 0.15);">
                      Open PM Dashboard
                    </a>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background-color: #fafae6; padding: 20px 28px; border-top: 1px solid #e3e2cf; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #88998e; line-height: 1.5;">
                      This is an automated operational morning briefing delivered to verified Property Managers on Upward.<br/>
                      To adjust your morning briefing preferences, visit your 
                      <a href="${data.baseUrl}/settings" style="color: #1b4332; text-decoration: underline; font-weight: 600;">Account Settings</a>.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
