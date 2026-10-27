import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import {
  AlertCircle,
  ChevronLeft,
  Clock,
  Flame,
  History,
  Info,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { ShareScoreStoryCard } from '@/features/dashboard/components/share/ShareScoreStoryCard'
import { ScoreRing } from '@/features/dashboard/components/ScoreRing'
import { buildShareScoreMessage } from '@/features/dashboard/utils/shareScoreMessage'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { type ScorePaymentCycle } from '@/features/dashboard/types'
import { buildProfileShareUrl } from '@/features/dashboard/utils/profileShareUrl'
import {
  computeScoreVerification,
  cycleImpact,
  formatStatusLabel,
  impactLabel,
  sortCyclesNewestFirst,
  statusColor,
} from '@/features/dashboard/utils/scoreBreakdown'
import { useAuth } from '@/features/auth/AuthProvider'
import { getUserDisplayName } from '@/features/auth/session'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

function FactorCard({
  label,
  value,
  description,
  highlight,
  icon: Icon,
  width,
}: {
  label: string
  value: string
  description: string
  highlight?: boolean
  icon: typeof Clock
  width: number | `${number}%`
}) {
  const { colors, radius, spacing } = useAppTheme()

  return (
    <View
      style={{
        width,
        backgroundColor: highlight ? 'rgba(22, 163, 74, 0.06)' : colors.bg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: highlight ? 'rgba(22, 163, 74, 0.2)' : colors.shellBorder,
        padding: spacing[3],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: colors.shellTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={highlight ? '#16a34a' : colors.clay} />
        </View>
        <HeadingText style={{ fontSize: 22 }}>{value}</HeadingText>
      </View>
      <BodyText weight="semibold">{label}</BodyText>
      <CaptionText color="textSecondary">{description}</CaptionText>
    </View>
  )
}

function CycleImpactBadge({ cycle }: { cycle: ScorePaymentCycle }) {
  const { colors, radius, spacing } = useAppTheme()
  const impact = cycleImpact(cycle)
  const palette =
    impact === 'positive'
      ? { bg: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', Icon: TrendingUp }
      : impact === 'negative'
        ? { bg: 'rgba(220, 38, 38, 0.1)', color: colors.error, Icon: AlertCircle }
        : impact === 'neutral'
          ? { bg: colors.surface2, color: colors.textSecondary, Icon: History }
          : { bg: colors.surface2, color: colors.textMuted, Icon: Info }

  const ImpactIcon = palette.Icon

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: palette.bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.full,
      }}
    >
      <ImpactIcon size={12} color={palette.color} />
      <CaptionText style={{ color: palette.color, fontWeight: '600' }}>
        {impactLabel(impact)}
      </CaptionText>
    </View>
  )
}

function CycleRow({ cycle }: { cycle: ScorePaymentCycle }) {
  const { colors, radius, spacing } = useAppTheme()
  const color = statusColor(cycle.status)
  const due = cycle.dueDate ? new Date(cycle.dueDate) : null
  const monthYear =
    due && !Number.isNaN(due.getTime())
      ? due.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      : '—'

  return (
    <View
      style={{
        padding: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.shellBorder,
        gap: spacing[2],
      }}
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <View style={{ gap: 2, flex: 1 }}>
          <BodyText weight="semibold">{monthYear}</BodyText>
          <CaptionText color="textSecondary">
            Due {cycle.dueDate ? formatDate(cycle.dueDate) : '—'}
            {cycle.propertyLabel ? ` · ${cycle.propertyLabel}` : ''}
          </CaptionText>
        </View>
        <BodyText weight="semibold">{formatCurrency(cycle.amount, 'NGN')}</BodyText>
      </View>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], alignItems: 'center' }}
      >
        <CaptionText
          color="textMuted"
          style={{
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            fontWeight: '600',
          }}
        >
          {cycle.source.replace(/_/g, ' ')}
        </CaptionText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: `${color}33`,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
          <CaptionText style={{ color, fontWeight: '600' }}>
            {formatStatusLabel(cycle.status)}
          </CaptionText>
        </View>
        <CycleImpactBadge cycle={cycle} />
      </View>
    </View>
  )
}

