import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react-native'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { BodyText, CaptionText } from '@/components/text'
import {
  applyRentDeposit,
  getRentDepositSummary,
} from '@/features/payments/services/paymentService'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Props = {
  paymentRequestUuid: string
  propertyUuid?: string
  totalOwed: number
  onSettled: (transactionUuid?: string) => void
}

export function RentDepositApplyCard({
  paymentRequestUuid,
  propertyUuid,
  totalOwed,
  onSettled,
}: Props) {
  const { spacing } = useAppTheme()
  const queryClient = useQueryClient()

  const summaryQuery = useQuery({
    queryKey: ['rent-deposit-summary', propertyUuid ?? 'all'],
    queryFn: () => getRentDepositSummary(propertyUuid),
  })

  const balance = summaryQuery.data?.propertyBalance ?? summaryQuery.data?.availableBalance ?? 0

  const applyAmount = Math.min(balance, totalOwed)

  const mutation = useMutation({
    mutationFn: () =>
      applyRentDeposit({
        paymentRequestUuid,
        amountToApply: applyAmount,
      }),
    onSuccess: async (res) => {
      const txUuid = res.transactionUuid ?? res.data?.transactionUuid
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rent-deposit-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-request', paymentRequestUuid] }),
        queryClient.invalidateQueries({ queryKey: ['pending-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      ])
      onSettled(txUuid)
    },
  })

  if (summaryQuery.isLoading || applyAmount <= 0) return null

  return (
    <Card tone="tint" style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
        <Sparkles size={20} color="#d97757" />
        <View style={{ flex: 1, gap: 4 }}>
          <BodyText weight="semibold">Rent deposit balance</BodyText>
          <CaptionText color="textSecondary">
            {formatCurrency(balance)} available · apply up to {formatCurrency(applyAmount)} to this
            invoice without bank transfer.
          </CaptionText>
        </View>
      </View>
      {mutation.isError ? (
        <CaptionText color="error">{getErrorMessage(mutation.error)}</CaptionText>
      ) : null}
      <Button
        variant="secondary"
        fullWidth
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      >
        Apply {formatCurrency(applyAmount)} from deposit
      </Button>
    </Card>
  )
}
