import { useMutation } from '@tanstack/react-query'
import { ShieldCheck, X } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { BankPicker } from '@/components/form/BankPicker'
import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { getBanks, resolveAccount } from '@/features/payments/services/paymentService'
import { onboardSavingsInvestor } from '@/features/savings/services/savingsService'
import { getErrorMessage } from '@/lib/errors'
import { useQuery } from '@tanstack/react-query'
import { useAppTheme } from '@/theme'

type Props = {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

const SOURCE_OPTIONS = ['Salary', 'Business', 'Savings', 'Investment']
const KIN_RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']

export function SavingsInvestorKycModal({ visible, onClose, onSuccess }: Props) {
  const { colors, radius, spacing } = useAppTheme()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [bvn, setBvn] = useState('')
  const [mothersMaidenName, setMothersMaidenName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [sourceOfFunds, setSourceOfFunds] = useState('Salary')
  const [nextOfKinName, setNextOfKinName] = useState('')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState('Spouse')
  const [nextOfKinPhone, setNextOfKinPhone] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const banksQuery = useQuery({
    queryKey: ['banks'],
    queryFn: getBanks,
    enabled: visible,
  })

  const mutation = useMutation({
    mutationFn: () =>
      onboardSavingsInvestor({
        bvn,
        mothers_maiden_name: mothersMaidenName.trim(),
        occupation: occupation.trim(),
        source_of_funds: sourceOfFunds as 'Salary' | 'Business' | 'Savings' | 'Investment',
        income_range: '1M-5M',
        next_of_kin_name: nextOfKinName.trim(),
        next_of_kin_relationship: nextOfKinRelationship,
        next_of_kin_phone: nextOfKinPhone.trim(),
        settlement_bank_code: bankCode,
        settlement_account_number: accountNumber,
        settlement_account_name: accountName.trim(),
        settlement_bank_name: bankName,
      }),
    onSuccess: () => {
      onSuccess()
      resetAndClose()
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const resetAndClose = () => {
    setStep(1)
    setFormError(null)
    onClose()
  }

  const tryResolve = async (num: string, code: string) => {
    if (num.length !== 10 || !code) return
    try {
      const res = await resolveAccount(num, code)
      const name = res.accountName ?? res.account_name
      if (name) setAccountName(name)
    } catch {
      // allow manual entry
    }
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color={colors.clay} />
              <TitleText>Investor verification</TitleText>
            </View>
            <Pressable onPress={resetAndClose} hitSlop={8}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <CaptionText color="textSecondary" style={{ marginBottom: spacing[3] }}>
            Step {step} of 3 · Required for SEC-regulated rent vault yield (ARM).
          </CaptionText>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing[4] }}
          >
            {step === 1 ? (
              <>
                <Input
                  label="BVN (11 digits)"
                  value={bvn}
                  onChangeText={(t) => setBvn(t.replace(/\D/g, '').slice(0, 11))}
                  keyboardType="number-pad"
                />
                <Input
                  label="Mother's maiden name"
                  value={mothersMaidenName}
                  onChangeText={setMothersMaidenName}
                  autoCapitalize="words"
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Input label="Occupation" value={occupation} onChangeText={setOccupation} />
                <OptionPicker
                  label="Source of funds"
                  value={sourceOfFunds}
                  options={SOURCE_OPTIONS}
                  onChange={setSourceOfFunds}
                />
                <Input
                  label="Next of kin — full name"
                  value={nextOfKinName}
                  onChangeText={setNextOfKinName}
                />
                <OptionPicker
                  label="Relationship"
                  value={nextOfKinRelationship}
                  options={KIN_RELATIONS}
                  onChange={setNextOfKinRelationship}
                />
                <Input
                  label="Next of kin phone"
                  value={nextOfKinPhone}
                  onChangeText={(t) => setNextOfKinPhone(t.replace(/[^\d+]/g, '').slice(0, 14))}
                  keyboardType="phone-pad"
                />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <BankPicker
                  label="Settlement bank"
                  banks={banksQuery.data ?? []}
                  bankCode={bankCode}
                  onChange={(bank) => {
                    setBankCode(bank.code)
                    setBankName(bank.name)
                    setAccountName('')
                    void tryResolve(accountNumber, bank.code)
                  }}
                />
                <Input
                  label="Account number"
                  value={accountNumber}
                  onChangeText={(t) => {
                    const num = t.replace(/\D/g, '').slice(0, 10)
                    setAccountNumber(num)
                    setAccountName('')
                    if (num.length === 10 && bankCode) void tryResolve(num, bankCode)
                  }}
                  keyboardType="number-pad"
                />
                <Input
                  label="Account name"
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Must match bank records"
                />
              </>
            ) : null}

            {formError ? <CaptionText color="error">{formError}</CaptionText> : null}

            {step < 3 ? (
              <Button
                fullWidth
                onPress={() => {
                  setFormError(null)
                  if (step === 1) {
                    if (bvn.length !== 11) {
                      setFormError('Enter a valid 11-digit BVN.')
                      return
                    }
                    if (!mothersMaidenName.trim()) {
                      setFormError("Mother's maiden name is required.")
                      return
                    }
                    setStep(2)
                    return
                  }
                  if (!occupation.trim() || !nextOfKinName.trim() || nextOfKinPhone.length < 10) {
                    setFormError('Complete occupation and next-of-kin details.')
                    return
                  }
                  setStep(3)
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                fullWidth
                loading={mutation.isPending}
                disabled={accountNumber.length !== 10 || !accountName.trim() || !bankCode}
                onPress={() => {
                  setFormError(null)
                  mutation.mutate()
                }}
              >
                Submit KYC
              </Button>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
