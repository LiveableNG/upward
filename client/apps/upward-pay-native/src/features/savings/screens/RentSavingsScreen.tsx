import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native'
import { Calendar, ChevronLeft, Lock, Sparkles, TrendingUp } from 'lucide-react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { type RentVault } from '@/features/dashboard/types'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { RENT_VAULT_QUERY_KEY, useRentVault } from '@/features/dashboard/services/rentVaultService'
import { EmergencyAdvanceModal } from '@/features/savings/components/EmergencyAdvanceModal'
import { FairBreakoutModal } from '@/features/savings/components/FairBreakoutModal'
import { VaultSettlementModal } from '@/features/savings/components/VaultSettlementModal'
import { FundVaultModal } from '@/features/savings/components/FundVaultModal'
import { SavingsInvestorKycModal } from '@/features/savings/components/SavingsInvestorKycModal'
import { formatCurrency, formatDate } from '@/lib/format'
import { useQueryClient } from '@tanstack/react-query'
import { useAppTheme } from '@/theme'

function isActiveVault(lockStatus: string | undefined) {
  return lockStatus && lockStatus !== 'SETTLED' && lockStatus !== 'BROKEN_OUT'
}

export function RentSavingsScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { colors, radius, spacing } = useAppTheme()
  const params = useLocalSearchParams<{ fund?: string }>()
  const { data: vault, isLoading, isError, error, refetch, isFetching } = useRentVault()
  const [fundOpen, setFundOpen] = useState(false)
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [breakoutOpen, setBreakoutOpen] = useState(false)
  const [kycOpen, setKycOpen] = useState(false)
  const [settlementOpen, setSettlementOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (params.fund === '1' && vault && isActiveVault(vault.lock_status)) {
      setFundOpen(true)
    }
  }, [params.fund, vault])

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  const active = vault && isActiveVault(vault.lock_status)

  return (
    <Screen
      scroll
      background="shell"
      refreshControl={
        <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />
      }
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">14.5% p.a. · daily compound</EyebrowText>
      <TitleText>Rent vault</TitleText>
      <BodyText color="textSecondary">
        Save toward rent day with SEC-regulated money market yield and a dedicated funding account.
      </BodyText>

      {isError ? (
        <Card tone="tint">
          <HeadingText>Could not load vault</HeadingText>
          <BodyText color="textSecondary">
            {error instanceof Error ? error.message : 'Network error. Try again.'}
          </BodyText>
          <Button fullWidth onPress={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!active && !isError ? (
        <Card tone="tint" style={{ gap: spacing[3] }}>
          <HeadingText>Start your rent runway</HeadingText>
          <BodyText color="textSecondary">
            Lock a target amount and due date. We assign a dedicated bank account for free transfers
            and track compound returns until settlement day.
          </BodyText>
          {!user?.isIdentityVerified ? (
            <CaptionText color="clay">
              Complete investor KYC before creating a vault (SEC / ARM requirement).
            </CaptionText>
          ) : null}
          <Button variant="secondary" fullWidth onPress={() => setKycOpen(true)}>
            Complete investor KYC
          </Button>
          <Button variant="secondary" fullWidth onPress={() => go(DASHBOARD_HREF.rentCalculator)}>
            Try rent calculator
          </Button>
          <Button fullWidth onPress={() => go(DASHBOARD_HREF.savingsCreate)}>
            Create rent vault
          </Button>
        </Card>
      ) : null}

      {active && vault ? (
        <VaultDashboardBody
          vault={vault}
          onFund={() => setFundOpen(true)}
          onAdvance={() => setAdvanceOpen(true)}
          onBreakout={() => setBreakoutOpen(true)}
          onSettle={() => setSettlementOpen(true)}
        />
      ) : null}

      <FundVaultModal
        visible={fundOpen}
        onClose={() => setFundOpen(false)}
        dedicatedAccount={vault?.dedicated_account}
      />

      <SavingsInvestorKycModal
        visible={kycOpen}
        onClose={() => setKycOpen(false)}
        onSuccess={() => void queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })}
      />

      {vault?.vault_id && active ? (
        <VaultSettlementModal
          visible={settlementOpen}
          onClose={() => setSettlementOpen(false)}
          vault={vault}
        />
      ) : null}

      {vault?.vault_id ? (
        <FairBreakoutModal
          visible={breakoutOpen}
          onClose={() => setBreakoutOpen(false)}
          vaultId={vault.vault_id}
          principalKobo={vault.principal_kobo ?? vault.current_balance_kobo}
          accruedYieldKobo={vault.accrued_yield_kobo}
        />
      ) : null}

      {vault?.vault_id ? (
        <EmergencyAdvanceModal
          visible={advanceOpen}
          onClose={() => setAdvanceOpen(false)}
          vaultId={vault.vault_id}
          maxBorrowableKobo={vault.emergency_advance?.max_borrowable_kobo ?? 0}
          hasActiveLoan={vault.emergency_advance?.has_active_loan ?? false}
        />
      ) : null}
    </Screen>
  )
}

