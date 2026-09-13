import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { ActivityAction } from '../../../../shared/application/activity-log.service';

export interface GetTeamActivityDashboardDto {
  memberUuid?: string;
  category?: 'ALL' | 'PAYMENTS' | 'PROPERTIES' | 'DOCUMENTS' | 'TENANTS' | 'TEMPLATES' | string;
  action?: string;
  search?: string;
  timeRange?: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const CATEGORY_ACTION_MAP: Record<string, string[]> = {
  PAYMENTS: [
    ActivityAction.SEND_INVOICE,
    ActivityAction.UPDATE_RENT,
    ActivityAction.DELETE_RENT,
    ActivityAction.CANCEL_PAYMENT,
    ActivityAction.PROCESS_REFUND,
    ActivityAction.ACCEPT_PAYMENT,
    ActivityAction.ADD_RENT_HISTORY,
  ],
  PROPERTIES: [
    ActivityAction.CREATE_PROPERTY,
    ActivityAction.UPDATE_PROPERTY,
    ActivityAction.DELETE_PROPERTY,
    ActivityAction.CREATE_UNIT,
    ActivityAction.UPDATE_UNIT,
    ActivityAction.DELETE_UNIT,
    ActivityAction.BULK_CREATE_UNITS,
    ActivityAction.BULK_FULL_IMPORT,
    'BULK_IMPORT',
    'BULK_FULL_IMPORT',
  ],
  DOCUMENTS: [
    ActivityAction.SEND_DOCUMENT,
    ActivityAction.BULK_SEND_DOCUMENT,
    ActivityAction.SEND_REPORT,
    'SEND_DOCUMENT',
  ],
  TEMPLATES: [
    ActivityAction.CREATE_DOCUMENT_TEMPLATE,
    ActivityAction.UPDATE_DOCUMENT_TEMPLATE,
  ],
  TENANTS: [
    ActivityAction.CREATE_TENANT,
    ActivityAction.INVITE_TENANT,
    ActivityAction.BULK_INVITE_TENANTS,
    'TENANT_JOIN_REQUEST',
    'TENANT_REQUEST',
    'CREATE_TENANT',
  ],
};

function getCategoryForAction(action: string): string {
  for (const [category, actions] of Object.entries(CATEGORY_ACTION_MAP)) {
    if (actions.includes(action)) return category;
  }
  if (action === ActivityAction.UPDATE_PROFILE) return 'PROFILE';
  return 'OTHER';
}

@Injectable()
export class GetTeamActivityDashboardUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(ownerPmId: number, query: GetTeamActivityDashboardDto = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // 1. Fetch team members (Employees + Collaborators) and Owner PM to build actor dictionary
    const [employees, collaborations, ownerPm] = await Promise.all([
      (this.prisma as any).upward_pm_employee.findMany({
        where: { ownerPmId },
        select: {
          id: true,
          uuid: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          accessLevel: true,
          status: true,
        },
      }),
      (this.prisma as any).upward_pm_team_collaboration.findMany({
        where: { ownerPmId },
        include: {
          collaboratorPm: {
            select: {
              id: true,
              uuid: true,
              firstName: true,
              lastName: true,
              email: true,
              businessName: true,
            },
          },
        },
      }),
      (this.prisma as any).upward_property_manager.findUnique({
        where: { id: ownerPmId },
        select: {
          id: true,
          uuid: true,
          firstName: true,
          lastName: true,
          email: true,
          businessName: true,
        },
      }),
    ]);

    const ownerFirstName = ownerPm?.firstName ? this.encryption.decrypt(ownerPm.firstName) : '';
    const ownerLastName = ownerPm?.lastName ? this.encryption.decrypt(ownerPm.lastName) : '';
    const ownerFullName = `${ownerFirstName} ${ownerLastName}`.trim() || ownerPm?.businessName || 'Admin (Owner)';

    const employeeMap = new Map<number, any>();
    const employeeUuidMap = new Map<string, any>();
    const teamMembersList: any[] = [];

    employees.forEach((emp: any) => {
      const firstName = this.encryption.decrypt(emp.firstName) || '';
      const lastName = this.encryption.decrypt(emp.lastName) || '';
      const email = this.encryption.decrypt(emp.email) || '';
      const name = `${firstName} ${lastName}`.trim() || email || 'Team Member';

      const memberObj = {
        id: emp.id,
        uuid: emp.uuid,
        name,
        firstName,
        lastName,
        email,
        jobTitle: emp.jobTitle || 'Property Officer',
        role: emp.accessLevel === 'ALL' ? 'ADMIN' : 'EMPLOYEE',
        status: emp.status,
        type: 'EMPLOYEE',
      };

      employeeMap.set(emp.id, memberObj);
      employeeUuidMap.set(emp.uuid, memberObj);
      teamMembersList.push(memberObj);
    });

    const pmCollabMap = new Map<number, any>();
    collaborations.forEach((collab: any) => {
      const pm = collab.collaboratorPm;
      if (!pm) return;
      const firstName = this.encryption.decrypt(pm.firstName) || '';
      const lastName = this.encryption.decrypt(pm.lastName) || '';
      const email = this.encryption.decrypt(pm.email) || '';
      const name = `${firstName} ${lastName}`.trim() || pm.businessName || email || 'Collaborator';

      const memberObj = {
        id: pm.id,
        uuid: pm.uuid,
        name,
        firstName,
        lastName,
        email,
        jobTitle: 'Collaborator',
        role: collab.accessLevel === 'ALL' ? 'ADMIN' : 'COLLABORATOR',
        status: collab.status,
        type: 'COLLABORATOR',
      };

      pmCollabMap.set(pm.id, memberObj);
      employeeUuidMap.set(pm.uuid, memberObj);
      teamMembersList.push(memberObj);
    });

    // 2. Resolve Date Range filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (query.timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (query.timeRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === 'custom') {
      if (query.startDate) startDate = new Date(query.startDate);
      if (query.endDate) endDate = new Date(query.endDate);
    }

