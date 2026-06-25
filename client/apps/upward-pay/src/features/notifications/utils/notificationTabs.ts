export type NotificationTab = 'Transactions' | 'Services' | 'Activities'

export const NOTIFICATION_TABS: NotificationTab[] = ['Transactions', 'Services', 'Activities']

export function getNotificationTab(type: string): NotificationTab | null {
  if (type === 'PAYMENT') return 'Transactions'
  if (type === 'SUPPORT' || type === 'SYSTEM') return 'Services'
  if (type === 'RENT_REMINDER') return 'Activities'
  return null
}

export function getTabUnreadCounts(
  notifications: Array<{ type: string; isRead: boolean }>,
): Record<NotificationTab, number> {
  const counts: Record<NotificationTab, number> = {
    Transactions: 0,
    Services: 0,
    Activities: 0,
  }

  notifications.forEach((notification) => {
    if (notification.isRead) return
    const tab = getNotificationTab(notification.type)
    if (tab) counts[tab]++
  })

  return counts
}

export function filterNotificationsByTab<T extends { type: string }>(
  notifications: T[],
  tab: NotificationTab,
): T[] {
  return notifications.filter((notification) => getNotificationTab(notification.type) === tab)
}