function VaultDashboardBody({
  vault,
  onFund,
  onAdvance,
  onBreakout,
  onSettle,
}: {
  vault: RentVault
  onFund: () => void
  onAdvance: () => void
  onBreakout: () => void
  onSettle: () => void
}) {
  const { colors, radius, spacing } = useAppTheme()
  const currentBalanceNaira = vault.current_balance_kobo / 100
  const targetAmountNaira = vault.target_amount_kobo / 100
  const accruedYieldNaira = vault.accrued_yield_kobo / 100
  const dailyRate = vault.daily_yield_rate || 0.145 / 365
  const estimatedDailyAddNaira = currentBalanceNaira * dailyRate
  const isSettlementReady = vault.days_to_unlock <= 0 || vault.lock_status === 'SETTLEMENT_READY'
  const daysLabel = vault.days_remaining ?? vault.days_to_unlock

  return (
    <View style={{ gap: spacing[4] }}>
      <View
        style={{
          backgroundColor: colors.bg,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.shellBorder,
          padding: spacing[4],
          gap: spacing[4],
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Lock size={13} color={colors.clay} />
            <EyebrowText color="clay">
              {isSettlementReady ? 'SETTLEMENT READY' : 'RENT VAULT · MATURITY LOCKED'}
            </EyebrowText>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.shellTint,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.full,
            }}
          >
            <Calendar size={12} color={colors.clayDeep} />
            <CaptionText color="clayDeep">{daysLabel} days to rent day</CaptionText>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <CaptionText color="textSecondary">
            Target: {formatCurrency(targetAmountNaira)} due on{' '}
            {formatDate(vault.contractual_due_date)}
          </CaptionText>
          <HeadingText>{formatCurrency(currentBalanceNaira)}</HeadingText>
        </View>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <CaptionText color="textSecondary">Target progress</CaptionText>
            <CaptionText weight="semibold">{vault.target_completion_percentage}%</CaptionText>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.shellTint,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.min(100, vault.target_completion_percentage)}%`,
                backgroundColor: colors.clay,
                borderRadius: radius.full,
              }}
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            borderRadius: radius.md,
            padding: spacing[3],
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={15} color="#16a34a" />
            <BodyText>+{formatCurrency(accruedYieldNaira)} profit earned</BodyText>
          </View>
          <CaptionText color="textSecondary">
            (+{formatCurrency(estimatedDailyAddNaira)} added today @ 14.5% p.a.)
          </CaptionText>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <Button onPress={onFund} style={{ flex: 1 }}>
            Fund vault
          </Button>
          <Button variant="secondary" onPress={onFund} style={{ flex: 1 }}>
            View DVA
          </Button>
        </View>

        <Pressable
          onPress={onAdvance}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            padding: spacing[3],
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.shellBorder,
            backgroundColor: colors.shellTint,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: colors.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color={colors.clay} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <BodyText weight="semibold">Emergency cash advance</BodyText>
            <CaptionText color="textSecondary">
              {vault.emergency_advance?.has_active_loan
                ? 'Active advance in progress'
                : `Borrow up to ${formatCurrency((vault.emergency_advance?.max_borrowable_kobo ?? 0) / 100)} (40%)`}
            </CaptionText>
          </View>
        </Pressable>

        {isSettlementReady ? (
          <Button fullWidth onPress={onSettle}>
            Settle rent to landlord
          </Button>
        ) : (
          <Pressable onPress={onBreakout} accessibilityRole="button">
            <CaptionText
              color="textMuted"
              style={{ textAlign: 'center', textDecorationLine: 'underline' }}
            >
              Need funds early? Review fair exit & breakout
            </CaptionText>
          </Pressable>
        )}
      </View>
    </View>
  )
}
