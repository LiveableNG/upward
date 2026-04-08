'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import { api } from '@/lib/api'

import { type Landlord, type PayRentStep } from '@/features/dashboard/components/payment/types'
import { StepSelect } from '@/features/dashboard/components/payment/StepSelect'
import { StepNewLandlord } from '@/features/dashboard/components/payment/StepNewLandlord'
import { StepAmount } from '@/features/dashboard/components/payment/StepAmount'
import { StepConfirm } from '@/features/dashboard/components/payment/StepConfirm'
import { StepSuccess } from '@/features/dashboard/components/payment/StepSuccess'

export default function PayRentPage() {
  const router = useRouter()
  const [step, setStep] = useState<PayRentStep>('select')
  const [savedLandlords, setSavedLandlords] = useState<Landlord[]>([])
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [narration, setNarration] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [paymentType, setpaymentType] = useState('Rent Payment')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lineItems, setLineItems] = useState<any[]>([])
  const [useSavings, setUseSavings] = useState(false)
  const [lastTxId, setLastTxId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('tenant@example.com')
  const savingsBalance = 0 // Mock for now

  useEffect(() => {
    // Fetch user and saved landlords
    Promise.all([api.getSavedLandlords(), api.getProfile()])
      .then(([landlords, profile]) => {
        setSavedLandlords(landlords)
        if (profile?.email) setUserEmail(profile.email)
        if (profile?.address) setPropertyAddress(profile.address)
      })
      .catch(() => {})
  }, [])

  const stepTitle: Record<PayRentStep, string> = {
    select: 'Pay Rent',
    new: 'New Recipient',
    confirm: 'Confirm Payment',
    checkout: 'Checkout',
    processing: 'Processing',
    success: 'Payment Sent',
  }

  function handleBack() {
    if (step === 'new') setStep('select')
    else if (step === 'confirm') {
      if (selectedLandlord && selectedLandlord.id.length < 15) {
        // IDs from 'new' step use timestamps
        setStep('new')
      } else {
        setStep('select')
      }
    } else router.push('/dashboard')
  }

  const handleCheckoutSuccess = async (ref: string) => {
    setStep('processing')
    try {
      const res = await api.recordTransaction({
        type: 'RENT',
        amount: payAmount,
        reference: ref,
        narration: narration || `Rent payment to ${selectedLandlord?.name}`,
        landlordId: selectedLandlord?.uuid,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
        paymentType,
        propertyAddress,
      })
      if (res?.uuid) {
        setLastTxId(res.uuid)
      }
    } catch (e) {
      console.error('Failed to record tx:', e)
    }
    setTimeout(() => setStep('success'), 1500)
  }

  const amountToDebit = payAmount - (useSavings ? Math.min(savingsBalance, payAmount) : 0)

  return (
    <div className="subpage dashboard dashboard--nav-offset">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {step !== 'checkout' && step !== 'processing' && step !== 'success' && (
        <header className="dashboard__header" style={{ marginBottom: 20 }}>
          <div className="dashboard__header-left">
            <button className="dashboard__back" onClick={handleBack}>
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <h2 className="dashboard__title">{stepTitle[step]}</h2>
          </div>
        </header>
      )}

      {step === 'select' && (
        <StepSelect
          saved={savedLandlords}
          pm={[]}
          onSelect={(l) => {
            setSelectedLandlord(l)
            // If they have a previous amount, we can pre-set it but they still go through StepAmount
            setPayAmount(0)
            setLineItems([])
            setStep('confirm')
          }}
          onNew={() => setStep('new')}
        />
      )}

      {step === 'new' && (
        <StepNewLandlord
          onContinue={async (data) => {
            let finalLandlord = data as Landlord
            if (data.save) {
              try {
                finalLandlord = await api.saveLandlord(data)
              } catch (e) {
                console.error('Failed to save landlord:', e)
              }
            }
            setSelectedLandlord(finalLandlord)
            setPayAmount(data.amount)
            setNarration(data.narration)
            setStep('confirm')
          }}
          onBack={() => setStep('select')}
        />
      )}

      {step === 'confirm' && selectedLandlord && (
        <>
          {payAmount === 0 ? (
            <StepAmount
              landlord={selectedLandlord}
              initialPropertyAddress={propertyAddress}
              initialPaymentType={paymentType}
              onContinue={(amt, nar, addr, name, items) => {
                setPayAmount(amt)
                setNarration(nar)
                setPropertyAddress(addr)
                setpaymentType(name)
                if (items) setLineItems(items)
              }}
              onBack={() => setStep('select')}
            />
          ) : (
            <StepConfirm
              landlord={selectedLandlord}
              amount={payAmount}
              narration={narration}
              paymentType={paymentType}
              propertyAddress={propertyAddress}
              useSavings={useSavings}
              onToggleSavings={setUseSavings}
              savingsBalance={savingsBalance}
              onConfirm={() => setStep('checkout')}
              onBack={handleBack}
              lineItems={lineItems}
            />
          )}
        </>
      )}

      {step === 'checkout' && selectedLandlord && (
        <PaystackEmbeddedCheckout
          email={userEmail}
          amount={amountToDebit}
          companyName={selectedLandlord.name}
          paymentType={paymentType}
          propertyAddress={propertyAddress}
          onSuccess={handleCheckoutSuccess}
          onClose={() => setStep('confirm')}
          lineItems={lineItems}
        />
      )}

      {step === 'processing' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '3px solid var(--border-solid)',
              borderTopColor: 'var(--clay)',
              animation: 'spin 1s linear infinite',
              boxShadow: '0 0 30px var(--clay-glow)',
            }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Processing transfer
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This usually takes a few seconds
            </div>
          </div>
        </div>
      )}

      {step === 'success' && selectedLandlord && (
        <StepSuccess
          landlord={selectedLandlord}
          amount={payAmount}
          transactionId={lastTxId || undefined}
          onDone={() => router.push('/dashboard')}
          router={router}
        />
      )}
    </div>
  )
}
