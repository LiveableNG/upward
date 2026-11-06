import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Alert, Pressable, RefreshControl, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, Receipt } from 'lucide-react-native'
import { useMemo, useState } from 'react'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { fetchTransactions } from '@/features/dashboard/services/dashboardService'
import { type ActivityListItem, type TransactionCategory } from '@/features/dashboard/types'
import { gtRowToActivityItem } from '@/features/dashboard/utils/gtTransactions'
import {
  filterTransactions,
  groupTransactionsByMonth,
  sortMonthKeys,
  TX_FILTER_PILLS,
} from '@/features/dashboard/utils/transactions'
import { useAllGtTransactions } from '@/features/my-home/hooks/useAllGtTransactions'
import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { useAppTheme } from '@/theme'

function TransactionRow({ tx, onPress }: { tx: ActivityListItem; onPress: () => void }) {
  const { colors, radius, spacing } = useAppTheme()
  const isCredit = tx.type === 'credit'

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        opacity: pressed ? 0.9 : 1,
        backgroundColor: pressed ? colors.surface : colors.bg,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: isCredit ? 'rgba(22, 163, 74, 0.1)' : colors.shellTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isCredit ? (
          <ArrowUpRight size={16} color="#16a34a" />
        ) : (
          <ArrowDownRight size={16} color={colors.clay} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <BodyText weight="semibold">{tx.company_name}</BodyText>
        {tx.property_address ? (
          <CaptionText color="textSecondary" numberOfLines={1}>
            {tx.property_address}
          </CaptionText>
        ) : null}
        <CaptionText color="textMuted">
          {tx.channel ?? 'Paystack'} · {formatDate(tx.paid_at)} · {formatTime(tx.paid_at)}
        </CaptionText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <BodyText weight="semibold">
          {isCredit ? '+' : ''}
          {formatCurrency(tx.amount, tx.currency)}
        </BodyText>
        {tx.status ? <CaptionText color="textMuted">{tx.status.toLowerCase()}</CaptionText> : null}
      </View>
    </Pressable>
  )
}

export function TransactionsScreen() {
  const { colors, spacing, radius } = useAppTheme()
  const { go } = useDashboardNavigation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<TransactionCategory>('all')
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })

  const { transactions: gtRows, isLoading: gtLoading } = useAllGtTransactions()

  const list = useMemo(() => {
    const upward = data ?? []
    const gt = gtRows.map(gtRowToActivityItem)
    return [...upward, ...gt].sort(
      (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
    )
  }, [data, gtRows])

  const filtered = useMemo(
    () => filterTransactions(list, { search, category }),
    [list, search, category],
  )

  const grouped = useMemo(() => groupTransactionsByMonth(filtered), [filtered])
  const months = useMemo(() => sortMonthKeys(grouped), [grouped])

  const debitTotal = useMemo(
    () => list.filter((t) => t.type !== 'credit').reduce((s, t) => s + t.amount, 0),
    [list],
  )
  const paymentCount = useMemo(() => list.filter((t) => t.type !== 'credit').length, [list])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['my-home', 'transactions'] }),
    ])
    setRefreshing(false)
  }

  const openReceipt = (tx: ActivityListItem) => {
    if (tx.source === 'gt') {
      Alert.alert(
        'Receipt unavailable',
        'Estate payments from My Home do not have Upward receipts yet.',
      )
      return
    }
    go(`/dashboard/receipt?id=${encodeURIComponent(tx.uuid)}`)
  }

  if (isLoading || gtLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  const hasFilters = Boolean(search.trim()) || category !== 'all'

  return (
    <Screen
      scroll
      background="shell"
      refreshControl={
        <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />
      }
    >
      <EyebrowText color="clay">Activity</EyebrowText>
      <TitleText>Transactions</TitleText>
      <BodyText color="textSecondary">
        Upward payments plus My Home estate history when your property is linked.
      </BodyText>

      <Input
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Name, reference, address…"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {TX_FILTER_PILLS.map((pill) => {
          const active = category === pill.id
          return (
            <Pressable
              key={pill.id}
              onPress={() => setCategory(pill.id)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.full,
                backgroundColor: active ? colors.clay : colors.bg,
                borderWidth: 1,
                borderColor: active ? colors.clay : colors.shellBorder,
              }}
            >
              <CaptionText
                weight="semibold"
                style={{ color: active ? colors.bg : colors.textSecondary }}
              >
                {pill.label}
              </CaptionText>
            </Pressable>
          )
        })}
      </View>

      {list.length > 0 && !hasFilters ? (
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <Card style={{ flex: 1, gap: 4 }}>
            <CaptionText color="textMuted">Total paid</CaptionText>
            <BodyText weight="semibold">{formatCurrency(debitTotal, list[0]?.currency)}</BodyText>
          </Card>
          <Card style={{ flex: 1, gap: 4 }}>
            <CaptionText color="textMuted">Payments</CaptionText>
            <BodyText weight="semibold">{paymentCount}</BodyText>
          </Card>
        </View>
      ) : null}

      {isError ? (
        <Card tone="tint">
          <HeadingText>Could not load transactions</HeadingText>
          <Button fullWidth onPress={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {list.length === 0 && !isError && !hasFilters ? (
        <Card tone="tint" style={{ alignItems: 'center', gap: spacing[3] }}>
          <Receipt size={28} color={colors.textMuted} />
          <HeadingText>No transactions yet</HeadingText>
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Your payment history will appear here once you make your first payment.
          </BodyText>
          <Button fullWidth onPress={() => go(DASHBOARD_HREF.payRent)}>
            Pay rent now
          </Button>
        </Card>
      ) : null}

      {!isError && (list.length > 0 ? filtered.length === 0 : hasFilters) ? (
        <Card style={{ gap: spacing[3] }}>
          <HeadingText>
            {hasFilters ? 'No matching transactions' : 'No transactions yet'}
          </HeadingText>
          <BodyText color="textSecondary">
            {hasFilters
              ? 'Try another category or clear your search.'
              : 'Your payment history will appear here once you make your first payment.'}
          </BodyText>
          {hasFilters ? (
            <Button
              variant="secondary"
              fullWidth
              onPress={() => {
                setSearch('')
                setCategory('all')
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Button fullWidth onPress={() => go(DASHBOARD_HREF.payRent)}>
              Pay rent now
            </Button>
          )}
        </Card>
      ) : null}

      {months.map((month) => (
        <View key={month} style={{ gap: spacing[2] }}>
          <EyebrowText color="textMuted">{month.toUpperCase()}</EyebrowText>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {(grouped[month] ?? []).map((tx, idx) => (
              <View key={tx.uuid}>
                {idx > 0 ? (
                  <View
                    style={{ height: 1, backgroundColor: colors.shellBorder, marginLeft: 52 }}
                  />
                ) : null}
                <TransactionRow tx={tx} onPress={() => openReceipt(tx)} />
              </View>
            ))}
          </Card>
        </View>
      ))}

      {filtered.length > 0 && !hasFilters ? (
        <CaptionText color="textMuted" style={{ textAlign: 'center' }}>
          That&apos;s everything so far — keep it up.
        </CaptionText>
      ) : null}
    </Screen>
  )
}
