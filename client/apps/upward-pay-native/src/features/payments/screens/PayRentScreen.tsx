import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ChevronRight, Receipt } from 'lucide-react-native'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { fetchPendingPayments } from '@/features/dashboard/services/dashboardService'
import { sortPendingPayments } from '@/features/dashboard/utils/rentDue'
import { UnifiedCheckoutScreen } from '@/features/payments/screens/UnifiedCheckoutScreen'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

function remainingOnPending(p: {
  total_amount: number
  amountPaid: number
  lineItemRecords?: Array<{ name?: string; totalAmount?: number; amount?: number }>
}) {
  const records = p.lineItemRecords
  if (records?.length) {
    const sum = records.reduce((acc, item) => {
      const name = String(item.name ?? '')
      if (['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(name)) return acc
      return acc + Number(item.totalAmount ?? item.amount ?? 0)
    }, 0)
    if (sum > 0) return Math.max(0, sum - (p.amountPaid || 0))
  }
  return Math.max(0, p.total_amount - (p.amountPaid || 0))
}

export function PayRentScreen() {
  const { go, replace } = useDashboardNavigation()
  const { user } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const params = useLocalSearchParams<{ paymentUuid?: string }>()
  const paymentUuid = typeof params.paymentUuid === 'string' ? params.paymentUuid : undefined

  const pendingQuery = useQuery({
    queryKey: ['pending-payments'],
    queryFn: fetchPendingPayments,
  })

  if (paymentUuid) {
    return (
      <UnifiedCheckoutScreen
        paymentUuid={paymentUuid}
        onDone={() => replace(DASHBOARD_HREF.payRent)}
      />
    )
  }

  const pending = sortPendingPayments(pendingQuery.data ?? [], user)
  const properties = user?.properties?.filter((p) => !p.isPastTenancy) ?? []

  if (pendingQuery.isLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  return (
    <Screen scroll background="shell">
      <EyebrowText color="clay">PayRent™</EyebrowText>
      <TitleText>Pay rent</TitleText>
      <BodyText color="textSecondary">
        Pay pending invoices securely via bank transfer or Paystack.
      </BodyText>

      {pending.length === 0 ? (
        <Card tone="tint">
          <HeadingText>No pending invoices</HeadingText>
          <BodyText color="textSecondary">
            {properties.length > 0
              ? 'When your manager sends a rent invoice, it will appear here.'
              : 'Complete property setup to start paying rent through Upward.'}
          </BodyText>
          {properties.length === 0 ? (
            <Button fullWidth onPress={() => go(DASHBOARD_HREF.setupRental)}>
              Add property
            </Button>
          ) : null}
        </Card>
      ) : (
        <View style={{ gap: spacing[3] }}>
          <HeadingText>Pending</HeadingText>
          {pending.map((item) => {
            const remaining = remainingOnPending(item)
            const due = item.due_date || item.dueDate
            return (
              <Pressable
                key={item.uuid}
                onPress={() => go(`${DASHBOARD_HREF.payRent}?paymentUuid=${item.uuid}`)}
                accessibilityRole="button"
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: colors.shellBorder,
                  padding: spacing[4],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: colors.shellTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={20} color={colors.clay} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <BodyText weight="semibold">{item.company_name}</BodyText>
                  <CaptionText color="textSecondary" numberOfLines={1}>
                    {item.property_address || 'Rent payment'}
                    {due ? ` · Due ${formatDate(due)}` : ''}
                  </CaptionText>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <BodyText weight="semibold">{formatCurrency(remaining, item.currency)}</BodyText>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </Pressable>
            )
          })}
        </View>
      )}

      {properties.length > 0 ? (
        <View style={{ gap: spacing[3] }}>
          <HeadingText>Your properties</HeadingText>
          {properties.map((prop) => {
            const label = prop.location?.area
              ? `${prop.location.area}, ${prop.location.state ?? ''}`
              : prop.address
            return (
              <Card key={prop.uuid}>
                <BodyText weight="semibold">{label}</BodyText>
                {prop.rentAmount ? (
                  <CaptionText color="textSecondary">
                    Rent · {formatCurrency(prop.rentAmount)}
                  </CaptionText>
                ) : null}
                <CaptionText color="textMuted">
                  Self-initiated payments from the app are coming next; use a pending invoice when
                  available.
                </CaptionText>
              </Card>
            )
          })}
        </View>
      ) : null}
    </Screen>
  )
}
