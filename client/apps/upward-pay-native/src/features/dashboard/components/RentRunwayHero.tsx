import { Calendar, Clock, Lock, Sparkles, TrendingUp } from 'lucide-react-native'
import { type ReactNode } from 'react'
import { View } from 'react-native'

import { Button, type ButtonProps } from '@/components/button/Button'
import { BodyText, CaptionText, EyebrowText, HeadingText } from '@/components/text'
import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { type RentDueInfo, type RentVault } from '@/features/dashboard/types'
import { formatCurrency } from '@/lib/format'
import { useResponsive } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

type RentRunwayHeroProps = {
  rentDue: RentDueInfo | null
  vault: RentVault | null | undefined
}

export function RentRunwayHero({ rentDue, vault }: RentRunwayHeroProps) {
  const { go } = useDashboardNavigation()
  const { colors, radius, spacing } = useAppTheme()
  const { stackActions, cardPadding } = useResponsive()

  const shellStyle = {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.shellBorder,
    padding: cardPadding,
    gap: spacing[4],
  } as const

  const actionRow = {
    flexDirection: stackActions ? ('column' as const) : ('row' as const),
    gap: spacing[3],
    width: '100%' as const,
  }

  function HeroAction({
    children,
    variant = 'primary',
    onPress,
  }: {
    children: ReactNode
    variant?: ButtonProps['variant']
    onPress: () => void
  }) {
    return (
      <Button
        variant={variant}
        fullWidth={stackActions}
        onPress={onPress}
        style={stackActions ? undefined : { flex: 1, minWidth: 0 }}
      >
        {children}
      </Button>
    )
  }

  if (vault && vault.lock_status !== 'SETTLED' && vault.lock_status !== 'BROKEN_OUT') {
    const currentBalanceNaira = vault.current_balance_kobo / 100
    const targetAmountNaira = vault.target_amount_kobo / 100
    const accruedYieldNaira = vault.accrued_yield_kobo / 100
    const dailyRate = vault.daily_yield_rate || 0.145 / 365
    const estimatedDailyAddNaira = currentBalanceNaira * dailyRate
    const isSettlementReady = vault.days_to_unlock <= 0 || vault.lock_status === 'SETTLEMENT_READY'

    return (
      <View style={shellStyle}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Lock size={12} color={colors.clay} />
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
            <CaptionText color="clayDeep">{vault.days_remaining} Days to Rent Day</CaptionText>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <CaptionText color="textSecondary">
            Target: {formatCurrency(targetAmountNaira)} due on{' '}
            {new Date(vault.contractual_due_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </CaptionText>
          <HeadingText>{formatCurrency(currentBalanceNaira)}</HeadingText>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <CaptionText color="textSecondary">Target Progress</CaptionText>
            <CaptionText color="text">{vault.target_completion_percentage}%</CaptionText>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.surface2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.min(100, vault.target_completion_percentage)}%`,
                backgroundColor: colors.clay,
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
            <BodyText color="text">+{formatCurrency(accruedYieldNaira)} profit earned</BodyText>
          </View>
          <CaptionText color="textSecondary">
            (+{formatCurrency(estimatedDailyAddNaira)} added today @ 14.5% p.a.)
          </CaptionText>
        </View>

        <View style={actionRow}>
          <HeroAction onPress={() => go('/dashboard/savings?fund=1')}>Fund Vault</HeroAction>
          <HeroAction variant="secondary" onPress={() => go('/dashboard/savings')}>
            Manage Vault
          </HeroAction>
        </View>
      </View>
    )
  }

  if (rentDue && rentDue.days > 45) {
    const targetAmount = rentDue.amount || 0
    const monthsRemaining = Math.max(1, Math.round(rentDue.days / 30))
    const monthlyDeposit = Math.round(targetAmount / monthsRemaining)
    const estimatedYieldNaira = Math.round(targetAmount * 0.145 * (rentDue.days / 365) * 0.52)

    return (
      <View style={shellStyle}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} color={colors.clay} />
            <EyebrowText color="clay">RENT RUNWAY · 14.5% COMPOUND YIELD</EyebrowText>
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
            <CaptionText color="clayDeep">{rentDue.days} Days to Next Rent</CaptionText>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <CaptionText color="textSecondary">
            Target Rent Obligation · {rentDue.address}
          </CaptionText>
          <HeadingText>{formatCurrency(targetAmount, rentDue.currency)}</HeadingText>
        </View>

        <View
          style={{
            backgroundColor: 'rgba(22, 163, 74, 0.06)',
            borderRadius: radius.md,
            padding: spacing[3],
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={15} color="#16a34a" />
            <BodyText color="text">
              Earn up to +{formatCurrency(estimatedYieldNaira)} in compound returns
            </BodyText>
          </View>
          <CaptionText color="textSecondary">
            Save approx. {formatCurrency(monthlyDeposit)}/month at 14.5% daily compounding.
          </CaptionText>
        </View>

        <View style={actionRow}>
          <HeroAction onPress={() => go('/dashboard/savings/create')}>
            Lock Rent Runway & Earn 14.5%
          </HeroAction>
          <HeroAction variant="secondary" onPress={() => go(rentDue.href)}>
            Pay Rent Early
          </HeroAction>
        </View>
      </View>
    )
  }

  const amountToPay = rentDue?.amount || 0
  const isUrgent = rentDue && (rentDue.days <= 14 || rentDue.isOverdue)

  return (
    <View
      style={[
        shellStyle,
        isUrgent && rentDue?.isOverdue
          ? { borderColor: colors.error, backgroundColor: '#fffafa' }
          : null,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={12} color={rentDue?.isOverdue ? colors.error : colors.clay} />
          <EyebrowText color={rentDue?.isOverdue ? 'error' : 'clay'}>
            {rentDue?.isOverdue ? 'OVERDUE RENT PAYMENT' : 'UPCOMING RENT OBLIGATION'}
          </EyebrowText>
        </View>
        {rentDue ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: rentDue.isOverdue ? '#fee2e2' : colors.shellTint,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.full,
            }}
          >
            <Calendar size={12} color={rentDue.isOverdue ? colors.error : colors.clayDeep} />
            <CaptionText color={rentDue.isOverdue ? 'error' : 'clayDeep'}>
              {rentDue.isOverdue ? `${rentDue.days} Days Overdue` : `Due in ${rentDue.days} Days`}
            </CaptionText>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <CaptionText color="textSecondary">{rentDue?.address || 'Your Primary Home'}</CaptionText>
        <HeadingText>
          {amountToPay > 0
            ? formatCurrency(amountToPay, rentDue?.currency || 'NGN')
            : 'No Pending Rent'}
        </HeadingText>
      </View>

      <View style={actionRow}>
        {amountToPay > 0 ? (
          <>
            <HeroAction onPress={() => go(rentDue?.href || '/dashboard/pay-rent')}>
              {rentDue?.isOverdue ? 'Pay Overdue Rent Now' : 'Pay Rent Now'}
            </HeroAction>
            <HeroAction variant="secondary" onPress={() => go('/dashboard/savings/create')}>
              Setup Next Year&apos;s Vault
            </HeroAction>
          </>
        ) : (
          <HeroAction onPress={() => go('/dashboard/savings/create')}>
            Setup Rent Savings Vault (Earn 14.5%)
          </HeroAction>
        )}
      </View>
    </View>
  )
}
