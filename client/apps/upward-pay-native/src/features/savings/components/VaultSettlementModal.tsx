import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, X } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { BankPicker } from '@/components/form/BankPicker'
import { Button } from '@/components/button/Button'
import { CheckboxField } from '@/components/form/CheckboxField'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { type RentVault } from '@/features/dashboard/types'
import { RENT_VAULT_QUERY_KEY } from '@/features/dashboard/services/rentVaultService'
import { getBanks } from '@/features/payments/services/paymentService'
import { executeLandlordSettlement } from '@/features/savings/services/savingsService'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useQuery } from '@tanstack/react-query'
import { useAppTheme } from '@/theme'

type Props = {
  visible: boolean
  onClose: () => void
  vault: RentVault
}

export function VaultSettlementModal({ visible, onClose, vault }: Props) {
  const { colors, radius, spacing } = useAppTheme()
  const queryClient = useQueryClient()
  const [landlordName, setLandlordName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [disburseSurplus, setDisburseSurplus] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  const banksQuery = useQuery({ queryKey: ['banks'], queryFn: getBanks, enabled: visible })

  const targetNaira = vault.target_amount_kobo / 100
  const balanceNaira = vault.current_balance_kobo / 100
  const surplusNaira = Math.max(0, balanceNaira - targetNaira)

  const mutation = useMutation({
    mutationFn: () =>
      executeLandlordSettlement(vault.vault_id!, {
        landlord_name: landlordName.trim(),
        landlord_bank_code: bankCode,
        landlord_account_number: accountNumber.trim(),
        property_address: propertyAddress.trim(),
        disburse_surplus_to_wallet: disburseSurplus,
      }),
    onSuccess: async (data) => {
      setReference(data.settlement_reference ?? 'Submitted')
      await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const resetClose = () => {
    setReference(null)
    setError(null)
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
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 }}>
              <Sparkles size={20} color={colors.clay} />
              <TitleText>Rent day settlement</TitleText>
            </View>
            <Pressable onPress={resetClose} hitSlop={8}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing[4] }}
          >
            {reference ? (
              <View style={{ gap: spacing[3] }}>
                <BodyText weight="semibold">Settlement submitted</BodyText>
                <CaptionText color="textSecondary">Reference: {reference}</CaptionText>
                <Button fullWidth onPress={resetClose}>
                  Done
                </Button>
              </View>
            ) : (
              <>
                <CaptionText color="textSecondary">
                  Pay {formatCurrency(targetNaira)} to your landlord via NIP. Vault balance{' '}
                  {formatCurrency(balanceNaira)}
                  {surplusNaira > 0 ? ` (${formatCurrency(surplusNaira)} surplus)` : ''}.
                </CaptionText>

                <Input
                  label="Landlord or agency name"
                  value={landlordName}
                  onChangeText={setLandlordName}
                />
                <Input
                  label="Property address (for receipt)"
                  value={propertyAddress}
                  onChangeText={setPropertyAddress}
                />
                <BankPicker
                  label="Landlord bank"
                  banks={banksQuery.data ?? []}
                  bankCode={bankCode}
                  onChange={(bank) => setBankCode(bank.code)}
                />
                <Input
                  label="Landlord account number"
                  value={accountNumber}
                  onChangeText={(t) => setAccountNumber(t.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                />

                <CheckboxField
                  checked={disburseSurplus}
                  onChange={setDisburseSurplus}
                  label={
                    <BodyText color="textSecondary">
                      Credit surplus yield above rent target to my Upward wallet
                    </BodyText>
                  }
                />

                {error ? <CaptionText color="error">{error}</CaptionText> : null}

                <Button
                  fullWidth
                  loading={mutation.isPending}
                  disabled={
                    landlordName.trim().length < 3 ||
                    bankCode.length < 3 ||
                    accountNumber.length !== 10 ||
                    propertyAddress.trim().length < 5
                  }
                  onPress={() => {
                    setError(null)
                    mutation.mutate()
                  }}
                >
                  Authorize settlement
                </Button>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