export function ScoreBreakdownScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const { isCompact } = useResponsive()
  const { data: score, isLoading, isError, refetch } = useScoreProfile()
  const [copied, setCopied] = useState(false)
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false)

  const sortedCycles = useMemo(() => sortCyclesNewestFirst(score?.cycles ?? []), [score?.cycles])

  const factorWidth = isCompact ? ('100%' as const) : ('48%' as const)

  const profileIdentifier =
    score?.profile?.profileSlug || score?.profile?.uuid || user?.profileSlug || user?.uuid
  const shareUrl = buildProfileShareUrl(profileIdentifier)

  const copyShareLink = async () => {
    if (!shareUrl) return
    await Clipboard.setStringAsync(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shareNative = async () => {
    if (!shareUrl || !score) return
    const name = getUserDisplayName(user)
    try {
      await Share.share({
        message: buildShareScoreMessage({
          name,
          score: score.score,
          maxScore: score.maxScore,
          band: score.band ?? 'STARTER',
          onTimePct: score.metrics.ptPercentage ?? 0,
          longestStreak: score.metrics.longestStreak ?? 0,
          profileUrl: shareUrl,
        }),
        url: shareUrl,
      })
    } catch {
      /* user dismissed */
    }
  }

  const shareCardProps =
    score && shareUrl
      ? {
          name: getUserDisplayName(user),
          profilePic: user?.profilePic,
          initials: getUserDisplayName(user)
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          score: score.score,
          maxScore: score.maxScore,
          rank: score.rank,
          band: score.band ?? 'STARTER',
          onTimePct: score.metrics.ptPercentage ?? 0,
          longestStreak: score.metrics.longestStreak ?? 0,
          profileUrl: shareUrl,
        }
      : null

  if (isLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  if (isError || !score) {
    return (
      <Screen scroll background="shell">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
        >
          <ChevronLeft size={22} color={colors.textSecondary} />
          <BodyText color="textSecondary">Back</BodyText>
        </Pressable>
        <Card tone="tint">
          <HeadingText>Could not load score</HeadingText>
          <Button fullWidth onPress={() => refetch()}>
            Retry
          </Button>
        </Card>
      </Screen>
    )
  }

  const credScore = score.score
  const maxScore = score.maxScore > 0 ? score.maxScore : 1000
  const ringPct = Math.min(100, Math.max((credScore / maxScore) * 100, 4))
  const band = score.band?.toUpperCase() ?? 'STARTER'
  const isVerified = computeScoreVerification(score)
  const metrics = score.metrics
  const streak = metrics.longestStreak ?? 0

  const scoreFactors = [
    {
      label: 'Payment Timeliness',
      value: `${Math.round(metrics.ptPercentage ?? 0)}%`,
      icon: Clock,
      desc: 'How often you pay on or before the due date.',
    },
    {
      label: 'Payment Consistency',
      value: `${streak} ${streak === 1 ? 'cycle' : 'cycles'}`,
      icon: Flame,
      desc: 'Your longest continuous streak of on-time rent cycles.',
    },
    {
      label: 'Financial Discipline',
      value: `${Math.round(metrics.discipline ?? 0)}%`,
      icon: Target,
      desc: 'The ratio of full payments vs partial payments.',
    },
    {
      label: 'Tenure',
      value: `${metrics.historyYears ?? 0} ${(metrics.historyYears ?? 0) === 1 ? 'yr' : 'yrs'}`,
      icon: History,
      desc: 'Length of your verified rent payment history.',
    },
    {
      label: 'Savings Bonus',
      value: `+${metrics.savingsBonus ?? 0} pts`,
      icon: TrendingUp,
      desc: 'Bonus points awarded for your rent preparation savings.',
      highlight: true,
    },
  ]

  return (
    <Screen scroll background="shell">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Rent Passport™</EyebrowText>
      <TitleText>Upward Rent Score</TitleText>
      <BodyText color="textSecondary">
        How payment behavior, streak consistency, and tenancy history shape your rent credibility
        rating.
      </BodyText>

      <Card tone="tint" style={{ gap: spacing[4] }}>
        <View style={{ alignItems: 'center', gap: spacing[3] }}>
          <ScoreRing
            percentage={ringPct}
            band={band}
            rank={score.rank}
            size={148}
            variant="onLight"
          />
          <TitleText>
            {credScore} / {maxScore}
          </TitleText>
          <CaptionText color="textSecondary" style={{ textAlign: 'center' }}>
            {isVerified && score.isScorable
              ? 'Verified rental reputation from on-time payments, streaks, and savings discipline.'
              : 'Starter profile — complete verification and pay rent through Upward to activate your live score.'}
          </CaptionText>
        </View>

        <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: spacing[2] }}>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => void copyShareLink()}
            disabled={!shareUrl}
            style={{ flex: 1 }}
          >
            {copied ? 'Link copied!' : 'Copy profile link'}
          </Button>
          <Button
            size="sm"
            onPress={() => setSharePreviewOpen(true)}
            disabled={!shareUrl}
            style={{ flex: 1 }}
          >
            Share score
          </Button>
        </View>
        <Modal
          visible={sharePreviewOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSharePreviewOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.shellPageBg, padding: spacing[4] }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[3],
              }}
            >
              <TitleText>Share Rent Passport</TitleText>
              <Pressable onPress={() => setSharePreviewOpen(false)} accessibilityRole="button">
                <BodyText color="clay">Close</BodyText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[6] }}>
              {shareCardProps ? <ShareScoreStoryCard {...shareCardProps} /> : null}
              <Button fullWidth onPress={() => void shareNative()}>
                Share via messages or social
              </Button>
            </ScrollView>
          </View>
        </Modal>
        {!shareUrl ? (
          <CaptionText color="textMuted" style={{ textAlign: 'center' }}>
            Complete your profile to get a public Rent Passport link.
          </CaptionText>
        ) : null}
      </Card>

      {!isVerified ? (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing[3],
            backgroundColor: colors.shellTint,
            borderRadius: radius.lg,
            padding: spacing[3],
            borderWidth: 1,
            borderColor: colors.shellBorder,
          }}
        >
          <ShieldCheck size={20} color={colors.clay} />
          <View style={{ flex: 1, gap: 4 }}>
            <BodyText weight="semibold">Verification needed</BodyText>
            <CaptionText color="textSecondary">
              Connect with an Upward partner landlord to verify records and activate your live
              score.
            </CaptionText>
          </View>
        </View>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <EyebrowText color="clay">Key factors</EyebrowText>
          <CaptionText color="textMuted">5 metrics</CaptionText>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing[3],
            justifyContent: isCompact ? 'flex-start' : 'space-between',
          }}
        >
          {scoreFactors.map((factor) => (
            <FactorCard
              key={factor.label}
              label={factor.label}
              value={factor.value}
              description={factor.desc}
              highlight={factor.highlight}
              icon={factor.icon}
              width={factorWidth}
            />
          ))}
        </View>
      </View>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: spacing[4], gap: 4 }}>
          <HeadingText>Verified payment cycles</HeadingText>
          <CaptionText color="textSecondary">
            Every logged payment affects your score in real time.
          </CaptionText>
          {sortedCycles.length > 0 ? (
            <CaptionText color="textMuted">
              {sortedCycles.length} {sortedCycles.length === 1 ? 'cycle' : 'cycles'}
            </CaptionText>
          ) : null}
        </View>

        {sortedCycles.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              padding: spacing[5],
              gap: spacing[2],
              borderTopWidth: 1,
              borderTopColor: colors.shellBorder,
            }}
          >
            <History size={28} color={colors.textMuted} />
            <BodyText weight="semibold">No cycle history yet</BodyText>
            <CaptionText color="textSecondary" style={{ textAlign: 'center' }}>
              Recorded rent payments and landlord-verified cycles will show up here automatically.
            </CaptionText>
          </View>
        ) : (
          sortedCycles.map((cycle, idx) => (
            <CycleRow key={cycle.uuid ?? cycle.id ?? `${cycle.dueDate}-${idx}`} cycle={cycle} />
          ))
        )}
      </Card>
    </Screen>
  )
}
