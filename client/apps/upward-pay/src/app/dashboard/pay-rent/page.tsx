'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

import { type Landlord, type PayRentStep } from '@/features/dashboard/components/payment/types'
import { StepSelect } from '@/features/dashboard/components/payment/StepSelect'
import { StepNewLandlord } from '@/features/dashboard/components/payment/StepNewLandlord'
import { StepAmount } from '@/features/dashboard/components/payment/StepAmount'
import { StepConfirm } from '@/features/dashboard/components/payment/StepConfirm'
import { StepPropertySelect } from '@/features/dashboard/components/payment/StepPropertySelect'
import { PayRentSkeleton } from '@/features/dashboard/components/payment/PayRentSkeleton'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RenewalModal } from '@/features/payments/components/unified-pay/RenewalModal'

export default function PayRentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<PayRentStep>('select')
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [narration, setNarration] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [paymentType, setpaymentType] = useState('Rent Payment')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lineItems, setLineItems] = useState<any[]>([])

  const [requestedAmount, setRequestedAmount] = useState(0)
  const [totalPaidAlready, setTotalPaidAlready] = useState(0)
  const [userProperties, setUserProperties] = useState<any[]>([])
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState<string | null>(null)
  const [propertyBalance, setPropertyBalance] = useState<any>(null)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [renewalPropertyUuid, setRenewalPropertyUuid] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

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
  const [pmLandlords, setPmLandlords] = useState<Landlord[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getProfile(), api.getPendingPayments()])
      .then(([profile, pending]) => {
        const props = profile?.properties || []
        setUserProperties(props)

        const derivedPms = props
          .filter((p: any) => p.subaccount)
          .map((p: any) => ({
            id: `verified-${p.uuid}`,
            uuid: 'verified',
            propertyUuid: p.uuid,
            name: p.company?.name || (p.manager?.firstName ? `${p.manager.firstName} ${p.manager.lastName}` : 'Property Owner'),
            accountName: p.subaccount.businessName,
            accountNumber: p.subaccount.accountNumber,
            bankCode: p.subaccount.bankCode,
            subaccountCode: p.subaccount.subaccountCode,
            isVerified: true,
            avatar: (p.company?.name || p.manager?.firstName || 'P')[0].toUpperCase(),
            address: [p.address, p.location?.area].filter(Boolean).join(', '),
          }))
        setPmLandlords(derivedPms as any[])

        const searchParams = new URLSearchParams(window.location.search)
        const pUuid = searchParams.get('propertyUuid') || searchParams.get('prop')
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
    confirm: payAmount > 0 ? 'Confirm Payment' : 'Enter Amount',
  }

  const stepSubtitle: Record<PayRentStep, string | undefined> = {
    select: 'Send payments to your landlord or property manager',
    'property-select': 'Select the property you are paying for',
    new: 'Enter recipient account details',
    confirm: payAmount > 0 ? 'Review and authorize payment details' : 'Set the amount and breakdown',
  }

  function handleBack() {
    if (step === 'property-select') {
      setSelectedLandlord(null)
      setStep('select')
    } else if (step === 'new') {
      setStep('property-select')
    } else if (step === 'confirm') {
      if (payAmount > 0) {
        setPayAmount(0)
      } else if ((selectedLandlord as any)?.isNewLocal) {
        setStep('new')
      } else {
        setSelectedLandlord(null)
        setStep('select')
      }
    } else {
      setSelectedLandlord(null)
      router.push('/dashboard')
    }
  }

  return (
    <PayPageShell
      title={stepTitle[step]}
      subtitle={stepSubtitle[step]}
      showBack
      onBack={handleBack}
    >
      {step === 'select' && (
        <StepSelect
          pm={pmLandlords}
          pending={pendingPayments}
          onSelectPending={handleSelectPending}
          onSelect={(l: any) => {
            setPayAmount(0)
            setLineItems([])
            if (l.isVerified && l.propertyUuid) {
              setSelectedLandlord(l)
              setSelectedPropertyUuid(l.propertyUuid)
              const prop = userProperties.find((p: any) => p.uuid === l.propertyUuid)
              if (prop) {
                const loc = prop.location
                const fullAddr = [prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
                setPropertyAddress(fullAddr)
              }
              setStep('confirm')
            } else {
              setSelectedLandlord(l)
              setStep('property-select')
            }
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
            const activeRequest = pendingPayments.find(
              p => p.userPropertyUuid === prop.uuid && (p.status === 'PENDING' || p.status === 'PARTIAL'),
            )
            if (activeRequest) {
              router.push(`/pay/${activeRequest.uuid}`)
              return
            }

            setSelectedPropertyUuid(prop.uuid)
            const loc = prop.location
            const fullAddr = [prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
            setPropertyAddress(fullAddr)
            setpaymentType('Rent Payment')

            if (prop.isPastTenancy) {
              setRenewalPropertyUuid(prop.uuid)
              setShowRenewalModal(true)
            }

            if (prop.isVerified || prop.subaccount || prop.dedicatedAccount) {
              const managedLandlord = {
                uuid: 'verified',
                name:
                  prop.company?.name ||
                  (prop.manager?.firstName ? `${prop.manager.firstName} ${prop.manager.lastName || ''}` : null) ||
                  prop.managerName ||
                  'Property Owner',
                accountName:
                  prop.subaccount?.businessName ||
                  prop.dedicatedAccount?.accountName ||
                  prop.company?.name ||
                  'Verified Recipient',
                accountNumber: prop.subaccount?.accountNumber || prop.dedicatedAccount?.accountNumber || '',
                bankName: prop.dedicatedAccount?.bankName || '',
                bankCode: prop.subaccount?.bankCode || prop.dedicatedAccount?.bankCode || '',
                subaccountCode: prop.subaccount?.subaccountCode,
                isVerified: true,
              }
              setSelectedLandlord(managedLandlord as any)
              setStep('confirm')
            } else if (selectedLandlord) {
              setStep('confirm')
            } else {
              setStep('new')
            }
          }}
        />
      )}

      {step === 'new' && (
        <StepNewLandlord
          isVerifiedUser={!!selectedPropertyUuid}
          onContinue={async (data) => {
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
              onConfirm={async () => {
                setProcessing(true)
                try {
                  const feeItem = lineItems.find(i => (i.label || i.name) === 'Processing Fee')
                  const feeAmount = feeItem ? Number(feeItem.amount || 0) : 0

                  const res = await api.createManualPaymentRequest({
                    amount: payAmount - feeAmount,
                    landlordUuid: selectedLandlord.uuid,
                    landlordDetails: (selectedLandlord as any).isNewLocal
                      ? {
                          accountNumber: selectedLandlord.accountNumber,
                          bankCode: selectedLandlord.bankCode,
                          name: selectedLandlord.name,
                        }
                      : undefined,
                    propertyUuid: selectedPropertyUuid || undefined,
                    metadata: {
                      narration: narration || `Manual Payment for ${propertyAddress}`,
                      description: narration || `Manual Payment for ${propertyAddress}`,
                      propertyAddress,
                      userPropertyUuid: selectedPropertyUuid || undefined,
                      paymentType,
                      lineItems:
                        lineItems.length > 0
                          ? lineItems.filter(i => (i.label || i.name) !== 'Processing Fee')
                          : undefined,
                    },
                  })
                  if (res.uuid) {
                    router.push(`/pay/${res.uuid}`)
                  }
                } catch (e) {
                  console.error('Failed to create manual payment request:', e)
                  setProcessing(false)
                }
              }}
              processing={processing}
              onEditAmount={() => setPayAmount(0)}
              onBack={handleBack}
              lineItems={lineItems}
              propertyBalance={propertyBalance}
            />
          )}
        </>
      )}

      {renewalPropertyUuid && (
        <RenewalModal
          isOpen={showRenewalModal}
          propertyUuid={renewalPropertyUuid}
          onClose={() => setShowRenewalModal(false)}
          onRenewed={() => {
            setShowRenewalModal(false)
            setUserProperties(prev =>
              prev.map(p => (p.uuid === renewalPropertyUuid ? { ...p, isPastTenancy: false } : p)),
            )
          }}
        />
      )}
    </PayPageShell>
  )
}
