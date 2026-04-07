/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from '@/lib/api-client'

export async function getNotifications() {
  return request<any>('/tenant/notifications', { method: 'GET' }).then((res) => res.data)
}

export async function updateAnnouncementState(data: {
  announcementId: string
  seenPopup?: boolean
  interactedPopup?: boolean
  seenBanner?: boolean
  interactedBanner?: boolean
}) {
  return request<any>('/tenant/notifications/announcements/state', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }).then((res) => res.data)
}

export async function markNotificationRead(id: string) {
  return request<any>(`/tenant/notifications/${id}/read`, {
    method: 'PATCH',
  }).then((res) => res.data)
}
