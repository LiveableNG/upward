import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native'
import {
  Bell,
  ChevronRight,
  Flame,
  Home,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react-native'

import { Button } from '@/components/button/Button'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getPostAuthSetupPath,
  getUserDisplayName,
  needsProfileSetup,
} from '@/features/auth/session'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { MyHomeQuickHub } from '@/features/dashboard/components/MyHomeQuickHub'
import { RentDepositCard } from '@/features/dashboard/components/RentDepositCard'
import { fetchNotifications } from '@/features/notifications/services/notificationService'
import { getTabUnreadCounts } from '@/features/notifications/utils/notificationTabs'
import { RecentActivityList } from '@/features/dashboard/components/RecentActivityList'
import { RentRunwayHero } from '@/features/dashboard/components/RentRunwayHero'
import { ScoreRing } from '@/features/dashboard/components/ScoreRing'
import {
  fetchBenefitsStatus,
  fetchPendingPayments,
  fetchTransactions,
} from '@/features/dashboard/services/dashboardService'
import { RENT_VAULT_QUERY_KEY, useRentVault } from '@/features/dashboard/services/rentVaultService'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import {
  computeAnyOverdue,
  getRentDue,
  sortPendingPayments,
} from '@/features/dashboard/utils/rentDue'
import { useRsiEnrolment } from '@/features/rent-support-insurance/hooks/useRsiEnrolment'
import { hasRentalInfo } from '@/features/setup/profileCompletion'
import { formatDate } from '@/lib/format'
import { useResponsive } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

function PillarCard({
  title,
  badge,
  description,
  footer,
  onPress,
  icon,
  iconTint,
}: {
  title: string
  badge: string
  description: string
  footer: string
  onPress: () => void
  icon: ReactNode
  iconTint?: { color: string; bg: string }
}) {
  const { colors, radius, spacing } = useAppTheme()
  const { cardPadding } = useResponsive()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        backgroundColor: colors.bg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.shellBorder,
        padding: cardPadding,
        gap: spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: iconTint?.bg ?? colors.shellTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <BodyText weight="semibold">{title}</BodyText>
        </View>
        <CaptionText color="clay">{badge}</CaptionText>
      </View>
      <CaptionText color="textSecondary">{description}</CaptionText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <CaptionText color="clay">{footer}</CaptionText>
        <ChevronRight size={14} color={colors.clay} />
      </View>
    </Pressable>
  )
}

