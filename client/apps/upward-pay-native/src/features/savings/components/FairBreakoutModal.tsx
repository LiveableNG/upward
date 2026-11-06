import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { BodyText, CaptionText, HeadingText, TitleText } from '@/components/text'
import { RENT_VAULT_QUERY_KEY } from '@/features/dashboard/services/rentVaultService'
import { breakoutRentVault } from '@/features/savings/services/savingsService'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type FairBreakoutModalProps = {
  visible: boolean
  onClose: () => void
  vaultId: string
  principalKobo: number
  accruedYieldKobo: number
}

export function FairBreakoutModal({
  visible,
  onClose,
  vaultId,
  principalKobo,
  accruedYieldKobo,
}: FairBreakoutModalProps) {
  const { colors, radius, spacing } = useAppTheme()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof breakoutRentVault>> | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const principalNaira = principalKobo / 100
  const accruedNaira = accruedYieldKobo / 100

  const mutation = useMutation({
    mutationFn: () => breakoutRentVault(vaultId),
    onSuccess: async (data) => {
      setResult(data)
      await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
    onError: (err) => setLocalError(getErrorMessage(err)),
  })

  const resetClose = () => {
    setConfirm(false)
    setResult(null)
    setLocalError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={resetClose}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <AlertTriangle size={20} color={colors.clay} />
              <TitleText>Fair exit & breakout</TitleText>
            </View>
            <Pressable onPress={resetClose} hitSlop={8}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing[4] }}>
            {result ? (
              <View style={{ gap: spacing[3], alignItems: 'center' }}>
                <CheckCircle2 size={48} color={colors.error} />
                <HeadingText>Vault liquidated</HeadingText>
                {result.breakout_reference ? (
                  <CaptionText color="textMuted">Ref: {result.breakout_reference}</CaptionText>
                ) : null}
                {result.net_payout_kobo != null ? (
                  <BodyText weight="semibold">
                    Net payout {formatCurrency(result.net_payout_kobo / 100)}
                  </BodyText>
                ) : null}
                <Button fullWidth onPress={resetClose}>
                  Done
                </Button>
              </View>
            ) : !confirm ? (
              <>
                <BodyText color="textSecondary">
                  Early exit returns your principal to your wallet. Unvested yield at the
                  promotional 14.5% rate may be recalculated and an admin fee may apply. Outstanding
                  emergency advances are deducted first.
                </BodyText>
                <View
                  style={{
                    backgroundColor: colors.shellTint,
                    borderRadius: radius.md,
                    padding: spacing[3],
                    gap: spacing[2],
                  }}
                >
                  <Row label="Principal saved" value={formatCurrency(principalNaira)} />
                  <Row label="Accrued yield (14.5% track)" value={formatCurrency(accruedNaira)} />
                </View>
                <Button variant="danger" fullWidth onPress={() => setConfirm(true)}>
                  Review & continue
                </Button>
              </>
            ) : (
              <>
                <CaptionText color="error">
                  This cannot be undone. Your vault will close and funds will be paid out per
                  fair-exit terms.
                </CaptionText>
                {localError ? <CaptionText color="error">{localError}</CaptionText> : null}
                <Button
                  variant="danger"
                  fullWidth
                  loading={mutation.isPending}
                  onPress={() => mutation.mutate()}
                >
                  Confirm breakout
                </Button>
                <Button variant="secondary" fullWidth onPress={() => setConfirm(false)}>
                  Go back
                </Button>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <CaptionText color="textSecondary">{label}</CaptionText>
      <BodyText weight="semibold">{value}</BodyText>
    </View>
  )
}
