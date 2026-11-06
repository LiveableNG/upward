import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Sparkles } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { BodyText, CaptionText } from '@/components/text'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { getRentDepositSummary } from '@/features/payments/services/paymentService'
import { formatCurrency } from '@/lib/format'
import { useAppTheme } from '@/theme'

export function RentDepositCard() {
  const { go } = useDashboardNavigation()
  const { colors, radius, spacing } = useAppTheme()

  const { data } = useQuery({
    queryKey: ['rent-deposit-summary'],
    queryFn: () => getRentDepositSummary(),
    staleTime: 30_000,
  })

  const balance = data?.availableBalance ?? 0
  const currency = data?.currency ?? 'NGN'
  if (balance <= 0) return null

  return (
    <Pressable
      onPress={() => go(DASHBOARD_HREF.depositBalance)}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: 'rgba(217, 119, 87, 0.25)',
        backgroundColor: colors.bg,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.md,
          backgroundColor: colors.shellTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={20} color={colors.clay} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <BodyText weight="semibold">Rent deposit balance</BodyText>
        <CaptionText color="textSecondary">
          {formatCurrency(balance, currency)} available to apply on rent invoices
        </CaptionText>
      </View>
      <ChevronRight size={18} color={colors.clay} />
    </Pressable>
  )
}
