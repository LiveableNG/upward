import { request } from '@/lib/api-client'

export interface CreateTenantDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface Tenant {
  id: number;
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  inviteStatus: string;
  inviteSentAt: string | null;
  units?: Array<{
    id: number;
    uuid: string;
    unitName: string;
    status: string;
    isSynced: boolean;
    property: {
      uuid: string;
      name: string;
    }
  }>
}

export const tenantService = {
  getTenants: () => {
    return request<Tenant[]>('/pm/tenants')
  },

  getTenant: (uuid: string) => {
    return request<Tenant>(`/pm/tenants/${uuid}`)
  },

  createTenant: (dto: CreateTenantDto) => {
    return request<Tenant>('/pm/tenants', {
      method: 'POST',
      body: JSON.stringify(dto)
    })
  },

  inviteTenant: (uuid: string) => {
    return request<void>(`/pm/tenants/${uuid}/invite`, {
      method: 'POST'
    })
  },

  assignTenant: (tenantUuid: string, unitUuid: string) => {
    return request<void>(`/pm/tenants/${tenantUuid}/assign`, {
      method: 'POST',
      body: JSON.stringify({ unitUuid })
    })
  },

  unassignTenant: (tenantUuid: string, unitUuid: string) => {
    return request<void>(`/pm/tenants/${tenantUuid}/unassign`, {
      method: 'POST',
      body: JSON.stringify({ unitUuid })
    })
  },

  updateTenant: (uuid: string, data: Partial<CreateTenantDto>) => {
    return request<Tenant>(`/pm/tenants/${uuid}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  bulkInvite: (tenantUuids: string[]) => {
    return request<{ bulkInviteId: string }>('/pm/tenants/bulk-invite', {
      method: 'POST',
      body: JSON.stringify({ tenantUuids })
    })
  }
}