import { request } from '@/lib/api-client'

export const submitRequestRecords = (data: any) =>
  request<any>('/user/auth/request-records', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getCredibilityRequests = () =>
  request<any[]>('/user/auth/credibility-requests', {
    method: 'GET',
  })
export const getPublicRequestDetails = (uuid: string) =>
  request<any>(`/public/credibility/request/${uuid}`, {
    method: 'GET',
  })

export const fulfillPublicRequest = (uuid: string, records: any[]) =>
  request<any>(`/public/credibility/request/${uuid}/fulfill`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  })
