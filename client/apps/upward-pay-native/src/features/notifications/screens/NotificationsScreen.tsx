import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Bell, ChevronRight, Clock, Info, Landmark } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchPendingPayments } from '@/features/dashboard/services/dashboardService'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import {
  fetchNotifications,
  markNotificationRead,
  type AppNotification,
} from '@/features/notifications/services/notificationService'
import {
  filterNotificationsByTab,
  getTabUnreadCounts,
  NOTIFICATION_TABS,
  type NotificationTab,
} from '@/features/notifications/utils/notificationTabs'
import { formatCurrency } from '@/lib/format'
import { useAppTheme } from '@/theme'

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapNotificationUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes('/dashboard/pay-rent'))
    return url.replace('/dashboard/pay-rent', DASHBOARD_HREF.payRent)
  return url
}

export function NotificationsScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const { user } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<NotificationTab>('Transactions')

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  })

  const pendingQuery = useQuery({
    queryKey: ['pending-payments'],
    queryFn: fetchPendingPayments,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = useMemo(() => {
    const raw = [...(notifQuery.data ?? [])]
    pendingQuery.data?.forEach((p) => {
      raw.push({
        id: `pending-${p.uuid}`,
        type: 'RENT_REMINDER',
        title: 'Unpaid invoice',
        message: `${p.company_name} · ${formatCurrency(p.amount, p.currency)} due`,
        createdAt: p.due_date || p.dueDate || new Date().toISOString(),
        isRead: false,
        url: `${DASHBOARD_HREF.payRent}?paymentUuid=${p.uuid}`,
      })
    })
    if (!user?.properties?.length) {
      raw.push({
        id: 'setup-reminder',
        type: 'SYSTEM',
        title: 'Complete your profile',
        message: 'Add property details to build your Rent Passport.',
        createdAt: new Date().toISOString(),
        isRead: false,
        url: DASHBOARD_HREF.setupRental,
      })
    }
    return raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [notifQuery.data, pendingQuery.data, user?.properties?.length])

  const tabCounts = useMemo(() => getTabUnreadCounts(notifications), [notifications])
  const filtered = useMemo(() => filterNotificationsByTab(notifications, tab), [notifications, tab])

  const onPress = (notif: AppNotification & { isDynamic?: boolean }) => {
    if (
      !notif.isRead &&
      !String(notif.id).startsWith('pending-') &&
      notif.id !== 'setup-reminder'
    ) {
      markRead.mutate(String(notif.id))
    }
    const href = mapNotificationUrl(notif.url ?? null)
    if (href) go(href)
  }

  return (
    <Screen scroll background="shell">
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Inbox</EyebrowText>
      <TitleText>Notifications</TitleText>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing[2],
        }}
      >
        {NOTIFICATION_TABS.map((t) => {
          const active = tab === t
          const unread = tabCounts[t]
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: radius.full,
                backgroundColor: active ? colors.clay : colors.bg,
                borderWidth: 1,
                borderColor: active ? colors.clay : colors.shellBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CaptionText
                weight="semibold"
                style={{ color: active ? colors.bg : colors.textSecondary }}
              >
                {t}
              </CaptionText>
              {unread > 0 ? (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: active ? colors.bg : colors.clay,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <CaptionText
                    style={{
                      color: active ? colors.clay : colors.bg,
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  >
                    {unread}
                  </CaptionText>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>

      {notifQuery.isLoading ? <ActivityIndicator color={colors.clay} /> : null}

      {filtered.length === 0 && !notifQuery.isLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing[10], gap: spacing[3] }}>
          <Bell size={40} color={colors.textMuted} />
          <BodyText color="textSecondary">No {tab.toLowerCase()} notifications yet.</BodyText>
        </View>
      ) : null}

      <View style={{ gap: spacing[2] }}>
        {filtered.map((notif) => (
          <Pressable
            key={notif.id}
            onPress={() => onPress(notif)}
            style={{
              flexDirection: 'row',
              gap: spacing[3],
              padding: spacing[4],
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.shellBorder,
              backgroundColor: notif.isRead ? colors.bg : colors.shellTint,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {notif.type === 'PAYMENT' ? (
                <Landmark size={16} color={colors.clay} />
              ) : notif.type === 'RENT_REMINDER' ? (
                <Clock size={16} color={colors.clay} />
              ) : (
                <Info size={16} color={colors.clay} />
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <BodyText weight="semibold">{notif.title}</BodyText>
              <CaptionText color="textSecondary" numberOfLines={3}>
                {stripHtml(notif.message)}
              </CaptionText>
            </View>
            {notif.url ? <ChevronRight size={16} color={colors.textMuted} /> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  )
}
