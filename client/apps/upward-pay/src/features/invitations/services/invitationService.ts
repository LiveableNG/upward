import { request } from '@/lib/api-client'
import { type InvitationData } from '../types'

export async function fetchInvitation(token: string) {
  return request<InvitationData>(`/public/invitation/${token}`)
}