export function DashboardHomeScreen() {
  const { user } = useAuth()
  const { go } = useDashboardNavigation()
  const queryClient = useQueryClient()
  const { colors, radius, spacing } = useAppTheme()
  const { stackActions, cardPadding } = useResponsive()
  const [refreshing, setRefreshing] = useState(false)

  const pendingQuery = useQuery({
    queryKey: ['pending-payments'],
    queryFn: fetchPendingPayments,
  })
  const txQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })
  const benefitsQuery = useQuery({
    queryKey: ['benefits-status'],
    queryFn: fetchBenefitsStatus,
    retry: 1,
  })
  const { data: scoreProfile, isLoading: scoreLoading } = useScoreProfile()
  const { data: vault } = useRentVault()
  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 60_000,
  })
  const unreadNotifs = useMemo(() => {
    const list = notifQuery.data ?? []
    const counts = getTabUnreadCounts(list)
    return counts.Transactions + counts.Activities + counts.Services
  }, [notifQuery.data])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['benefits-status'] }),
        queryClient.invalidateQueries({ queryKey: ['score-profile'] }),
        queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['rent-deposit-summary'] }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [queryClient])

  const pendingPayments = sortPendingPayments(pendingQuery.data ?? [], user)
  const completedPayments = txQuery.data ?? []
  const rentDue = getRentDue(pendingPayments, user)
  const anyOverdue = computeAnyOverdue(pendingPayments)

  const credScore = scoreProfile?.score ?? 0
  const maxScore = scoreProfile?.maxScore ?? 1000
  const rank = scoreProfile?.rank ?? 'N/A'
  const band = scoreProfile?.band ?? 'STARTER'
  const isScorable = scoreProfile?.isScorable ?? false
  const onTimePct = Math.round(scoreProfile?.metrics?.ptPercentage ?? 0)
  const streak = scoreProfile?.metrics?.longestStreak ?? 0
  const profileCompletion = scoreProfile?.profile?.profileCompletion ?? 0

  const ringPct = Math.min(100, Math.max((credScore / maxScore) * 100, 4))
  const displayBand =
    !isScorable || band.toLowerCase().includes('not score') ? 'STARTER' : band.toUpperCase()

  const benefitsActive = benefitsQuery.data?.isActive ?? false
  const benefitsEndsAt = benefitsQuery.data?.endsAt ?? null

  const { enrolments: rsiEnrolments, loaded: rsiLoaded } = useRsiEnrolment()
  const activePropertyUuids = useMemo(
    () =>
      (user?.properties ?? []).filter((p) => !p.isPastTenancy).map((p) => p.uuid || String(p.id)),
    [user?.properties],
  )
  const showRsiPillar = hasRentalInfo(user) && activePropertyUuids.length > 0
  const rsiAllEnrolled =
    rsiLoaded &&
    activePropertyUuids.length > 0 &&
    activePropertyUuids.every((uuid) =>
      rsiEnrolments.some((record) => record.form.propertyUuid === uuid),
    )
  const rsiPendingCount = rsiEnrolments.filter((r) => r.status === 'pending_activation').length

  const showActivityCenter =
    pendingPayments.length > 0 ||
    !hasRentalInfo(user) ||
    (user?.verificationOn !== false && !user?.isIdentityVerified)

  const loadingInitial =
    pendingQuery.isLoading && txQuery.isLoading && scoreLoading && !pendingQuery.data

  if (loadingInitial) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  const chipRow = {
    flexDirection: stackActions ? ('column' as const) : ('row' as const),
    flexWrap: 'wrap' as const,
    gap: spacing[2],
  }

  return (
    <Screen
      scroll
      background="shell"
      contentStyle={{ gap: spacing[5], paddingBottom: spacing[10] }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.clay} />
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing[3],
        }}
      >
        <View style={{ flex: 1, gap: spacing[1] }}>
          <EyebrowText color="clay">Dashboard</EyebrowText>
          <TitleText>Hi, {getUserDisplayName(user)}</TitleText>
        </View>
        <Pressable
          onPress={() => go(DASHBOARD_HREF.notifications)}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={{
            padding: 10,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.shellBorder,
            backgroundColor: colors.bg,
          }}
        >
          <Bell size={20} color={colors.clay} />
          {unreadNotifs > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.error,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <CaptionText style={{ color: colors.bg, fontSize: 9, fontWeight: '700' }}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </CaptionText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {needsProfileSetup(user) ? (
        <View
          style={{
            backgroundColor: colors.shellTint,
            borderRadius: radius.xl,
            padding: cardPadding,
            gap: spacing[3],
            borderWidth: 1,
            borderColor: colors.shellBorder,
          }}
        >
          <HeadingText>Complete your rent profile</HeadingText>
          <BodyText color="textSecondary">Unlock pay rent, score tracking, and reminders.</BodyText>
          <Button fullWidth onPress={() => go(getPostAuthSetupPath(user))}>
            Continue setup
          </Button>
        </View>
      ) : null}

      {showActivityCenter && anyOverdue ? (
        <View
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: radius.lg,
            padding: cardPadding,
            borderWidth: 1,
            borderColor: '#fecaca',
            gap: spacing[2],
          }}
        >
          <EyebrowText color="error">Critical actions</EyebrowText>
          <BodyText color="text">You have overdue rent or payments that need attention.</BodyText>
          <Button
            variant="danger"
            fullWidth
            onPress={() => go(rentDue?.href || DASHBOARD_HREF.payRent)}
          >
            Pay now
          </Button>
        </View>
      ) : null}

      <RentRunwayHero rentDue={rentDue} vault={vault} />

      <Pressable
        onPress={() => go(DASHBOARD_HREF.scoreBreakdown)}
        accessibilityRole="button"
        accessibilityLabel="View score breakdown"
        style={({ pressed }) => ({
          backgroundColor: colors.clayDeep,
          borderRadius: radius.xl,
          padding: cardPadding,
          gap: spacing[3],
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] }}>
          <View style={{ flex: 1, gap: spacing[2] }}>
            <CaptionText color="bg" style={{ opacity: 0.85 }}>
              Upward Rent Score
            </CaptionText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <TitleText color="bg">{credScore}</TitleText>
              <BodyText color="bg" style={{ opacity: 0.7 }}>
                / {maxScore}
              </BodyText>
            </View>
            <CaptionText color="bg" style={{ opacity: 0.85 }}>
              {isScorable
                ? 'Verified Rental Reputation'
                : 'Starter Profile • Building Track Record'}
            </CaptionText>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: radius.full,
              }}
            >
              <CaptionText color="bg">View full breakdown</CaptionText>
              <ChevronRight size={13} color={colors.bg} />
            </View>
          </View>
          <ScoreRing percentage={ringPct} band={displayBand} rank={rank} />
        </View>
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.bg,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.shellBorder,
          paddingVertical: spacing[4],
        }}
      >
        {[
          { icon: Flame, value: String(streak), label: 'Payment Streak', active: streak > 0 },
          {
            icon: ShieldCheck,
            value: `${onTimePct}%`,
            label: 'On-Time Rate',
            active: onTimePct > 0,
          },
          {
            icon: Zap,
            value: `${profileCompletion}%`,
            label: 'Profile Health',
            active: profileCompletion > 0,
          },
        ].map((metric, idx) => {
          const Icon = metric.icon
          return (
            <View
              key={metric.label}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 4,
                borderRightWidth: idx < 2 ? 1 : 0,
                borderRightColor: colors.shellBorder,
              }}
            >
              <Icon size={18} color={metric.active ? colors.clay : colors.textMuted} />
              <BodyText weight="semibold">{metric.value}</BodyText>
              <CaptionText color="textSecondary" style={{ textAlign: 'center' }}>
                {metric.label}
              </CaptionText>
            </View>
          )
        })}
      </View>

      <View style={chipRow}>
        <Button
          variant="secondary"
          size="sm"
          fullWidth={stackActions}
          onPress={() => go(DASHBOARD_HREF.savings)}
          style={{ flex: stackActions ? undefined : 1 }}
        >
          Rent Vault (14.5%)
        </Button>
        <Button
          size="sm"
          fullWidth={stackActions}
          onPress={() => go(DASHBOARD_HREF.payRent)}
          style={{ flex: stackActions ? undefined : 1 }}
        >
          Pay Rent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth={stackActions}
          onPress={() => go(DASHBOARD_HREF.exclusiveHomes)}
          style={{ flex: stackActions ? undefined : 1 }}
        >
          Save for Home
        </Button>
      </View>

      <RentDepositCard />

      <MyHomeQuickHub />

      <PillarCard
        title="Exclusive Homes"
        badge="Alliance"
        description="Browse verified rentals from Upward Alliance managers and inquire with your Rent Passport."
        footer="Explore listings"
        onPress={() => go(DASHBOARD_HREF.exclusiveHomes)}
        icon={<Home size={18} color={colors.clay} />}
      />

      {showRsiPillar ? (
        <PillarCard
          title="Rent Support Insurance"
          badge={
            rsiAllEnrolled ? (rsiPendingCount > 0 ? 'Pending activation' : 'Enrolled') : 'Enrol'
          }
          description="Life policy taken for your landlord’s benefit — death, disability, and qualifying job loss cover."
          footer={rsiAllEnrolled ? 'View enrolment' : 'Start enrolment'}
          onPress={() => go(DASHBOARD_HREF.rentSupportInsurance)}
          icon={<Shield size={18} color={colors.clay} />}
        />
      ) : null}

      <PillarCard
        title="Emergency Cash Advance"
        badge="Up to 40%"
        description="Borrow against your rent vault during emergencies. Remaining principal keeps compounding at 14.5% p.a."
        footer="Access Emergency Advance"
        onPress={() => go(DASHBOARD_HREF.savings)}
        icon={<Sparkles size={18} color={colors.clay} />}
      />

      <PillarCard
        title="Tenant Protection Package"
        badge={benefitsActive ? 'Active Cover' : 'Annual Cover'}
        description={
          benefitsActive
            ? `Your tenancy protection is active${benefitsEndsAt ? ` until ${formatDate(benefitsEndsAt)}` : ''}.`
            : 'Coverage against job loss, medical rent support, and eviction defense.'
        }
        footer={benefitsActive ? 'View Active Policy' : 'Activate Account Protection'}
        onPress={() => go(DASHBOARD_HREF.benefits)}
        icon={<ShieldAlert size={18} color={benefitsActive ? '#10b981' : colors.clay} />}
        iconTint={benefitsActive ? { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' } : undefined}
      />

      <RecentActivityList transactions={completedPayments} />
    </Screen>
  )
}
