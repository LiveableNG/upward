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
