import * as WebBrowser from 'expo-web-browser'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import {
  getRentDepositReceiptUrl,
  getRentDepositSummary,
  type RentDepositSummary,
} from '@/features/payments/services/paymentService'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

export function DepositBalanceScreen() {
  const router = useRouter()
  const { colors, spacing } = useAppTheme()

  const query = useQuery({
    queryKey: ['rent-deposit-summary'],
    queryFn: () => getRentDepositSummary(),
  })

  const summary = query.data
  const balance = summary?.availableBalance ?? 0
  const currency = summary?.currency ?? 'NGN'
  const history = summary?.history ?? []

  return (
    <Screen scroll background="shell">
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Wallet</EyebrowText>
      <TitleText>Rent deposit balance</TitleText>
      <BodyText color="textSecondary">
        Advance deposits and overpayment credits linked to your tenancy.
      </BodyText>

      {query.isLoading ? <ActivityIndicator color={colors.clay} /> : null}

      <Card tone="tint" style={{ gap: spacing[2], alignItems: 'center' }}>
        <Sparkles size={24} color={colors.clay} />
        <TitleText>{formatCurrency(balance, currency)}</TitleText>
        <CaptionText color="textSecondary">Available to apply on Pay Rent</CaptionText>
      </Card>

      {summary?.property?.dva?.accountNumber ? (
        <Card style={{ gap: spacing[2] }}>
          <BodyText weight="semibold">Top-up account</BodyText>
          <CaptionText color="textSecondary">
            {summary.property.dva.bankName} · {summary.property.dva.accountNumber}
          </CaptionText>
        </Card>
      ) : null}

      {history.length > 0 ? (
        <View style={{ gap: spacing[3] }}>
          <BodyText weight="semibold">Recent activity</BodyText>
          {history.map((row) => (
            <HistoryRow key={row.uuid} row={row} currency={currency} />
          ))}
        </View>
      ) : null}
    </Screen>
  )
}

function HistoryRow({
  row,
  currency,
}: {
  row: NonNullable<RentDepositSummary['history']>[number]
  currency: string
}) {
  const openReceipt = async () => {
    try {
      const res = await getRentDepositReceiptUrl(row.uuid)
      if (res.url) await WebBrowser.openBrowserAsync(res.url)
    } catch {
      // ignore
    }
  }

  return (
    <Card style={{ gap: 4 }}>
      <BodyText weight="semibold">{row.type?.replace(/_/g, ' ') ?? 'Movement'}</BodyText>
      <BodyText>{formatCurrency(row.amount, currency)}</BodyText>
      <CaptionText color="textMuted">{formatDate(row.createdAt)}</CaptionText>
      {row.uuid ? (
        <Pressable onPress={() => void openReceipt()} accessibilityRole="button">
          <CaptionText color="clay">View receipt</CaptionText>
        </Pressable>
      ) : null}
    </Card>
  )
}
