import { request } from '@/lib/api-client'

export type AppNotification = {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  isRead: boolean
  url?: string | null
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await request<{ notifications?: AppNotification[] } | AppNotification[]>(
    '/user/notifications',
    { method: 'GET' },
  )
  if (Array.isArray(res)) return res
  return res.notifications ?? []
}

export async function markNotificationRead(id: string) {
  return request(`/user/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  })
}

export async function markNotificationCategoryRead(category: string) {
  return request('/user/notifications/mark-category-read', {
    method: 'POST',
    body: JSON.stringify({ category }),
  })
}
