import { request } from '@/lib/api-client'
import { type DashboardData, type ContractData } from '../types'
import { type TenantProfile } from '@/features/auth/types'

export async function getDashboardData(): Promise<DashboardData> {
  const tenantRaw = await request<TenantProfile>('/tenant/auth/me')

  // Pad missing numeric fields to prevent NaN in UI
  const tenant: TenantProfile = {
    ...tenantRaw,
    savingsBalance: tenantRaw.savingsBalance ?? 0,
    savingsGoal: tenantRaw.savingsGoal ?? 0,
    totalInvites: tenantRaw.totalInvites ?? 0,
  }

  return {
    tenant,
    pendingPayments: [], // TODO: Connect to backend when payment models are ready
    completedPayments: [],
    savedLandlords: [],
    contracts: [],
  }
}

export async function getMyDocuments(): Promise<{ contracts: ContractData[] }> {
  // Backend doesn't have a documents endpoint yet, returning empty for now
  return { contracts: [] }
}

export async function updateProfile(
  data: Partial<TenantProfile>,
): Promise<{ success: boolean; tenant: TenantProfile }> {
  return request<{ success: boolean; tenant: TenantProfile }>('/tenant/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