    // 3. Resolve Member filter
    let targetEmployeeId: number | undefined;
    let targetCollaboratorPmId: number | undefined;

    if (query.memberUuid) {
      const member = employeeUuidMap.get(query.memberUuid);
      if (member) {
        if (member.type === 'EMPLOYEE') {
          targetEmployeeId = member.id;
        } else {
          targetCollaboratorPmId = member.id;
        }
      }
    }

    // 4. Resolve Action/Category filter
    let actionFilter: any = undefined;
    if (query.action) {
      actionFilter = query.action;
    } else if (query.category && query.category !== 'ALL') {
      const mappedActions = CATEGORY_ACTION_MAP[query.category];
      if (mappedActions) {
        actionFilter = { in: mappedActions };
      }
    }

    // Base WHERE condition for owner's team
    const baseWhere: any = {
      ownerPmId,
    };

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = startDate;
      if (endDate) baseWhere.createdAt.lte = endDate;
    }

    if (targetEmployeeId !== undefined) {
      baseWhere.employeeId = targetEmployeeId;
    } else if (targetCollaboratorPmId !== undefined) {
      baseWhere.pmId = targetCollaboratorPmId;
    }

    if (actionFilter) {
      baseWhere.action = actionFilter;
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      baseWhere.OR = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { entityType: { contains: searchTerm, mode: 'insensitive' } },
        { entityId: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // 5. Query stats & paginated data in parallel
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const [
      totalFiltered,
      totalAllTime,
      todayCount,
      allRangeLogs,
      paginatedLogs,
    ] = await Promise.all([
      (this.prisma as any).upward_pm_activity_log.count({ where: baseWhere }),
      (this.prisma as any).upward_pm_activity_log.count({ where: { ownerPmId } }),
      (this.prisma as any).upward_pm_activity_log.count({
        where: {
          ownerPmId,
          createdAt: { gte: startOfToday },
        },
      }),
      (this.prisma as any).upward_pm_activity_log.findMany({
        where: {
          ownerPmId,
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          action: true,
          employeeId: true,
          pmId: true,
          createdAt: true,
        },
      }),
      (this.prisma as any).upward_pm_activity_log.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // 6. Compute Category Breakdown & Active Members
    const categoryCounts: Record<string, number> = {
      PAYMENTS: 0,
      PROPERTIES: 0,
      DOCUMENTS: 0,
      TEMPLATES: 0,
      TENANTS: 0,
      OTHER: 0,
    };

    const activeMemberIds = new Set<string>();
    const memberActionCounts: Record<string, { count: number; lastActive: Date }> = {};

    allRangeLogs.forEach((l: any) => {
      const cat = getCategoryForAction(l.action);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      let memberKey: string | null = null;
      if (l.employeeId && employeeMap.has(l.employeeId)) {
        memberKey = employeeMap.get(l.employeeId).uuid;
      } else if (l.pmId && pmCollabMap.has(l.pmId)) {
        memberKey = pmCollabMap.get(l.pmId).uuid;
      }

      if (memberKey) {
        activeMemberIds.add(memberKey);
        if (!memberActionCounts[memberKey]) {
          memberActionCounts[memberKey] = { count: 0, lastActive: l.createdAt };
        }
        memberActionCounts[memberKey]!.count++;
        if (new Date(l.createdAt) > new Date(memberActionCounts[memberKey]!.lastActive)) {
          memberActionCounts[memberKey]!.lastActive = l.createdAt;
        }
      }
    });

    // 7. Compute 14-day Daily Trend
    const dailyTrendMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0]!;
      dailyTrendMap[dateKey] = 0;
    }

    allRangeLogs.forEach((l: any) => {
      const dateKey = new Date(l.createdAt).toISOString().split('T')[0]!;
      if (dailyTrendMap[dateKey] !== undefined) {
        dailyTrendMap[dateKey]!++;
      }
    });

    const dailyTrend = Object.entries(dailyTrendMap).map(([date, count]) => ({
      date,
      count,
    }));

    // 8. Enrich Members Summary
    const membersSummary = teamMembersList.map((member) => ({
      ...member,
      actionsCount: memberActionCounts[member.uuid]?.count || 0,
      lastActiveAt: memberActionCounts[member.uuid]?.lastActive || null,
    })).sort((a, b) => b.actionsCount - a.actionsCount);

    // 9. Format Paginated Logs with Performer Metadata
    const formattedLogs = paginatedLogs.map((log: any) => {
      let performer: any = null;

      if (log.employeeId && employeeMap.has(log.employeeId)) {
        performer = employeeMap.get(log.employeeId);
      } else if (log.pmId && pmCollabMap.has(log.pmId)) {
        performer = pmCollabMap.get(log.pmId);
      } else {
        performer = {
          name: ownerFullName,
          role: 'ADMIN',
          jobTitle: 'Account Owner',
          type: 'OWNER',
        };
      }

      return {
        id: log.id,
        uuid: log.uuid,
        action: log.action,
        category: getCategoryForAction(log.action),
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        metadata: this.sanitizeAndDecryptMetadata(log.metadata),
        createdAt: log.createdAt,
        performer,
      };
    });

    return {
      metrics: {
        totalActions: totalFiltered,
        totalAllTime,
        todayActions: todayCount,
        activeMembersCount: activeMemberIds.size,
        totalTeamMembers: teamMembersList.length,
      },
      categoryCounts,
      dailyTrend,
      membersSummary,
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
    };
  }

  private sanitizeAndDecryptMetadata(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.sanitizeAndDecryptMetadata(parsed);
        } catch {
          // not JSON, continue
        }
      }
      if (trimmed.includes(':') && trimmed.split(':').length === 3) {
        try {
          const decrypted = this.encryption.decrypt(trimmed);
          if (decrypted && decrypted !== trimmed) {
            return decrypted;
          }
        } catch {
          // not encrypted or failed, continue
        }
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.sanitizeAndDecryptMetadata(item));
    }
    if (typeof val === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(val)) {
        if (key === 'passwordHash' || key === 'emailHash' || key === 'phoneHash') continue;
        result[key] = this.sanitizeAndDecryptMetadata(value);
      }
      return result;
    }
    return val;
  }
}
