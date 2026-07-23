import { request } from '@/lib/api-client'

export type HomeRequestLocation = {
  state: string
  area: string
  subArea?: string
}

export type HomeRequestStatus = 'submitted' | 'contacted' | 'assigned' | 'closed' | string

export type PmHomeRequest = {
  uuid: string
  displayName: string
  locations: HomeRequestLocation[]
  budgetMin: number
  budgetMax: number
  propertyTypes: string[]
  beds: number
  moveInDate: string | null
  amenities: string[]
  notes: string | null
  status: HomeRequestStatus
  submittedAt: string
  contactRevealCount: number
  contactRevealedByMe: boolean
  contact?: null | {
    fullName: string | null
    email: string
    phone: string
  }
}

export const listHomeRequests = () => request<PmHomeRequest[]>('/pm/home-requests')

export const getHomeRequest = (uuid: string) =>
  request<PmHomeRequest>(`/pm/home-requests/${uuid}`)

export const revealHomeRequestContact = (uuid: string) =>
  request<PmHomeRequest>(`/pm/home-requests/${uuid}/reveal-contact`, {
    method: 'POST',
  })
