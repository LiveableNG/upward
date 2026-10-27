import { request } from '@/lib/api-client'

export type CredibilityRequest = {
  uuid: string
  status?: string
  createdAt?: string
  property?: { address?: string }
  requestContactDetails?: {
    companyName?: string
    email?: string
  }
}

export async function getCredibilityRequests(): Promise<CredibilityRequest[]> {
  const res = await request<CredibilityRequest[] | { data?: CredibilityRequest[] }>(
    '/user/auth/credibility-requests',
    { method: 'GET' },
  )
  if (Array.isArray(res)) return res
  return res.data ?? []
}

export async function submitRequestRecords(payload: {
  propertyUuid: string
  requestContactDetails: {
    companyName: string
    email: string
    phone?: string
    address?: string
    alias?: string
  }
}) {
  return request<{ success?: boolean }>('/user/auth/request-records', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
