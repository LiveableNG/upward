import { CheckCircle2, Flame, ShieldCheck } from 'lucide-react-native'
import { Image, View } from 'react-native'

import { UpwardLogo } from '@/components/brand/UpwardLogo'
import { BodyText, CaptionText, HeadingText, TitleText } from '@/components/text'
import { ScoreRing } from '@/features/dashboard/components/ScoreRing'
import { useAppTheme } from '@/theme'

export type ShareScoreStoryCardProps = {
  name: string
  profilePic?: string | null
  initials: string
  score: number
  maxScore: number
  rank: string
  band: string
  onTimePct: number
  longestStreak: number
  profileUrl: string
}

export function ShareScoreStoryCard({
  name,
  profilePic,
  initials,
  score,
  maxScore,
  rank,
  band,
  onTimePct,
  longestStreak,
  profileUrl,
}: ShareScoreStoryCardProps) {
  const { colors, radius, spacing } = useAppTheme()
  const safeMax = maxScore > 0 ? maxScore : 1000
  const ringPct = Math.min(100, Math.max((score / safeMax) * 100, 4))
  const displayUrl = profileUrl.replace(/^https?:\/\//, '')

  return (
    <View
      style={{
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: '#1c1917',
        padding: spacing[5],
        gap: spacing[4],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <UpwardLogo size={36} />
        <View>
          <CaptionText style={{ color: '#faf9f5', letterSpacing: 2, fontWeight: '600' }}>
            UPWARD PAY
          </CaptionText>
          <CaptionText style={{ color: 'rgba(250,249,245,0.65)' }}>Rent Passport™</CaptionText>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(255,255,255,0.08)',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: radius.full,
        }}
      >
        <ShieldCheck size={16} color="#faf9f5" />
        <CaptionText style={{ color: '#faf9f5', fontWeight: '600' }}>
          Official Tenant Credential
        </CaptionText>
      </View>

      <View style={{ alignItems: 'center', gap: spacing[3] }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            backgroundColor: colors.shellTint,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={{ width: 72, height: 72 }} />
          ) : (
            <HeadingText style={{ color: colors.clay }}>{initials}</HeadingText>
          )}
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              backgroundColor: '#22c55e',
              borderRadius: radius.full,
              padding: 2,
            }}
          >
            <CheckCircle2 size={18} color="#fff" />
          </View>
        </View>
        <TitleText style={{ color: '#faf9f5', textAlign: 'center' }}>{name}</TitleText>
        <CaptionText style={{ color: '#22c55e' }}>Verified tenant</CaptionText>
      </View>

      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <ScoreRing percentage={ringPct} band={band} rank={rank} size={120} variant="onDark" />
        <HeadingText style={{ color: '#faf9f5' }}>
          {score} / {safeMax}
        </HeadingText>
        <CaptionText style={{ color: 'rgba(250,249,245,0.7)' }}>{band} band</CaptionText>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        <View style={{ flex: 1, gap: 4 }}>
          <CaptionText style={{ color: 'rgba(250,249,245,0.55)' }}>On-time</CaptionText>
          <BodyText style={{ color: '#faf9f5', fontWeight: '600' }}>
            {Math.round(onTimePct)}%
          </BodyText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Flame size={14} color="#f97316" />
            <CaptionText style={{ color: 'rgba(250,249,245,0.55)' }}>Best streak</CaptionText>
          </View>
          <BodyText style={{ color: '#faf9f5', fontWeight: '600' }}>
            {longestStreak} {longestStreak === 1 ? 'cycle' : 'cycles'}
          </BodyText>
        </View>
      </View>

      <CaptionText style={{ color: 'rgba(250,249,245,0.55)', textAlign: 'center' }}>
        {displayUrl}
      </CaptionText>
    </View>
  )
}
