import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { useEffect } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { BodyText, CaptionText, LabelText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import { isRentalDraftReadyForConfirm } from '@/features/setup/rentalDraft'
import { SETUP_PATHS } from '@/features/setup/setupPaths'
import { useSetupDraft } from '@/features/setup/SetupDraftContext'
import { submitRentalRequest } from '@/features/setup/submitRental'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

function ConfirmRow({ label, value }: { label: string; value: string }) {
  const { spacing } = useAppTheme()
  return (
    <View style={{ gap: spacing[1], paddingVertical: spacing[2], width: '100%' }}>
      <LabelText color="textMuted">{label}</LabelText>
      <BodyText style={{ flexShrink: 1 }}>{value}</BodyText>
    </View>
  )
}

export function ConfirmSetupScreen() {
  const router = useRouter()
  const { goToHome } = useDashboardNavigation()
  const { draft, resetDraft } = useSetupDraft()
  const { refreshUser } = useAuth()
  const { spacing } = useAppTheme()

  useEffect(() => {
    if (!isRentalDraftReadyForConfirm(draft)) {
      router.replace(SETUP_PATHS.rental)
    }
    // Only validate on entry — avoid redirect loops while editing on the rental screen below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addressLine = [draft.formData.address, draft.formData.area, draft.formData.state]
    .filter(Boolean)
    .join(', ')

  const managerLabel = draft.landlordSkipped
    ? 'Skipped for now'
    : draft.formData.pmName || draft.pmEmail || '—'

  const paymentLabel = draft.landlordSkipped
    ? 'Not specified (can be added later)'
    : draft.paymentDetails.accountNumber
      ? `${draft.paymentDetails.accountName || 'Account'} · ${draft.paymentDetails.accountNumber}`
      : 'Not specified'

  const totalRentNum = parseFloat(draft.formData.rentAmount.replace(/,/g, '')) || 0

  const isEdit = draft.mode === 'edit'

  const saveMutation = useMutation({
    mutationFn: () => submitRentalRequest(draft),
    onSuccess: async () => {
      await refreshUser()
      if (isEdit) {
        resetDraft('onboarding')
        router.replace(SETUP_PATHS.properties)
        return
      }
      resetDraft('onboarding')
      goToHome()
    },
  })

  return (
    <SetupPageShell
      title={isEdit ? 'Save changes' : 'Confirm property'}
      subtitle={
        isEdit
          ? 'Review your updates before submitting.'
          : 'Make sure everything looks right before saving.'
      }
      onBack={() => router.back()}
      footer={
        <Button fullWidth loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
          {isEdit ? 'Update property' : 'Save property details'}
        </Button>
      }
    >
      <Card>
        <ConfirmRow label="Address" value={addressLine || '—'} />
        <ConfirmRow
          label={draft.formData.rentType === 'Monthly' ? 'Monthly rent' : 'Annual rent'}
          value={totalRentNum > 0 ? formatCurrency(totalRentNum) : '—'}
        />
        <ConfirmRow label="Lease start" value={formatDate(draft.formData.rentStartDate) || '—'} />
        <ConfirmRow
          label="Next rent due"
          value={draft.formData.rentEndDate ? formatDate(draft.formData.rentEndDate) : '—'}
        />
        <ConfirmRow label="Landlord / manager" value={managerLabel} />
        <ConfirmRow label="Landlord account" value={paymentLabel} />
      </Card>

      {saveMutation.isError ? (
        <CaptionText color="error">{getErrorMessage(saveMutation.error)}</CaptionText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <BodyText style={{ flexShrink: 0 }}>🔒</BodyText>
        <BodyText color="textSecondary" style={{ flex: 1, flexShrink: 1 }}>
          {draft.landlordSkipped
            ? 'Your property will be saved securely. You can invite your landlord anytime.'
            : 'We will link your property and notify your manager when applicable.'}
        </BodyText>
      </View>
    </SetupPageShell>
  )
}
