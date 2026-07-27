import { request } from '@/lib/api-client'

export interface CreateTenantDto {
  commercialName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  otherPhone?: string;
}

export interface Tenant {
  id: number;
  uuid: string;
  commercialName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  otherPhone?: string | null;
  inviteStatus: string;
  inviteSentAt: string | null;
  hasReceivedWelcomeTemplate?: boolean;
  formerAddress?: string;
  nextOfKinName?: string;
  nextOfKinEmail?: string;
  nextOfKinPhone?: string;
  guarantorName?: string;
  guarantorEmail?: string;
  guarantorPhone?: string;
  emergencyContactName?: string;
  emergencyContactEmail?: string;
  emergencyContactPhone?: string;
  units?: Array<{
    id: number;
    uuid: string;
    unitName: string;
    status: string;
    isSynced: boolean;
    property: {
      uuid: string;
      name: string;
      address?: string;
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

  inviteTenant: (uuid: string, deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP') => {
    return request<void>(`/pm/tenants/${uuid}/invite`, {
      method: 'POST',
      body: JSON.stringify({ deliveryChannel })
    })
  },

  assignTenant: (tenantUuid: string, unitUuid: string, rentDetails?: {
    rentAmountPaid?: number;
    isFullyPaid?: boolean;
    rentAmount?: number;
    rentType?: string;
    rentStartDate?: string;
    rentDueDate?: string;
  }) => {
    return request<void>(`/pm/tenants/${tenantUuid}/assign`, {
      method: 'POST',
      body: JSON.stringify({ unitUuid, ...rentDetails })
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

  bulkInvite: (tenantUuids: string[], deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP') => {
    return request<{ bulkInviteId: string }>('/pm/tenants/bulk-invite', {
      method: 'POST',
      body: JSON.stringify({ tenantUuids, deliveryChannel })
    })
  }
}