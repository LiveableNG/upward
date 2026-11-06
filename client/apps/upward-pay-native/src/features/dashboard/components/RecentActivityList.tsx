import { ArrowDownRight, ArrowUpRight, Receipt } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { BodyText, CaptionText, HeadingText } from '@/components/text'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { type CompletedPayment } from '@/features/dashboard/types'
import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { useAppTheme } from '@/theme'

type RecentActivityListProps = {
  transactions: CompletedPayment[]
}

export function RecentActivityList({ transactions }: RecentActivityListProps) {
  const { go } = useDashboardNavigation()
  const { colors, radius, spacing } = useAppTheme()
  const recent = transactions.slice(0, 3)

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <HeadingText>Recent Activity</HeadingText>
        {recent.length > 0 ? (
          <Pressable onPress={() => go(DASHBOARD_HREF.transactions)} accessibilityRole="button">
            <CaptionText color="clay">View all →</CaptionText>
          </Pressable>
        ) : null}
      </View>

      {recent.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            padding: spacing[6],
            gap: spacing[3],
            backgroundColor: colors.bg,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.shellBorder,
          }}
        >
          <Receipt size={28} color={colors.textMuted} />
          <BodyText weight="semibold">No transactions yet</BodyText>
          <CaptionText color="textSecondary" style={{ textAlign: 'center' }}>
            Start your rent runway or make a payment to build your verified tenancy record.
          </CaptionText>
          <Button variant="secondary" onPress={() => go(DASHBOARD_HREF.savings)}>
            Start Rent Savings
          </Button>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: colors.bg,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.shellBorder,
            overflow: 'hidden',
          }}
        >
          {recent.map((tx, index) => {
            const isCredit = tx.type === 'credit'
            return (
              <Pressable
                key={tx.uuid}
                onPress={() => go(DASHBOARD_HREF.receipt(tx.uuid))}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  padding: spacing[4],
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.shellBorder,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.full,
                    backgroundColor: isCredit ? 'rgba(22,163,74,0.1)' : colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCredit ? (
                    <ArrowUpRight size={16} color="#16a34a" />
                  ) : (
                    <ArrowDownRight size={16} color={colors.textSecondary} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <BodyText weight="semibold" numberOfLines={1}>
                    {tx.company_name}
                  </BodyText>
                  <CaptionText color="textSecondary">
                    {tx.channel || 'Paystack'} · {formatDate(tx.paid_at)} · {formatTime(tx.paid_at)}
                  </CaptionText>
                </View>
                <BodyText color={isCredit ? 'success' : 'text'}>
                  {isCredit ? '+' : '-'}
                  {formatCurrency(tx.amount, tx.currency)}
                </BodyText>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}
