'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSetupDraft } from '../SetupDraftContext'
import { SETUP_PATHS, useSetupMode } from '../setupPaths'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'
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
  const { isEdit, withMode } = useSetupMode()

  const addressLine = [draft.formData.address, draft.formData.area, draft.formData.state]
    .filter(Boolean)
    .join(', ')

  const managerLabel = draft.pmFound
    ? draft.pmDetails?.businessName || draft.pmDetails?.name
    : draft.formData.pmName || draft.pmEmail

  const saveMutation = useMutation({
    mutationFn: () => submitRentalRequest(draft),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      if (isEdit) {
        toast.success('Your rental details have been updated.', 'Saved')
        router.push(SETUP_PATHS.profile)
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

  return (
    <SetupPageShell
      backHref={rentalFormPath}
      footer={
        <SetupPrimaryButton onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Save rental details'}
        </SetupPrimaryButton>
      }
    >
      <h2 className="setup-page__title">Confirm your details</h2>
      <p className="setup-page__subtitle">
        Make sure everything looks right before we save your rental information.
      </p>

      <div className="setup-page__confirm-card">
        <ConfirmRow label="Address" value={addressLine} />
        <ConfirmRow label="Landlord / manager" value={managerLabel || '—'} />
        <ConfirmRow
          label="Annual rent"
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
          We&apos;ll send a quick verification request to your landlord. Your data stays private.
        </div>
      </div>
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
