import { useRouter } from 'expo-router'

import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { DatePickerField } from '@/components/form/DatePickerField'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, LabelText } from '@/components/text'
import { SetupLocationFields } from '@/features/setup/components/SetupLocationFields'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import { useSetupDraftFromRoute } from '@/features/setup/hooks/useSetupDraftFromRoute'
import { hasContactDetails } from '@/features/setup/profileCompletion'
import { SETUP_PATHS } from '@/features/setup/setupPaths'
import { useSetupDraft } from '@/features/setup/SetupDraftContext'
import { parseDateInputValue, validateRentDates } from '@/features/setup/rentalDates'
import { formatRentAmountInput } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAppTheme } from '@/theme'

type FormStep = 'location' | 'tenancy' | 'manager'

const RENT_TYPES = ['Annually', 'Monthly'] as const

export function RentalSetupScreen() {
  const router = useRouter()
  const { go, goToHome } = useDashboardNavigation()
  const { user } = useAuth()
  const { draft, updateDraft, patchFormData } = useSetupDraft()
  const { isEdit } = useSetupDraftFromRoute()
  const { colors, spacing, radius } = useAppTheme()
  const [step, setStep] = useState<FormStep>('location')
  const [error, setError] = useState<string | null>(null)

  const formData = draft.formData

  const validateLocation = () => {
    if (!formData.address.trim() || !formData.area.trim()) {
      setError('Please provide property address and area.')
      return false
    }
    return true
  }

  const validateTenancy = () => {
    if (!formData.rentAmount) {
      setError('Please enter your rent amount.')
      return false
    }
    const numAmount = parseFloat(formData.rentAmount.replace(/,/g, ''))
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid rent amount.')
      return false
    }
    if (!formData.rentStartDate || !formData.rentEndDate) {
      setError('Please select lease start and next rent due dates.')
      return false
    }
    const dateError = validateRentDates(formData.rentStartDate, formData.rentEndDate)
    if (dateError) {
      setError(dateError)
      return false
    }
    return true
  }

  const validateManager = () => {
    const hasManager = Boolean(draft.pmEmail.trim() || formData.pmName.trim())
    const hasPayment = Boolean(
      draft.paymentDetails.accountNumber.trim() || draft.paymentDetails.bankCode.trim(),
    )
    if (!hasManager && !hasPayment) {
      updateDraft({ landlordSkipped: true })
      return true
    }
    updateDraft({ landlordSkipped: false })
    if (
      hasPayment &&
      (!draft.paymentDetails.accountNumber.trim() || !draft.paymentDetails.bankCode.trim())
    ) {
      setError('Enter account number and bank code, or skip landlord details for now.')
      return false
    }
    return true
  }

  const goNext = () => {
    setError(null)
    if (step === 'location') {
      if (!validateLocation()) return
      setStep('tenancy')
      return
    }
    if (step === 'tenancy') {
      if (!validateLocation()) {
        setStep('location')
        return
      }
      if (!validateTenancy()) return
      setStep('manager')
      return
    }
    if (!validateManager()) return
    go(SETUP_PATHS.confirm)
  }

  const goBack = () => {
    setError(null)
    if (step === 'tenancy') setStep('location')
    else if (step === 'manager') setStep('tenancy')
    else if (isEdit) router.back()
    else if (!hasContactDetails(user)) router.replace(SETUP_PATHS.phone)
    else goToHome()
  }

  const stepLabel =
    step === 'location' ? 'Location' : step === 'tenancy' ? 'Tenancy' : 'Landlord / manager'

  return (
    <SetupPageShell
      title={isEdit ? 'Edit property' : 'Your rental'}
      subtitle={`Step: ${stepLabel}`}
      onBack={goBack}
      footer={
        <Button fullWidth onPress={goNext}>
          {step === 'manager' ? 'Review details' : 'Continue'}
        </Button>
      }
    >
      {step === 'location' ? (
        <>
          <Input
            label="Property address"
            value={formData.address}
            onChangeText={(address) => patchFormData({ address })}
            placeholder="12 Admiralty Way, Lekki Phase 1"
          />
          <Input
            label="Area / neighborhood"
            value={formData.area}
            onChangeText={(area) => patchFormData({ area })}
            placeholder="Lekki Phase 1"
          />
          <Input
            label="Subarea (optional)"
            value={formData.subarea}
            onChangeText={(subarea) => patchFormData({ subarea })}
            placeholder="E.g. Block 5"
          />
          <SetupLocationFields
            countryCode={formData.country}
            state={formData.state}
            onCountryChange={(country) => patchFormData({ country })}
            onStateChange={(state) => patchFormData({ state })}
          />
        </>
      ) : null}

      {step === 'tenancy' ? (
        <>
          <View style={{ gap: 8 }}>
            <LabelText color="textSecondary">Rent frequency</LabelText>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {RENT_TYPES.map((type) => {
                const active = formData.rentType === type
                return (
                  <Pressable
                    key={type}
                    onPress={() => patchFormData({ rentType: type })}
                    style={{
                      flex: 1,
                      paddingVertical: spacing[3],
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: active ? colors.clay : colors.borderSolid,
                      backgroundColor: active ? colors.surface2 : colors.surface,
                      alignItems: 'center',
                    }}
                  >
                    <BodyText color={active ? 'clayDeep' : 'textSecondary'}>{type}</BodyText>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <Input
            label={formData.rentType === 'Monthly' ? 'Monthly rent (₦)' : 'Annual rent (₦)'}
            value={formData.rentAmount}
            onChangeText={(raw) => patchFormData({ rentAmount: formatRentAmountInput(raw) })}
            keyboardType="number-pad"
            placeholder="1,200,000"
          />

          <DatePickerField
            label="Lease start date"
            value={formData.rentStartDate}
            onChange={(rentStartDate) => patchFormData({ rentStartDate })}
          />

          <DatePickerField
            label="Next rent due date"
            value={formData.rentEndDate}
            onChange={(rentEndDate) => patchFormData({ rentEndDate })}
            minimumDate={parseDateInputValue(formData.rentStartDate) ?? undefined}
            hint={
              <CaptionText color="textMuted">
                Auto-calculated from start date and frequency; you can adjust if needed.
              </CaptionText>
            }
          />
        </>
      ) : null}

      {step === 'manager' ? (
        <>
          <BodyText color="textSecondary">
            Optional — add your landlord or property manager so we can link rent payments. You can
            skip and add this later.
          </BodyText>
          <Input
            label="Manager / landlord name"
            value={formData.pmName}
            onChangeText={(pmName) => patchFormData({ pmName })}
            placeholder="Mr. Adebayo"
          />
          <Input
            label="Manager email"
            value={draft.pmEmail}
            onChangeText={(pmEmail) => updateDraft({ pmEmail })}
            placeholder="manager@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Bank account number (optional)"
            value={draft.paymentDetails.accountNumber}
            onChangeText={(accountNumber) =>
              updateDraft({
                paymentDetails: { ...draft.paymentDetails, accountNumber },
              })
            }
            keyboardType="number-pad"
          />
          <Input
            label="Bank code (optional)"
            value={draft.paymentDetails.bankCode}
            onChangeText={(bankCode) =>
              updateDraft({
                paymentDetails: { ...draft.paymentDetails, bankCode },
              })
            }
            placeholder="058"
          />
          <Button
            variant="ghost"
            fullWidth
            onPress={() => {
              updateDraft({
                landlordSkipped: true,
                pmEmail: '',
                paymentDetails: {
                  accountNumber: '',
                  bankCode: '',
                  accountName: '',
                  bankName: '',
                },
                formData: { ...formData, pmName: '' },
              })
              go(SETUP_PATHS.confirm)
            }}
          >
            Skip for now
          </Button>
        </>
      ) : null}

      {error ? <CaptionText color="error">{error}</CaptionText> : null}
    </SetupPageShell>
  )
}
