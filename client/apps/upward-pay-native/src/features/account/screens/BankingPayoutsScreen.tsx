import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { AlertCircle, Building2, CreditCard, Pencil, User } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { BankPicker } from '@/components/form/BankPicker'
import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import {
  getBankDetails,
  getBanks,
  resolveAccount,
  saveBankDetails,
  type TenantBankDetails,
} from '@/features/payments/services/paymentService'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

const EMPTY: TenantBankDetails = {
  bankCode: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
}

function maskAccount(value: string) {
  if (value.length <= 4) return value
  return `•••• ${value.slice(-4)}`
}

export function BankingPayoutsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { colors, spacing, radius } = useAppTheme()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TenantBankDetails>(EMPTY)
  const [saved, setSaved] = useState<TenantBankDetails>(EMPTY)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const banksQuery = useQuery({
    queryKey: ['banks'],
    queryFn: getBanks,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const detailsQuery = useQuery({
    queryKey: ['bank-details'],
    queryFn: getBankDetails,
  })

  useEffect(() => {
    if (detailsQuery.data) {
      setDraft(detailsQuery.data)
      setSaved(detailsQuery.data)
    }
  }, [detailsQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => saveBankDetails(draft),
    onSuccess: async () => {
      setSaved(draft)
      setEditing(false)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['bank-details'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const hasAccount = Boolean(saved.bankName && saved.accountNumber && saved.accountName)

  const tryResolve = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.length !== 10 || !bankCode) return
    setResolving(true)
    try {
      const res = await resolveAccount(accountNumber, bankCode)
      const name = res.accountName ?? res.account_name
      if (name) {
        setDraft((prev) => ({ ...prev, accountName: name }))
      }
    } catch {
      // User can type name manually if resolution fails.
    } finally {
      setResolving(false)
    }
  }

  if (detailsQuery.isLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  return (
    <Screen scroll background="shell">
      <Pressable
        onPress={() => {
          if (editing) {
            setDraft(saved)
            setEditing(false)
            return
          }
          router.back()
        }}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <BodyText color="textSecondary">{editing ? 'Cancel edit' : 'Back'}</BodyText>
      </Pressable>

      <EyebrowText color="clay">Profile</EyebrowText>
      <TitleText>{editing ? 'Edit payout account' : 'Banking & payouts'}</TitleText>
      {!editing ? (
        <BodyText color="textSecondary">
          Refunds and overpayments are sent to this account.
        </BodyText>
      ) : null}

      <Card tone="tint" style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
        <AlertCircle size={18} color={colors.clay} />
        <CaptionText color="textSecondary" style={{ flex: 1 }}>
          These details are used for automated refunds when a payment cannot be applied to your rent
          invoice.
        </CaptionText>
      </Card>

      {editing ? (
        <View style={{ gap: spacing[4] }}>
          <BankPicker
            label="Bank"
            banks={banksQuery.data ?? []}
            bankCode={draft.bankCode}
            onChange={(bank) => {
              const next = {
                ...draft,
                bankCode: bank.code,
                bankName: bank.name,
                accountName: '',
              }
              setDraft(next)
              void tryResolve(next.accountNumber, bank.code)
            }}
          />
          <Input
            label="Account number"
            value={draft.accountNumber}
            onChangeText={(t) => {
              const accountNumber = t.replace(/\D/g, '').slice(0, 10)
              const next = { ...draft, accountNumber, accountName: '' }
              setDraft(next)
              if (accountNumber.length === 10 && draft.bankCode) {
                void tryResolve(accountNumber, draft.bankCode)
              }
            }}
            keyboardType="number-pad"
          />
          <Input
            label="Account name"
            value={draft.accountName}
            onChangeText={(accountName) => setDraft((prev) => ({ ...prev, accountName }))}
            placeholder={resolving ? 'Resolving…' : 'Account name'}
            editable={!resolving}
          />
          {error ? <CaptionText color="error">{error}</CaptionText> : null}
          <Button
            fullWidth
            loading={saveMutation.isPending}
            disabled={!draft.accountName.trim() || draft.accountNumber.length !== 10}
            onPress={() => saveMutation.mutate()}
          >
            Save changes
          </Button>
        </View>
      ) : hasAccount ? (
        <Card style={{ gap: spacing[4] }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <BodyText weight="semibold">Payout account</BodyText>
            <Pressable
              onPress={() => setEditing(true)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Pencil size={14} color={colors.clay} />
              <CaptionText color="clay">Edit</CaptionText>
            </Pressable>
          </View>
          <InfoRow icon={Building2} label="Bank" value={saved.bankName} />
          <InfoRow
            icon={CreditCard}
            label="Account number"
            value={maskAccount(saved.accountNumber)}
          />
          <InfoRow icon={User} label="Account name" value={saved.accountName} />
        </Card>
      ) : (
        <Card style={{ gap: spacing[3], alignItems: 'flex-start' }}>
          <BodyText weight="semibold">No payout account yet</BodyText>
          <BodyText color="textSecondary">
            Add your bank details so refunds and overpayments can be returned to you.
          </BodyText>
          <Button fullWidth onPress={() => setEditing(true)}>
            Add payout account
          </Button>
        </Card>
      )}
    </Screen>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  const { colors, spacing, radius } = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: colors.shellTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={colors.clay} />
      </View>
      <View>
        <CaptionText color="textMuted">{label}</CaptionText>
        <BodyText weight="semibold">{value}</BodyText>
      </View>
    </View>
  )
}
