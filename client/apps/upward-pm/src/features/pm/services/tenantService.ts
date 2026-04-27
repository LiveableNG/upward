import { api } from '@/lib/api'

export interface Tenant {
  id: number
  uuid: string
  pmId: number
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  inviteStatus: 'PENDING' | 'SENT' | 'ON_UPWARD' | 'ACCEPTED'
  inviteSentAt: string | null
  units: {
    id: number
    uuid: string
    unitName: string
    property: {
      name: string
      uuid: string
    }
    status: string
  }[]
}

export interface CreateTenantDto {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export const tenantService = {
  getTenants: async (): Promise<Tenant[]> => {
    return api.get('/pm/tenants')
  },

  getTenant: async (uuid: string): Promise<Tenant> => {
    return api.get(`/pm/tenants/${uuid}`)
  },

  createTenant: async (dto: CreateTenantDto): Promise<Tenant> => {
    return api.post('/pm/tenants', dto)
  },

  inviteTenant: async (uuid: string): Promise<void> => {
    await api.post(`/pm/tenants/${uuid}/invite`)
  },

  assignTenant: async (tenantUuid: string, unitUuid: string): Promise<void> => {
    await api.post(`/pm/tenants/${tenantUuid}/assign`, { unitUuid })
  },
  
  unassignTenant: async (tenantUuid: string, unitUuid: string): Promise<void> => {
    await api.post(`/pm/tenants/${tenantUuid}/unassign`, { unitUuid })
  },

  updateTenant: async (uuid: string, dto: Partial<CreateTenantDto>): Promise<Tenant> => {
    return api.patch(`/pm/tenants/${uuid}`, dto)
  }
}
