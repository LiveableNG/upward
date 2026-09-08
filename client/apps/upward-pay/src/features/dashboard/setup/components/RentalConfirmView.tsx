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

const STEP_NAMES = ['Location', 'Tenancy', 'Landlord', 'Review']

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
    ? `${draft.paymentDetails.accountName} (${draft.paymentDetails.bankName || 'Bank'}) · ${draft.paymentDetails.accountNumber}`
    : 'Not specified'

  const totalRentNum = parseFloat(draft.formData.rentAmount.replace(/,/g, '')) || 0
  const paidNum = parseFloat(draft.formData.amountAlreadyPaid.replace(/,/g, '')) || 0
  const remainingNum = Math.max(0, totalRentNum - paidNum)

  const statusLabel =
    draft.formData.tenancyStatus === 'PAYING_BALANCE'
      ? 'Paying rent balance'
      : draft.formData.tenancyStatus === 'ALREADY_PAID'
        ? 'Already fully paid (Logging proof)'
        : 'Starting new cycle'

  const saveMutation = useMutation({
    mutationFn: () => submitRentalRequest(draft),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      clearSetupDraft()
      if (returnTo) {
        toast.success('Property added successfully.', 'Added')
        router.push(returnTo)
      } else if (isEdit) {
        toast.success('Your rental details have been updated.', 'Saved')
        router.push(setupRentalListPath())
      } else {
        toast.success('Your property has been saved.', 'Saved')
        router.push(SETUP_PATHS.dashboard)
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save rental details. Please try again.', 'Error')
    },
  })

  const rentalFormPath = withMode(SETUP_PATHS.rental)

  const confirmBody = (
    <>
      <div className="setup-page__confirm-card">
        <ConfirmRow label="Address" value={addressLine} />
        <ConfirmRow label="Payment status" value={statusLabel} />
        <ConfirmRow
          label={
            draft.formData.rentType === 'Monthly'
              ? 'Monthly rent'
              : draft.formData.rentType === 'Lease'
                ? 'Lease rent'
                : 'Annual rent'
          }
          value={totalRentNum > 0 ? formatCurrency(totalRentNum, 'NGN') : '—'}
        />

        {draft.formData.tenancyStatus === 'PAYING_BALANCE' && (
          <>
            <ConfirmRow label="Amount paid offline" value={formatCurrency(paidNum, 'NGN')} />
            <ConfirmRow label="Balance to pay on Upward" value={formatCurrency(remainingNum, 'NGN')} highlight />
          </>
        )}

        {draft.formData.proofFileMeta && (
          <ConfirmRow label="Proof of payment" value={`Attached: ${draft.formData.proofFileMeta.name}`} />
        )}

        <ConfirmRow label="Landlord account" value={paymentLabel} />
        <ConfirmRow label="Landlord / manager" value={managerLabel || '—'} />
        <ConfirmRow
          label="Next due date"
          value={draft.formData.rentEndDate ? formatDate(draft.formData.rentEndDate) : '—'}
        />
      </div>

      <div className="setup-page__notice">
        <span aria-hidden="true">🔒</span>
        <div>
          {draft.landlordSkipped
            ? 'Your property and payment details will be saved securely. You can invite your landlord anytime.'
            : 'We will link your property and notify your manager. Your data remains private and secure.'}
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
        : 'Save property details'

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
      subtitle="Make sure everything looks right before saving your rental details."
      progress={{ step: 4, total: 4 }}
      stepNames={STEP_NAMES}
      backHref={rentalFormPath}
      footer={footer}
    >
      {confirmBody}
    </SetupPageShell>
  )
}

function ConfirmRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="setup-page__confirm-row">
      <div className="setup-page__confirm-body">
        <span className="setup-page__confirm-label">{label}</span>
        <span className={`setup-page__confirm-value ${highlight ? 'setup-page__confirm-val--highlight' : ''}`} style={highlight ? { color: '#166534', fontWeight: 700 } : undefined}>
          {value}
        </span>
      </div>
    </div>
  )
}
