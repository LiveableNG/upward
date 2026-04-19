'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'

import { type Landlord, type PayRentStep } from '@/features/dashboard/components/payment/types'
import { StepSelect } from '@/features/dashboard/components/payment/StepSelect'
import { StepNewLandlord } from '@/features/dashboard/components/payment/StepNewLandlord'
import { StepAmount } from '@/features/dashboard/components/payment/StepAmount'
import { StepConfirm } from '@/features/dashboard/components/payment/StepConfirm'
import { StepSuccess } from '@/features/dashboard/components/payment/StepSuccess'
import { StepPropertySelect } from '@/features/dashboard/components/payment/StepPropertySelect'
import { PayRentSkeleton } from '@/features/dashboard/components/payment/PayRentSkeleton'

export default function PayRentPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
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
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState<string | null>(null)
  const [propertyBalance, setPropertyBalance] = useState<any>(null)
  const [pendingLandlordToSave, setPendingLandlordToSave] = useState<any>(null)

  useEffect(() => {
    if (selectedPropertyUuid) {
      api.getPropertyBalance(selectedPropertyUuid)
        .then(res => setPropertyBalance(res))
        .catch(err => console.error('Failed to fetch balance:', err))
    } else {
      setPropertyBalance(null)
    }
  }, [selectedPropertyUuid])

  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  
  useEffect(() => {
    // Fetch user, saved landlords and pending payments
    setLoading(true)
    Promise.all([api.getSavedLandlords(), api.getProfile(), api.getPendingPayments()])
      .then(([landlords, profile, pending]) => {
        setSavedLandlords(landlords)
        if (profile?.email) setUserEmail(profile.email)
        
        const props = profile?.properties || []
        setUserProperties(props)

        // Check for propertyUuid in URL
        const searchParams = new URLSearchParams(window.location.search)
        const pUuid = searchParams.get('propertyUuid')
        if (pUuid) {
          setSelectedPropertyUuid(pUuid)
          const prop = props.find((p: any) => p.uuid === pUuid)
          if (prop) {
            const loc = prop.location
            const fullAddr = [prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
            setPropertyAddress(fullAddr)
          }
        } else if (profile?.address) {
          setPropertyAddress(profile.address)
        }
        
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
    'property-select': 'Select Property',
    new: 'New Recipient',
    confirm: 'Confirm Payment',
    checkout: 'Checkout',
    processing: 'Processing',
    success: 'Payment Sent',
  }

  function handleBack() {
    if (step === 'property-select') setStep('select')
    else if (step === 'new') setStep('property-select')
    else if (step === 'confirm') {
      if (payAmount > 0) {
        setPayAmount(0)
      } else if ((selectedLandlord as any)?.isNewLocal) {
        setStep('new')
      } else {
        setStep('property-select')
      }
    } else router.push('/dashboard')
  }

  const handleCheckoutSuccess = async (ref: string) => {
    setStep('processing')
    try {
      if (pendingLandlordToSave) {
        try {
          await api.saveLandlord(pendingLandlordToSave)
          setPendingLandlordToSave(null)
        } catch (e) {
          console.error('Failed to save landlord after success:', e)
        }
      }

      // 2. Record transaction
      const res = await api.recordTransaction({
        type: 'RENT',
        amount: payAmount,
        reference: ref,
        narration: narration || `Rent payment for ${propertyAddress}`,
        landlordId: selectedLandlord?.uuid,
        paymentRequestId: paymentRequestId || undefined,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
        paymentType,
        propertyAddress,
        userPropertyUuid: selectedPropertyUuid || undefined,
      })
      if (res?.uuid) {
        setLastTxId(res.uuid)
        try {
           await refreshUser()
        } catch (re) {
           console.error('Failed to refresh user after payment:', re)
        }
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
              padding: 0px 40px;
            }
            .pay-rent-container {
              width: 100%;
              max-width: 520px;
              background: var(--bg);
              border-radius: 32px;
              box-shadow: 0 40px 100px rgba(0, 0, 0, 0.08);
              border: 1px solid var(--border-solid);
              padding: 40px;
              margin: 10px auto; /* Reduced from 20px */
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
              margin-bottom: 24px;
            }
            .dashboard__back {
              /* Ensure global desktop styles applied */
            }
          }
        `}</style>

        {step !== 'checkout' && step !== 'processing' && step !== 'success' && (
          <div className="pay-rent__header">
            <div className="dashboard__header-left">
              <button className="dashboard__back" onClick={handleBack}>
                <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <h2 className="dashboard__title">{stepTitle[step]}</h2>
            </div>
          </div>
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
            setStep('property-select')
          }}
          onNew={() => {
            setSelectedLandlord(null)
            setStep('property-select')
          }}
        />
      )}

      {step === 'property-select' && (
        <StepPropertySelect 
          properties={userProperties}
          onSelect={(prop) => {
             const activeRequest = pendingPayments.find(p => p.userPropertyUuid === prop.uuid && (p.status === 'PENDING' || p.status === 'PARTIAL'))
             if (activeRequest) {
               router.push(`/pay/${activeRequest.uuid}`)
               return
             }

             setSelectedPropertyUuid(prop.uuid)
             const loc = prop.location
             const fullAddr = [prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
             setPropertyAddress(fullAddr)
             setpaymentType('Rent Payment')
             
             if (prop.company?.name || prop.companyName) {
             }
             
             if (selectedLandlord) {
               setStep('confirm')
             } else {
               setStep('new')
             }
          }}
        />
      )}

      {step === 'new' && (
        <StepNewLandlord
          onContinue={async (data) => {
            setPendingLandlordToSave(data.save ? data : null)
            
            let finalLandlord = data as Landlord
            if (data.accountNumber && data.bankCode) {
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
          onBack={() => setStep('property-select')}
        />
      )}

      {step === 'confirm' && selectedLandlord && (
        <>
          {payAmount === 0 ? (
            <StepAmount
              landlord={selectedLandlord}
              initialPropertyAddress={propertyAddress}
              initialPropertyUuid={selectedPropertyUuid}
              propertyBalance={propertyBalance}
              initialPaymentType={paymentType}
              initialLineItems={lineItems}
              initialNarration={narration}
              requestedAmount={requestedAmount}
              totalPaidAlready={totalPaidAlready}
              userProperties={userProperties}
              onContinue={(amt, nar, addr, name, items, propertyUuid) => {
                setPayAmount(amt)
                setNarration(nar)
                setPropertyAddress(addr)
                setpaymentType(name)
                setSelectedPropertyUuid(propertyUuid || null)
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
              propertyBalance={propertyBalance}
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
          propertyAddress={propertyAddress}
          propertyBalance={propertyBalance}
        />
      )}
      </div>
    </div>
  )
}
