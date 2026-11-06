import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, HeadingText, TitleText } from '@/components/text'
import { RENT_VAULT_QUERY_KEY } from '@/features/dashboard/services/rentVaultService'
import { disburseEmergencyAdvance } from '@/features/savings/services/savingsService'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

const MIN_ADVANCE_KOBO = 500_000
const FACILITY_FEE_RATE = 0.035

type EmergencyAdvanceModalProps = {
  visible: boolean
  onClose: () => void
  vaultId: string
  maxBorrowableKobo: number
  hasActiveLoan: boolean
}

export function EmergencyAdvanceModal({
  visible,
  onClose,
  vaultId,
  maxBorrowableKobo,
  hasActiveLoan,
}: EmergencyAdvanceModalProps) {
  const { colors, radius, spacing } = useAppTheme()
  const queryClient = useQueryClient()
  const maxNaira = maxBorrowableKobo / 100
  const defaultNaira = Math.min(maxNaira, Math.max(5000, Math.floor(maxNaira * 0.5)))

  const [amountNaira, setAmountNaira] = useState(String(defaultNaira))
  const [bankCode, setBankCode] = useState('058')
  const [accountNumber, setAccountNumber] = useState('')
  const [success, setSuccess] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const amountKobo = useMemo(() => {
    const n = Math.floor(parseFloat(amountNaira) || 0)
    return Math.min(maxBorrowableKobo, Math.max(0, n * 100))
  }, [amountNaira, maxBorrowableKobo])

  const facilityFeeKobo = Math.round(amountKobo * FACILITY_FEE_RATE)
  const netDisbursementKobo = Math.max(0, amountKobo - facilityFeeKobo)

  const mutation = useMutation({
    mutationFn: () =>
      disburseEmergencyAdvance(vaultId, {
        amount_kobo: amountKobo,
        destination_bank_code: bankCode.trim(),
        destination_account_number: accountNumber.trim(),
      }),
    onSuccess: async () => {
      setSuccess(true)
      await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
    onError: (err) => setLocalError(getErrorMessage(err)),
  })

  const canSubmit =
    amountKobo >= MIN_ADVANCE_KOBO &&
    amountKobo <= maxBorrowableKobo &&
    bankCode.trim().length >= 3 &&
    accountNumber.trim().length === 10 &&
    !mutation.isPending

  const resetAndClose = () => {
    setSuccess(false)
    setLocalError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={resetAndClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing[5],
            maxHeight: '92%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: spacing[3],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 }}>
              <Sparkles size={20} color={colors.clay} />
              <TitleText>Emergency cash advance</TitleText>
            </View>
            <Pressable onPress={resetAndClose} accessibilityRole="button" hitSlop={8}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing[4] }}
          >
            {hasActiveLoan ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing[3],
                  backgroundColor: colors.shellTint,
                  padding: spacing[3],
                  borderRadius: radius.md,
                }}
              >
                <AlertCircle size={20} color={colors.clay} />
                <BodyText color="textSecondary" style={{ flex: 1 }}>
                  You have an outstanding emergency advance on this vault. Request a new advance
                  after it is repaid.
                </BodyText>
              </View>
            ) : success ? (
              <View style={{ alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4] }}>
                <CheckCircle2 size={48} color="#16a34a" />
                <HeadingText>Advance disbursed</HeadingText>
                <CaptionText color="textSecondary" style={{ textAlign: 'center' }}>
                  Funds are on the way to your bank account. Your remaining vault balance keeps
                  earning 14.5% p.a.
                </CaptionText>
                <Button fullWidth onPress={resetAndClose}>
                  Done
                </Button>
              </View>
            ) : (
              <>
                <CaptionText color="textSecondary">
                  Borrow up to 40% of your vault balance ({formatCurrency(maxNaira)}). Remaining
                  principal continues compounding. 3.5% processing fee applies.
                </CaptionText>

                <Input
                  label="Advance amount (₦)"
                  value={amountNaira}
                  onChangeText={setAmountNaira}
                  keyboardType="numeric"
                  placeholder="5000"
                />

                <CardBreakdown
                  requestedKobo={amountKobo}
                  feeKobo={facilityFeeKobo}
                  netKobo={netDisbursementKobo}
                />

                <Input
                  label="Bank code (NUBAN)"
                  value={bankCode}
                  onChangeText={setBankCode}
                  keyboardType="number-pad"
                  placeholder="058"
                />
                <Input
                  label="Account number"
                  value={accountNumber}
                  onChangeText={(t) => setAccountNumber(t.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  placeholder="10 digits"
                />

                {localError ? <CaptionText color="error">{localError}</CaptionText> : null}

                <Button
                  fullWidth
                  loading={mutation.isPending}
                  disabled={!canSubmit}
                  onPress={() => {
                    setLocalError(null)
                    mutation.mutate()
                  }}
                >
                  Disburse {formatCurrency(netDisbursementKobo / 100)}
                </Button>
              </>
            )}

            {hasActiveLoan ? (
              <Button variant="secondary" fullWidth onPress={resetAndClose}>
                Close
              </Button>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function CardBreakdown({
  requestedKobo,
  feeKobo,
  netKobo,
}: {
  requestedKobo: number
  feeKobo: number
  netKobo: number
}) {
  const { colors, radius, spacing } = useAppTheme()
  return (
    <View
      style={{
        backgroundColor: colors.shellTint,
        borderRadius: radius.md,
        padding: spacing[3],
        gap: spacing[2],
      }}
    >
      <Row label="Requested advance" value={formatCurrency(requestedKobo / 100)} />
      <Row label="Processing fee (3.5%)" value={formatCurrency(feeKobo / 100)} />
      <Row label="Net to your bank" value={formatCurrency(netKobo / 100)} bold />
    </View>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <CaptionText color="textSecondary">{label}</CaptionText>
      <BodyText weight={bold ? 'semibold' : undefined}>{value}</BodyText>
    </View>
  )
}
