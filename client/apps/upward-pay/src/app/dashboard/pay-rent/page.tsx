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

import { PayRentSkeleton } from '@/features/dashboard/components/payment/PayRentSkeleton'

export default function PayRentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<PayRentStep>('select')
  const [savedLandlords, setSavedLandlords] = useState<Landlord[]>([])
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [narration, setNarration] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [paymentType, setpaymentType] = useState('Rent Payment')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lineItems, setLineItems] = useState<any[]>([])
  const [lastTxId, setLastTxId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('tenant@example.com')
  const [paymentRequestId, setPaymentRequestId] = useState<number | null>(null)
  const [requestedAmount, setRequestedAmount] = useState(0)
  const [totalPaidAlready, setTotalPaidAlready] = useState(0)
  const [userProperties, setUserProperties] = useState<any[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)

  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  
  useEffect(() => {
    // Fetch user, saved landlords and pending payments
    setLoading(true)
    Promise.all([api.getSavedLandlords(), api.getProfile(), api.getPendingPayments()])
      .then(([landlords, profile, pending]) => {
        setSavedLandlords(landlords)
        if (profile?.email) setUserEmail(profile.email)
        if (profile?.address) setPropertyAddress(profile.address)
        if (profile?.properties) setUserProperties(profile.properties)
        setPendingPayments(pending || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PayRentSkeleton />

  const handleSelectPending = (p: any) => {
    router.push(`/pay/${p.uuid}`)
  }

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
        paymentRequestId: paymentRequestId || undefined,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
        paymentType,
        propertyAddress,
        userPropertyId: selectedPropertyId || undefined,
      })
      if (res?.uuid) {
        setLastTxId(res.uuid)
      }
    } catch (e) {
      console.error('Failed to record tx:', e)
    }
    setTimeout(() => setStep('success'), 1500)
  }

  const amountToDebit = payAmount

  return (
    <div className="pay-rent-layout dashboard--nav-offset">
      <div className="pay-rent-container">
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

          /* Desktop Card Optimization */
          @media (min-width: 1024px) {
            .pay-rent-layout {
              display: flex;
              justify-content: center;
              align-items: flex-start;
              min-height: calc(100vh - 120px);
              padding: 20px 40px;
            }
            .pay-rent-container {
              width: 100%;
              max-width: 520px;
              background: var(--bg);
              border-radius: 32px;
              box-shadow: 0 40px 100px rgba(0, 0, 0, 0.08);
              border: 1px solid var(--border-solid);
              padding: 40px;
              margin: 40px auto;
              transition: all 0.3s ease;
            }
            .dashboard__header {
              border-bottom: none !important;
              padding: 0 !important;
              margin-bottom: 24px !important;
              background: transparent !important;
            }
            .dashboard__title {
              font-size: 24px;
              font-weight: 800;
            }
            .dashboard__back {
              /* Ensure global desktop styles applied */
            }
          }
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
          pending={pendingPayments}
          onSelectPending={handleSelectPending}
          onSelect={(l) => {
            setSelectedLandlord(l)
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
            } else if (data.accountNumber && data.bankCode) {
              try {
                const res = await api.resolveSubaccount(data.accountNumber, data.bankCode, data.name)
                finalLandlord = { ...data, subaccountCode: res.subaccountCode } as Landlord
              } catch (e) {
                console.error('Failed to resolve subaccount on the fly:', e)
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
              requestedAmount={requestedAmount}
              totalPaidAlready={totalPaidAlready}
              userProperties={userProperties}
              onContinue={(amt, nar, addr, name, items, propertyId) => {
                setPayAmount(amt)
                setNarration(nar)
                setPropertyAddress(addr)
                setpaymentType(name)
                setSelectedPropertyId(propertyId || null)
                if (items) setLineItems(items)
              }}
              onBack={() => {
                setPayAmount(0)
                setRequestedAmount(0)
                setTotalPaidAlready(0)
                setPaymentRequestId(null)
                setStep('select')
              }}
            />
          ) : (
            <StepConfirm
              landlord={selectedLandlord}
              amount={payAmount}
              narration={narration}
              paymentType={paymentType}
              propertyAddress={propertyAddress}
              requestedAmount={requestedAmount}
              totalPaidAlready={totalPaidAlready}
              onConfirm={() => setStep('checkout')}
              onEditAmount={() => setPayAmount(0)}
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
          subaccount={selectedLandlord.subaccountCode}
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
    </div>
  )
}
