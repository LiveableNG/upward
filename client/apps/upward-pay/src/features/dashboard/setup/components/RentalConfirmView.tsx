'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSetupDraft } from '../SetupDraftContext'
import { clearSetupDraft } from '../setupDraft'
import { SETUP_PATHS, setupRentalListPath, useSetupMode } from '../setupPaths'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'
import { PayFlowPrimaryButton, PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { submitRentalRequest } from '../submitRental'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'

export function RentalConfirmView() {
  const router = useRouter()
  const { draft } = useSetupDraft()
  const { refreshUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { isEdit, withMode, returnTo } = useSetupMode()

  const addressLine = [draft.formData.address, draft.formData.area, draft.formData.state]
    .filter(Boolean)
    .join(', ')

  const managerLabel = draft.landlordSkipped
    ? 'Skipped for now'
    : draft.pmFound
      ? draft.pmDetails?.businessName || draft.pmDetails?.name
      : draft.formData.pmName || draft.pmEmail

  const paymentLabel = draft.paymentDetails.accountName
    ? `${draft.paymentDetails.accountName} · ${draft.paymentDetails.accountNumber}`
    : '—'

  const saveMutation = useMutation({
    mutationFn: () => submitRentalRequest(draft),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      if (returnTo) {
        clearSetupDraft()
        toast.success('Property added. Select it below to continue.', 'Added')
        router.push(returnTo)
      } else if (isEdit) {
        toast.success('Your rental details have been updated.', 'Saved')
        router.push(setupRentalListPath())
      } else {
        toast.success('Your rental details have been saved.', 'Saved')
        router.push(SETUP_PATHS.dashboard)
      }
    },
    onError: () => {
      toast.error('Failed to save rental details. Please try again.', 'Error')
    },
  })

  const rentalFormPath = withMode(SETUP_PATHS.rental)

  const confirmBody = (
    <>
      <div className="setup-page__confirm-card">
        <ConfirmRow label="Address" value={addressLine} />
        <ConfirmRow label="Payment account" value={paymentLabel} />
        <ConfirmRow label="Landlord / manager" value={managerLabel || '—'} />
        <ConfirmRow
          label={
            draft.formData.rentType === 'Monthly'
              ? 'Monthly rent'
              : draft.formData.rentType === 'Lease'
                ? 'Lease rent'
                : 'Annual rent'
          }
          value={
            draft.formData.rentAmount
              ? formatCurrency(parseFloat(draft.formData.rentAmount.replace(/,/g, '')), 'NGN')
              : '—'
          }
        />
        <ConfirmRow
          label="Next due"
          value={draft.formData.rentEndDate ? formatDate(draft.formData.rentEndDate) : '—'}
        />
      </div>

      <div className="setup-page__notice">
        <span aria-hidden="true">🔒</span>
        <div>
          {draft.landlordSkipped
            ? 'Your property and payment details are saved. You can add landlord details later.'
            : "We'll send a quick verification request to your landlord. Your data stays private."}
        </div>
      </div>
    </>
  )

  const saveLabel = saveMutation.isPending
    ? 'Saving…'
    : returnTo
      ? 'Add property'
      : isEdit
        ? 'Save changes'
        : 'Save rental details'

  const footer = isEdit ? (
    <PayFlowPrimaryButton
      onClick={() => saveMutation.mutate()}
      disabled={saveMutation.isPending}
      loading={saveMutation.isPending}
    >
      {saveLabel}
    </PayFlowPrimaryButton>
  ) : (
    <SetupPrimaryButton onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
      {saveLabel}
    </SetupPrimaryButton>
  )

  if (isEdit) {
    return (
      <PayPageShell
        title="Confirm changes"
        subtitle="Make sure everything looks right before saving."
        showBack
        onBack={() => router.push(rentalFormPath)}
        footer={footer}
      >
        {confirmBody}
      </PayPageShell>
    )
  }

  return (
    <SetupPageShell
      title="Confirm your details"
      subtitle="Make sure everything looks right before we save your rental information."
      backHref={rentalFormPath}
      footer={footer}
    >
      {confirmBody}
    </SetupPageShell>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="setup-page__confirm-row">
      <div className="setup-page__confirm-body">
        <div className="setup-page__confirm-label">{label}</div>
        <div className="setup-page__confirm-value">{value}</div>
      </div>
    </div>
  )
}
