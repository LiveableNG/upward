import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { Check, ShieldCheck } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { PREMIUM_BENEFITS } from '@/features/benefits/constants'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import {
  confirmBenefitsPayment,
  getBenefitsStatus,
  initializeBenefitsPayment,
} from '@/features/payments/services/benefitsService'
import { verifyPayment } from '@/features/payments/services/paymentService'
import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

WebBrowser.maybeCompleteAuthSession()

export function BenefitsScreen() {
  const { back, goToHome } = useDashboardNavigation()
  const queryClient = useQueryClient()
  const { colors, spacing } = useAppTheme()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const statusQuery = useQuery({
    queryKey: ['benefits-status'],
    queryFn: getBenefitsStatus,
  })

  const status = statusQuery.data
  const fee = status?.benefitsFee ?? 0
  const currency = status?.currency ?? 'NGN'
  const displayFee = fee > 0 ? fee : 1000
  const items = status?.benefits?.length ? status.benefits : [...PREMIUM_BENEFITS.items]

  const handlePay = async () => {
    if (!status || status.isActive || paying) return
    setPaying(true)
    setPayError(null)
    try {
      const init = await initializeBenefitsPayment()
      const accessCode = init.accessCode
      const reference = init.reference
      if (!accessCode || !reference) {
        throw new Error('Could not start Paystack checkout')
      }
      await WebBrowser.openBrowserAsync(`https://checkout.paystack.com/${accessCode}`)
      const verified = await verifyPayment(reference)
      const ok =
        verified?.isVerified || verified?.status === 'SUCCESS' || verified?.status === 'PAID'
      if (!ok) {
        throw new Error(
          'Payment not confirmed yet. If you completed checkout, try again in a moment.',
        )
      }
      await confirmBenefitsPayment(reference)
      await queryClient.invalidateQueries({ queryKey: ['benefits-status'] })
      await statusQuery.refetch()
    } catch (err) {
      setPayError(getErrorMessage(err))
    } finally {
      setPaying(false)
    }
  }

  return (
    <SetupPageShell
      title="Upward Benefits"
      subtitle={PREMIUM_BENEFITS.tagline}
      onBack={() => (back ? back() : goToHome())}
    >
      {statusQuery.isLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
          <ActivityIndicator color={colors.clay} />
          <CaptionText color="textSecondary" style={{ marginTop: spacing[3] }}>
            Loading protection status…
          </CaptionText>
        </View>
      ) : statusQuery.isError ? (
        <Card style={{ gap: spacing[3] }}>
          <BodyText color="error">{getErrorMessage(statusQuery.error)}</BodyText>
          <Button variant="secondary" onPress={() => void statusQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <View style={{ gap: spacing[4] }}>
          <Card
            tone={status?.isActive ? 'tint' : 'bg'}
            style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}
          >
            <ShieldCheck size={22} color={status?.isActive ? '#16a34a' : colors.clay} />
            <View style={{ flex: 1, gap: 4 }}>
              <BodyText weight="semibold">
                {status?.isActive ? 'Protected' : 'Not protected yet'}
              </BodyText>
              <CaptionText color="textSecondary">
                {status?.isActive && status.endsAt
                  ? `Active until ${formatDate(status.endsAt)}`
                  : 'Annual cover for your Upward account'}
              </CaptionText>
            </View>
          </Card>

          <Card style={{ gap: spacing[3] }}>
            <EyebrowText color="clay">
              {status?.packageName || PREMIUM_BENEFITS.packageName}
            </EyebrowText>
            <CaptionText color="textSecondary">{PREMIUM_BENEFITS.socialProof}</CaptionText>
            <View style={{ gap: spacing[2] }}>
              {items.map((item) => (
                <View
                  key={item}
                  style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' }}
                >
                  <Check size={16} color={colors.clay} style={{ marginTop: 2 }} />
                  <BodyText style={{ flex: 1 }}>{item}</BodyText>
                </View>
              ))}
            </View>
          </Card>

          <Card style={{ gap: spacing[2] }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <BodyText color="textSecondary">Annual fee</BodyText>
              <TitleText>{formatCurrency(displayFee, currency)}</TitleText>
            </View>
            <CaptionText color="textMuted">
              One payment covers your account for 12 months.
            </CaptionText>
          </Card>

          {payError ? <CaptionText color="error">{payError}</CaptionText> : null}

          {status && !status.isActive ? (
            <Button fullWidth loading={paying} onPress={() => void handlePay()}>
              Pay {formatCurrency(displayFee, currency)} / year
            </Button>
          ) : null}
        </View>
      )}
    </SetupPageShell>
  )
}
