import { request } from '@/lib/api-client';

export interface TeamActivityQueryParams {
  memberUuid?: string;
  category?: string;
  action?: string;
  search?: string;
  timeRange?: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ActivityPerformer {
  id?: number;
  uuid?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  role?: string;
  status?: string;
  type?: 'EMPLOYEE' | 'COLLABORATOR' | 'OWNER';
}

export interface TeamActivityLogItem {
  id: number;
  uuid: string;
  action: string;
  category: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: any;
  createdAt: string;
  performer: ActivityPerformer;
}

export interface TeamActivityDashboardResponse {
  metrics: {
    totalActions: number;
    totalAllTime: number;
    todayActions: number;
    activeMembersCount: number;
    totalTeamMembers: number;
  };
  categoryCounts: {
    PAYMENTS: number;
    PROPERTIES: number;
    DOCUMENTS: number;
    TEMPLATES: number;
    TENANTS: number;
    OTHER: number;
  };
  dailyTrend: { date: string; count: number }[];
  membersSummary: {
    uuid: string;
    name: string;
    email: string;
    role: string;
    jobTitle: string;
    status: string;
    actionsCount: number;
    lastActiveAt: string | null;
  }[];
  logs: TeamActivityLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const teamActivityService = {
  async getDashboard(params: TeamActivityQueryParams = {}): Promise<TeamActivityDashboardResponse> {
    const searchParams = new URLSearchParams();
    if (params.memberUuid) searchParams.set('memberUuid', params.memberUuid);
    if (params.category && params.category !== 'ALL') searchParams.set('category', params.category);
    if (params.action) searchParams.set('action', params.action);
    if (params.search) searchParams.set('search', params.search);
    if (params.timeRange) searchParams.set('timeRange', params.timeRange);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return request<TeamActivityDashboardResponse>(`/pm/team/activity/dashboard${qs ? `?${qs}` : ''}`);
  },
};
