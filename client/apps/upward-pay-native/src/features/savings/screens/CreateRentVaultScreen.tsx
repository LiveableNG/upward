import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { CheckboxField } from '@/components/form/CheckboxField'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { useCreateRentVault } from '@/features/dashboard/services/rentVaultService'
import { SavingsInvestorKycModal } from '@/features/savings/components/SavingsInvestorKycModal'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { getErrorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import { useAppTheme } from '@/theme'

type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY'

function parseNairaToKobo(input: string): number | null {
  const n = parseFloat(input.replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function defaultDueDateFromProperty(rentEndDate?: string): string {
  if (rentEndDate && /^\d{4}-\d{2}-\d{2}/.test(rentEndDate)) {
    return rentEndDate.slice(0, 10)
  }
  const d = new Date()
  d.setMonth(d.getMonth() + 11)
  return d.toISOString().slice(0, 10)
}

export function CreateRentVaultScreen() {
  const router = useRouter()
  const { go, replace } = useDashboardNavigation()
  const params = useLocalSearchParams<{ target?: string; due?: string; cadence?: string }>()
  const { user } = useAuth()
  const { colors, spacing } = useAppTheme()
  const property = user?.properties?.find((p) => !p.isPastTenancy) ?? user?.properties?.[0]

  const paramCadence =
    params.cadence === 'DAILY' || params.cadence === 'WEEKLY' || params.cadence === 'MONTHLY'
      ? params.cadence
      : null

  const [targetInput, setTargetInput] = useState(() => {
    if (typeof params.target === 'string' && params.target) return params.target
    return property?.rentAmount ? String(Math.round(property.rentAmount)) : ''
  })
  const [dueDate, setDueDate] = useState(() => {
    if (typeof params.due === 'string' && params.due) return params.due
    return defaultDueDateFromProperty(property?.rentEndDate)
  })
  const [cadence, setCadence] = useState<Cadence>(paramCadence ?? 'MONTHLY')
  const [agreeLock, setAgreeLock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kycOpen, setKycOpen] = useState(false)

  const createMutation = useCreateRentVault()

  const targetKobo = useMemo(() => parseNairaToKobo(targetInput), [targetInput])

  const submit = async () => {
    setError(null)
    if (!targetKobo) {
      setError('Enter a valid target rent amount.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      setError('Due date must be YYYY-MM-DD.')
      return
    }
    if (!agreeLock) {
      setError('Please acknowledge the vault lock terms.')
      return
    }

    try {
      await createMutation.mutateAsync({
        target_amount_kobo: targetKobo,
        contractual_due_date: dueDate.trim(),
        cadence,
        preferred_funding_method: 'DVA',
      })
      replace(DASHBOARD_HREF.savingsFund)
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)
      if (/kyc|investor|bvn|verification/i.test(message)) {
        setKycOpen(true)
      }
    }
  }

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

      <EyebrowText color="clay">Setup</EyebrowText>
      <TitleText>Create rent vault</TitleText>
      <BodyText color="textSecondary">
        Lock savings toward rent day. Funds compound at 14.5% p.a. until settlement.
      </BodyText>

      <Button variant="secondary" size="sm" onPress={() => go(DASHBOARD_HREF.rentCalculator)}>
        Open rent calculator
      </Button>

      {property?.address ? (
        <CaptionText color="textMuted">Property: {property.address}</CaptionText>
      ) : null}

      <Card style={{ gap: spacing[3] }}>
        <Input
          label="Target rent amount (₦)"
          value={targetInput}
          onChangeText={setTargetInput}
          keyboardType="decimal-pad"
          placeholder="2,400,000"
        />
        <Input
          label="Contractual due date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-11-01"
          autoCapitalize="none"
        />
        <OptionPicker
          label="Contribution cadence"
          value={cadence === 'MONTHLY' ? 'Monthly' : cadence === 'WEEKLY' ? 'Weekly' : 'Daily'}
          options={['Monthly', 'Weekly', 'Daily']}
          onChange={(label) => {
            const map: Record<string, Cadence> = {
              Monthly: 'MONTHLY',
              Weekly: 'WEEKLY',
              Daily: 'DAILY',
            }
            setCadence(map[label] ?? 'MONTHLY')
          }}
        />
        <CaptionText color="textSecondary">
          Funding via dedicated virtual account (free bank transfers).
        </CaptionText>
        {targetKobo ? (
          <CaptionText color="textMuted">
            Target lock: {formatCurrency(targetKobo / 100)} due {dueDate}
          </CaptionText>
        ) : null}
      </Card>

      {!user?.isIdentityVerified ? (
        <Button variant="secondary" size="sm" onPress={() => setKycOpen(true)}>
          Complete investor KYC
        </Button>
      ) : null}

      <CheckboxField
        checked={agreeLock}
        onChange={setAgreeLock}
        label={
          <BodyText color="textSecondary">
            I understand funds are maturity-locked until rent day or an approved breakout.
          </BodyText>
        }
      />

      {error ? <CaptionText color="error">{error}</CaptionText> : null}

      <Button fullWidth loading={createMutation.isPending} onPress={() => void submit()}>
        Create & lock vault
      </Button>

      <SavingsInvestorKycModal
        visible={kycOpen}
        onClose={() => setKycOpen(false)}
        onSuccess={() => setError(null)}
      />
    </Screen>
  )
}
