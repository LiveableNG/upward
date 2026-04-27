import { request } from '@/lib/api-client'

export interface Property {
  id: number;
  uuid: string;
  name: string;
  address: string;
  totalUnits: number;
  propertyType: string;
  imageUrl?: string;
  country?: string;
  state?: string;
  area?: string;
}

export interface Unit {
  id: number;
  uuid: string;
  propertyId: number;
  property?: Property;
  unitName: string;
  tenantId?: number;
  tenant?: any; 
  tenantUuid?: string;
  tenantFirstName?: string;
  tenantLastName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  rentAmount: number;
  rentStartDate?: string;
  rentDueDate?: string;
  rentFrequency: string;
  status: string;
  isSynced: boolean;
  userPropertyUuid: string | null;
}

export const getProperties = () => {
  return request<Property[]>('/pm/properties')
}

export const createProperty = (data: Partial<Property>) => {
  return request<Property>('/pm/properties', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const updateProperty = (uuid: string, data: Partial<Property>) => {
  return request<Property>(`/pm/properties/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const deleteProperty = (uuid: string) => {
  return request<{ success: boolean }>(`/pm/properties/${uuid}`, {
    method: 'DELETE'
  })
}

export const getUnits = (propertyUuid?: string) => {
  const url = propertyUuid ? `/pm/units?propertyUuid=${propertyUuid}` : '/pm/units'
  return request<Unit[]>(url)
}

export const getUnit = (uuid: string) => {
  return request<Unit>(`/pm/units/${uuid}`)
}

export const updateUnit = (uuid: string, data: Partial<Unit>) => {
  return request<Unit>(`/pm/units/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const deleteUnit = (uuid: string) => {
  return request<{ success: boolean }>(`/pm/units/${uuid}`, {
    method: 'DELETE'
  })
}

export const getUnitPayments = (unitUuid: string) => {
  return request<any[]>(`/pm/units/${unitUuid}/payments`)
}

export const addUnitPayment = (unitUuid: string, data: any) => {
  return request<any>(`/pm/units/${unitUuid}/payments`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const bulkCreateUnits = (propertyUuid: string, units: Partial<Unit>[]) => {
  return request<{ success: boolean; count: number }>('/pm/units/bulk', {
    method: 'POST',
    body: JSON.stringify({ propertyUuid, units })
  })
}

export const getPropertyImageUploadUrl = (contentType: string, filename: string) => {
  return request<{ key: string; uploadUrl: string; publicUrl: string }>('/pm/properties/image-upload-url', {
    method: 'POST',
    body: JSON.stringify({ contentType, filename })
  })
}

export const syncToUpward = (unitUuid: string) => {
  return request<void>(`/pm/units/${unitUuid}/sync-to-upward`, {
    method: 'POST'
  })
}
