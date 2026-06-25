'use client'

import React from 'react'
import { PayFlowPrimaryButton } from './PayPageShell'
import { type Landlord } from './types'
import {
  PaymentAccountForm,
  isPaymentAccountResolved,
  type PaymentAccountFormValue,
} from './PaymentAccountForm'

export function StepNewLandlord({
  onContinue,
  onBack,
  initialValue,
}: {
  onContinue: (
    data: Partial<Landlord> & {
      amount: number
      narration: string
    },
  ) => void
  onBack: () => void
  initialValue?: PaymentAccountFormValue
}) {
  void onBack

  const [form, setForm] = React.useState<PaymentAccountFormValue>(
    initialValue || {
      accountNumber: '',
      bankCode: '',
      accountName: '',
      bankName: '',
    },
  )

  const canProceed = isPaymentAccountResolved(form)

  return (
    <div>
      <PaymentAccountForm value={form} onChange={setForm} />

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton
          disabled={!canProceed}
          onClick={() => {
            if (!canProceed) return

            onContinue({
              id: Date.now().toString(),
              name: form.accountName,
              accountName: form.accountName,
              accountNumber: form.accountNumber,
              bankName: form.bankName,
              bankCode: form.bankCode,
              avatar: form.accountName?.[0] || '?',
              amount: 0,
              narration: '',
              lastPaid: null,
              lastAmount: 0,
              isNewLocal: true,
            } as any)
          }}
        >
          Continue
        </PayFlowPrimaryButton>
      </div>
    </div>
  )
}
