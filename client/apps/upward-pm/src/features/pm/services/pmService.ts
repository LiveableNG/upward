import { request } from '@/lib/api-client'

export const updateProfile = async (data: any) => {
  return request('/pm/profile', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const updateBankInfo = async (data: any) => {
  return request('/pm/profile/bank-info', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const verifyBank = async (accountNumber: string, bankCode: string) => {
  return request<any>('/pm/profile/verify-bank', {
    method: 'POST',
    body: JSON.stringify({ accountNumber, bankCode })
  })
}

export const getBanks = async () => {
  return request<any[]>('/pm/profile/banks', {
    method: 'GET'
  })
}

export const changePassword = async (data: any) => {
  return request('/pm/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const getAvatarUploadUrl = async (contentType: string, filename: string) => {
  return request<any>('/pm/profile/avatar-url', {
    method: 'POST',
    body: JSON.stringify({ contentType, filename })
  })
}

export const uploadAvatar = async (params: { base64Data: string, contentType: string }) => {
  return request<{ publicUrl: string }>('/pm/profile/avatar-upload', {
    method: 'POST',
    body: JSON.stringify(params)
  })
}

export const getLetterheadUploadUrl = async (params: { type: 'header' | 'footer', contentType: string, filename: string }) => {
  return request<any>('/pm/profile/letterhead-url', {
    method: 'POST',
    body: JSON.stringify(params)
  })
}

export const uploadLetterhead = async (params: { type: 'header' | 'footer', base64Data: string, contentType: string }) => {
  return request<{ publicUrl: string }>('/pm/profile/letterhead-upload', {
    method: 'POST',
    body: JSON.stringify(params)
  })
}

export const sendLandlordReport = async (data: any) => {
  return request('/pm/landlords/send-report', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const getLandlordReports = async (landlordEmail: string) => {
  return request<any[]>(`/pm/landlords/${encodeURIComponent(landlordEmail)}/reports`, {
    method: 'GET'
  })
}

export const getLandlordReport = async (uuid: string) => {
  return request<any>(`/pm/landlords/reports/${uuid}`, {
    method: 'GET'
  })
}

export const sendBulkReminders = async (landlordEmail: string) => {
  return request<{ sentCount: number }>(`/pm/landlords/${encodeURIComponent(landlordEmail)}/bulk-reminders`, {
    method: 'POST'
  })
}

// Team Collaboration
export const inviteTeamMember = async (data: any) => {
  return request('/pm/team/invite', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const getTeamMembers = async () => {
  return request<any[]>('/pm/team', {
    method: 'GET'
  })
}

export const updateTeamMemberPermissions = async (uuid: string, data: any) => {
  return request(`/pm/team/${uuid}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const revokeTeamMember = async (uuid: string) => {
  return request(`/pm/team/${uuid}`, {
    method: 'DELETE'
  })
}

export const getCollaboratorActivities = async (uuid: string) => {
  return request<any>(`/pm/team/${uuid}/activities`, {
    method: 'GET'
  })
}
