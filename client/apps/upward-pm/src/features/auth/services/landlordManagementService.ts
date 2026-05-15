import { request } from '@/lib/api-client'

export const getLandlordProperties = async () => {
  return request<any[]>('/landlords/management/properties', { method: 'GET' })
}

export const createLandlordProperty = async (data: any) => {
  return request<any>('/landlords/management/properties', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const getLandlordUnits = async (propertyUuid?: string) => {
  const url = propertyUuid 
    ? `/landlords/management/units?propertyUuid=${propertyUuid}` 
    : '/landlords/management/units'
  return request<any[]>(url, { method: 'GET' })
}

export const createLandlordUnits = async (data: any) => {
  return request<any>('/landlords/management/units/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const getLandlordPaymentRequests = async () => {
  return request<any[]>('/landlords/management/payment-requests', { method: 'GET' })
}

export const createLandlordPaymentRequest = async (data: any) => {
  return request<any>('/landlords/management/payment-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const updateLandlordPaymentRequest = async (uuid: string, data: any) => {
  return request<any>(`/landlords/management/payment-requests/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const syncLandlordUnit = async (unitUuid: string) => {
  return request<any>(`/landlords/management/units/${unitUuid}/sync`, { method: 'POST' })
}
