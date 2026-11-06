import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import {
  simulateRentSavings,
  type SimulateRentSavingsPayload,
} from '@/features/savings/services/savingsService'
import { formatCurrency, formatRentAmountInput } from '@/lib/format'
import { useAppTheme } from '@/theme'

type Cadence = SimulateRentSavingsPayload['cadence']

function parseNairaInput(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export function RentCalculatorScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const { colors, spacing } = useAppTheme()

  const [targetRaw, setTargetRaw] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [incomeRaw, setIncomeRaw] = useState('')
  const [cadence, setCadence] = useState<Cadence>('MONTHLY')

  const targetNaira = parseNairaInput(targetRaw)
  const incomeNaira = parseNairaInput(incomeRaw)

  const simulateMutation = useMutation({
    mutationFn: simulateRentSavings,
  })

  useEffect(() => {
    if (!targetNaira || !dueDate) return
    const timer = setTimeout(() => {
      simulateMutation.mutate({
        target_amount_kobo: Math.round(targetNaira * 100),
        contractual_due_date: dueDate,
        cadence,
        monthly_income_kobo: incomeNaira ? Math.round(incomeNaira * 100) : undefined,
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [targetNaira, dueDate, cadence, incomeNaira])

  const sim = simulateMutation.data
  const minDueDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }, [])

  return (
    <Screen scroll background="shell" avoidKeyboard>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Rent vault</EyebrowText>
      <TitleText>Rent savings calculator</TitleText>
      <BodyText color="textSecondary">
        See your periodic deposit, runway days, and projected yield before you lock a vault.
      </BodyText>

      <Card style={{ gap: spacing[3] }}>
        <Input
          label="Target rent + service charge (₦)"
          value={targetRaw}
          onChangeText={(text) => setTargetRaw(formatRentAmountInput(text))}
          keyboardType="number-pad"
          placeholder="2,400,000"
        />
        <Input
          label="Lease expiration date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder={minDueDate}
        />
        <CaptionText color="textMuted">Use YYYY-MM-DD (must be in the future).</CaptionText>
        <OptionPicker
          label="Savings cadence"
          value={cadence}
          onChange={(v) => setCadence(v as Cadence)}
          options={['DAILY', 'WEEKLY', 'MONTHLY']}
        />
        <Input
          label="Monthly income (optional, ₦)"
          value={incomeRaw}
          onChangeText={(text) => setIncomeRaw(formatRentAmountInput(text))}
          keyboardType="number-pad"
        />
      </Card>

      {simulateMutation.isPending ? (
        <CaptionText color="textMuted">Calculating…</CaptionText>
      ) : null}

      {sim ? (
        <Card tone="tint" style={{ gap: spacing[3] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            <CaptionText color="clay">{sim.days_remaining} days to due date</CaptionText>
          </View>
          <HeadingText>{formatCurrency(sim.periodic_deposit_kobo / 100)}</HeadingText>
          <CaptionText color="textSecondary">Suggested {cadence.toLowerCase()} deposit</CaptionText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <BodyText color="textSecondary">Projected yield</BodyText>
            <BodyText weight="semibold">{formatCurrency(sim.projected_yield_kobo / 100)}</BodyText>
          </View>
          {sim.total_contribution_kobo != null ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <BodyText color="textSecondary">Total contribution</BodyText>
              <BodyText>{formatCurrency(sim.total_contribution_kobo / 100)}</BodyText>
            </View>
          ) : null}
          {sim.affordability_note ? (
            <CaptionText color="textSecondary">{sim.affordability_note}</CaptionText>
          ) : null}
          <Button
            fullWidth
            onPress={() =>
              go(
                `${DASHBOARD_HREF.savingsCreate}?target=${encodeURIComponent(String(targetNaira))}&due=${encodeURIComponent(dueDate)}&cadence=${cadence}`,
              )
            }
          >
            Continue to vault setup
          </Button>
        </Card>
      ) : null}
    </Screen>
  )
}
