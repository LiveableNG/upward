import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'

import { Card } from '@/components/card/Card'
import { BodyText, CaptionText, HeadingText } from '@/components/text'
import { MyHomeSectionShell } from '@/features/my-home/components/MyHomeSectionShell'
import { useSelectedProperty } from '@/features/my-home/context/MyHomePropertyContext'
import { asList, panelErrorMessage } from '@/features/my-home/hooks/normalizeTenantApp'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { PendingBill } from '@/features/my-home/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

export function EstatePaymentsScreen() {
  const { selectedUuid } = useSelectedProperty()
  const { spacing } = useAppTheme()

  const query = useQuery({
    queryKey: ['my-home', 'bills', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getPendingBills(selectedUuid!),
    retry: false,
  })

  const bills = asList<PendingBill>(query.data)

  return (
    <MyHomeSectionShell title="Estate bills">
      {query.isLoading ? <ActivityIndicator /> : null}
      {query.isError ? (
        <CaptionText color="error">{panelErrorMessage(query.error)}</CaptionText>
      ) : null}

      {bills.length === 0 && !query.isLoading && !query.isError ? (
        <BodyText color="textSecondary">No outstanding estate bills.</BodyText>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        {bills.map((bill) => (
          <Card key={bill.id}>
            <BodyText weight="semibold">{bill.reason}</BodyText>
            <HeadingText>
              {formatCurrency(parseFloat(bill.amount.replace(/,/g, '')) || 0)}
            </HeadingText>
            <CaptionText color="textSecondary">{formatDate(bill.created_at)}</CaptionText>
            {bill.proof_status ? (
              <CaptionText color="textMuted">Proof: {bill.proof_status}</CaptionText>
            ) : null}
          </Card>
        ))}
      </View>

      <CaptionText color="textMuted">
        In-app bill payment and proof upload will ship in the next pass.
      </CaptionText>
    </MyHomeSectionShell>
  )
}
