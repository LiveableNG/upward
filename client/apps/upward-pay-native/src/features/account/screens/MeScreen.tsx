import { useRouter } from 'expo-router'
import {
  FileText,
  History,
  HelpCircle,
  Building2,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Shield,
  User,
  Wallet,
  Fingerprint,
} from 'lucide-react-native'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { ProfileAvatarPicker } from '@/features/account/components/ProfileAvatarPicker'
import { SettingsRow } from '@/features/account/components/SettingsRow'
import { useAuth } from '@/features/auth/AuthProvider'
import { getUserDisplayName } from '@/features/auth/session'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { useAppTheme } from '@/theme'

export function MeScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const { user, signOut } = useAuth()
  const { colors, spacing } = useAppTheme()
  const { data: score } = useScoreProfile()

  const displayName = getUserDisplayName(user)
  const credScore = score?.score ?? 0
  const maxScore = score?.maxScore ?? 1000

  return (
    <Screen scroll background="shell">
      <ProfileAvatarPicker size={72} />

      <EyebrowText color="clay">Account</EyebrowText>
      <TitleText>{displayName}</TitleText>
      <CaptionText color="textMuted">{user?.email}</CaptionText>

      {user?.isIdentityVerified ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <ShieldCheck size={14} color="#16a34a" />
          <CaptionText style={{ color: '#16a34a', fontWeight: '600' }}>
            Identity verified
          </CaptionText>
        </View>
      ) : (
        <CaptionText color="textSecondary">
          Complete verification to unlock full Rent Passport features.
        </CaptionText>
      )}

      <Card tone="tint" style={{ gap: spacing[2] }}>
        <CaptionText color="textMuted">Upward Rent Score</CaptionText>
        <BodyText weight="semibold">
          {credScore} / {maxScore}
        </BodyText>
        <Button variant="secondary" size="sm" onPress={() => go(DASHBOARD_HREF.scoreBreakdown)}>
          View Rent Passport
        </Button>
      </Card>

      {!user?.isIdentityVerified ? (
        <Card tone="tint" style={{ gap: spacing[2] }}>
          <BodyText weight="semibold">Verify your identity</BodyText>
          <CaptionText color="textSecondary">
            BVN or NIN verification unlocks Pay Rent and vault features.
          </CaptionText>
          <Button size="sm" onPress={() => go(DASHBOARD_HREF.verifyIdentity)}>
            Verify now
          </Button>
        </Card>
      ) : null}

      <Card style={{ paddingVertical: spacing[2], paddingHorizontal: 0 }}>
        {!user?.isIdentityVerified ? (
          <SettingsRow
            icon={<Fingerprint size={18} color={colors.clay} />}
            title="Identity verification"
            description="BVN or NIN"
            onPress={() => go(DASHBOARD_HREF.verifyIdentity)}
          />
        ) : null}
        <SettingsRow
          icon={<Shield size={18} color={colors.clay} />}
          title="Rent Support Insurance"
          description="Life policy enrolment for your tenancy"
          onPress={() => go(DASHBOARD_HREF.rentSupportInsurance)}
        />
        <SettingsRow
          icon={<Building2 size={18} color={colors.clay} />}
          title="Rental details"
          description="Edit address, rent, and landlord info"
          onPress={() => go(DASHBOARD_HREF.setupProperties)}
        />
        <SettingsRow
          icon={<Home size={18} color={colors.clay} />}
          title="Exclusive homes"
          description="Alliance listings and inquiries"
          onPress={() => go(DASHBOARD_HREF.exclusiveHomes)}
        />
        <SettingsRow
          icon={<User size={18} color={colors.clay} />}
          title="Personal details"
          description="Name, phone, date of birth"
          onPress={() => go('/dashboard/profile')}
        />
        <SettingsRow
          icon={<Wallet size={18} color={colors.clay} />}
          title="Banking & payouts"
          description="Refunds and overpayment payouts"
          onPress={() => go('/dashboard/profile/banking')}
        />
        <SettingsRow
          icon={<FileText size={18} color={colors.clay} />}
          title="Tenancy documents"
          description="View leases and agreements"
          onPress={() => go('/dashboard/profile/documents')}
        />
        <SettingsRow
          icon={<History size={18} color={colors.clay} />}
          title="Request past records"
          description="Landlord endorsement for off-platform rent"
          onPress={() => go(DASHBOARD_HREF.requestRecords)}
        />
        <SettingsRow
          icon={<HelpCircle size={18} color={colors.clay} />}
          title="Help & support"
          description="FAQs and support tickets"
          onPress={() => go(DASHBOARD_HREF.help)}
        />
        <SettingsRow
          icon={<Settings size={18} color={colors.clay} />}
          title="Settings"
          description="Password, feedback, account"
          onPress={() => go('/dashboard/settings')}
        />
      </Card>

      <Button
        variant="outline"
        fullWidth
        onPress={async () => {
          await signOut()
          router.replace('/welcome')
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogOut size={18} color={colors.textSecondary} />
          <BodyText>Sign out</BodyText>
        </View>
      </Button>
    </Screen>
  )
}
