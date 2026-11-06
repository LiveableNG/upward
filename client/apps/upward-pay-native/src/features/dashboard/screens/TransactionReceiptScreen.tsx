import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { ActivityIndicator, Pressable, Share, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import {
  fetchReceiptPdfUrl,
  fetchTransactionDetail,
  type ReceiptPdfPayload,
} from '@/features/dashboard/services/transactionService'
import { useAuth } from '@/features/auth/AuthProvider'
import { getUserDisplayName } from '@/features/auth/session'
import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

function buildReceiptPayload(
  tx: Awaited<ReturnType<typeof fetchTransactionDetail>>,
  tenantName: string,
): ReceiptPdfPayload {
  const lineItems =
    tx.lineItems?.map((item) => ({
      label: String(item.label ?? item.name ?? 'Item'),
      amount: Number(item.amount ?? item.totalAmount ?? 0),
      category: 'Package',
    })) ??
    tx.paymentRequest?.lineItemRecords?.map((item) => ({
      label: String(item.name ?? 'Item'),
      amount: Number(item.totalAmount ?? 0),
      category: 'Package',
    })) ??
    []

  const paidAt = tx.createdAt ?? new Date().toISOString()
  const isCredit = tx.transactionType === 'FUTURE_CREDIT'

  return {
    title: isCredit ? 'Future Credit Receipt' : 'Rent Payment Receipt',
    receiptNumber: tx.uuid,
    paidAt,
    tenantName,
    landlordName: tx.narration ?? 'Landlord',
    paymentType: tx.type ?? 'RENT',
    propertyAddress: tx.propertyAddress ?? tx.paymentRequest?.propertyLocation ?? '',
    amount: tx.amount,
    currency: tx.currency,
    reference: tx.reference,
    channel: tx.channel ?? 'Paystack',
    type: isCredit ? 'SAVINGS' : 'RENT',
    status: tx.status,
    lineItems,
  }
}

export function TransactionReceiptScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, spacing } = useAppTheme()
  const params = useLocalSearchParams<{ id?: string }>()
  const id = typeof params.id === 'string' ? params.id : ''

  const query = useQuery({
    queryKey: ['transaction', id],
    enabled: !!id,
    queryFn: () => fetchTransactionDetail(id),
  })

  const getReceiptPdfUrl = async () => {
    if (!query.data) return null
    const payload = buildReceiptPayload(query.data, getUserDisplayName(user))
    return fetchReceiptPdfUrl(payload)
  }

  const openReceipt = async () => {
    try {
      const url = await getReceiptPdfUrl()
      if (url) await WebBrowser.openBrowserAsync(url)
    } catch (err) {
      console.warn(getErrorMessage(err))
    }
  }

  const shareReceipt = async () => {
    if (!query.data) return
    try {
      const url = await getReceiptPdfUrl()
      const tx = query.data
      await Share.share({
        message: [
          `${tx.narration ?? 'Rent payment'} — ${formatCurrency(tx.amount, tx.currency)}`,
          tx.reference ? `Reference: ${tx.reference}` : null,
          url ? `Receipt: ${url}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        url: url ?? undefined,
      })
    } catch {
      /* dismissed */
    }
  }

  if (!id) {
    return (
      <Screen scroll background="shell">
        <BodyText color="error">Missing transaction id.</BodyText>
      </Screen>
    )
  }

  if (query.isLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Screen scroll background="shell">
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
        >
          <ChevronLeft size={22} color={colors.textSecondary} />
          <BodyText color="textSecondary">Back</BodyText>
        </Pressable>
        <Card tone="tint">
          <HeadingText>Could not load receipt</HeadingText>
          <Button fullWidth onPress={() => query.refetch()}>
            Retry
          </Button>
        </Card>
      </Screen>
    )
  }

  const tx = query.data
  const paidAt = tx.createdAt ?? ''

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

      <EyebrowText color="clay">Verified receipt</EyebrowText>
      <TitleText>{tx.narration ?? 'Payment'}</TitleText>
      {tx.propertyAddress ? <BodyText color="textSecondary">{tx.propertyAddress}</BodyText> : null}

      <Card style={{ gap: spacing[3] }}>
        <HeadingText>{formatCurrency(tx.amount, tx.currency)}</HeadingText>
        {paidAt ? (
          <CaptionText color="textSecondary">
            {formatDate(paidAt)} · {formatTime(paidAt)}
          </CaptionText>
        ) : null}
        {tx.status ? <CaptionText color="textMuted">Status: {tx.status}</CaptionText> : null}
        {tx.channel ? <CaptionText color="textMuted">Channel: {tx.channel}</CaptionText> : null}
        {tx.reference ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <CaptionText color="textMuted" style={{ flex: 1 }}>
              Ref: {tx.reference}
            </CaptionText>
            <Pressable
              onPress={() => Clipboard.setStringAsync(tx.reference!)}
              accessibilityRole="button"
            >
              <CaptionText color="clay">Copy</CaptionText>
            </Pressable>
          </View>
        ) : null}
      </Card>

      {(tx.lineItems?.length ?? tx.paymentRequest?.lineItemRecords?.length) ? (
        <Card>
          <HeadingText>Line items</HeadingText>
          {(tx.lineItems ?? tx.paymentRequest?.lineItemRecords ?? []).map((item, idx) => {
            const label = String('label' in item ? item.label : 'name' in item ? item.name : 'Item')
            const amount = Number(
              'amount' in item
                ? (item.amount ?? item.totalAmount)
                : 'totalAmount' in item
                  ? item.totalAmount
                  : 0,
            )
            return (
              <View
                key={`${label}-${idx}`}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.shellBorder,
                }}
              >
                <BodyText color="textSecondary">{label}</BodyText>
                <BodyText>{formatCurrency(amount, tx.currency)}</BodyText>
              </View>
            )
          })}
        </Card>
      ) : null}

      <Button fullWidth onPress={() => void openReceipt()}>
        View verified receipt (PDF)
      </Button>
      <Button variant="secondary" fullWidth onPress={() => void shareReceipt()}>
        Share receipt
      </Button>
    </Screen>
  )
}
