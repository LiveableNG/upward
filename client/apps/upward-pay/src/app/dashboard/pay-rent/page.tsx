'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

import { type Landlord, type LineItem, type PayRentStep } from '@/features/dashboard/components/payment/types'
import { StepNewLandlord } from '@/features/dashboard/components/payment/StepNewLandlord'
import { StepAmount } from '@/features/dashboard/components/payment/StepAmount'
import { StepPropertySelect } from '@/features/dashboard/components/payment/StepPropertySelect'
import { StepPaymentMethod } from '@/features/dashboard/components/payment/StepPaymentMethod'
import { StepBankTransfer } from '@/features/dashboard/components/payment/StepBankTransfer'
import { PayRentSkeleton } from '@/features/dashboard/components/payment/PayRentSkeleton'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RenewalModal } from '@/features/payments/components/unified-pay/RenewalModal'
import { clearSetupDraft } from '@/features/dashboard/setup/setupDraft'
import { SETUP_RETURN_PATHS, setupAddPropertyPath } from '@/features/dashboard/setup/setupPaths'
import { propertySupportsBankTransfer } from '@/features/dashboard/components/payment/propertyBankAccount'
import { findProofUnderReviewForProperty, isProofUnderReview } from '@/features/dashboard/components/payment/propertyPayDisplay'

export default function PayRentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<PayRentStep>('property-select')
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [narration, setNarration] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [paymentType, setpaymentType] = useState('Rent Payment')
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  const [requestedAmount, setRequestedAmount] = useState(0)
  const [totalPaidAlready, setTotalPaidAlready] = useState(0)
  const [userProperties, setUserProperties] = useState<any[]>([])
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState<string | null>(null)
  const [propertyBalance, setPropertyBalance] = useState<any>(null)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [renewalPropertyUuid, setRenewalPropertyUuid] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const [authUser, setAuthUser] = useState<any>(null)

  const handleAddProperty = () => {
    clearSetupDraft()
    router.push(setupAddPropertyPath(SETUP_RETURN_PATHS.payRent))
  }

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

  function buildLandlordFromProperty(prop: any): Landlord {
    return {
      id: `verified-${prop.uuid}`,
      uuid: 'verified',
      name:
        prop.company?.name ||
        (prop.manager?.firstName ? `${prop.manager.firstName} ${prop.manager.lastName || ''}` : null) ||
        prop.managerName ||
        'Property Owner',
      accountName:
        prop.subaccount?.businessName ||
        prop.dedicatedAccount?.accountName ||
        prop.manualAccount?.accountName ||
        prop.company?.name ||
        'Verified Recipient',
      accountNumber: prop.subaccount?.accountNumber || prop.dedicatedAccount?.accountNumber || prop.manualAccount?.accountNumber || '',
      bankName: prop.dedicatedAccount?.bankName || prop.manualAccount?.bankName || '',
      bankCode: prop.subaccount?.bankCode || prop.dedicatedAccount?.bankCode || prop.manualAccount?.bankCode || '',
      avatar: (prop.company?.name || prop.manager?.firstName || 'P')[0].toUpperCase(),
      lastPaid: null,
      lastAmount: 0,
      subaccountCode: prop.subaccount?.subaccountCode,
      isVerified: true,
    }
  }

  function propertyHasPayoutRoute(prop: any): boolean {
    return !!(prop.isVerified || prop.subaccount || prop.dedicatedAccount || prop.manualAccount)
  }

  function handlePropertySelect(prop: any, pending: any[]) {
    if (findProofUnderReviewForProperty(pending, prop.uuid)) {
      return
    }

    const activeRequest = pending.find(
      p =>
        p.userPropertyUuid === prop.uuid &&
        (p.status === 'PENDING' || p.status === 'PARTIAL') &&
        !isProofUnderReview(p),
    )
    if (activeRequest) {
      router.push(`/pay/${activeRequest.uuid}`)
      return
    }

    setSelectedPropertyUuid(prop.uuid)
    const loc = prop.location
    const fullAddr = [loc?.address || prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
    setPropertyAddress(fullAddr)
    setpaymentType('Rent Payment')
    setPayAmount(0)
    setLineItems([])
    setNarration('')

    if (prop.isPastTenancy) {
      setRenewalPropertyUuid(prop.uuid)
      setShowRenewalModal(true)
    }

    if (propertyHasPayoutRoute(prop)) {
      setSelectedLandlord(buildLandlordFromProperty(prop))
      setStep('confirm')
    } else {
      setSelectedLandlord(null)
      setStep('new')
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getProfile(), api.getPendingPayments()])
      .then(([profile, pending]) => {
        setAuthUser(profile)
        const props = profile?.properties || []
        setUserProperties(props)
        setPendingPayments(pending || [])

        const searchParams = new URLSearchParams(window.location.search)
        const pUuid = searchParams.get('propertyUuid') || searchParams.get('prop')
        if (pUuid) {
          setSelectedPropertyUuid(pUuid)
          const prop = props.find((p: any) => p.uuid === pUuid)
          if (prop) {
            handlePropertySelect(prop, pending || [])
          }
        } else if (profile?.address) {
          setPropertyAddress(profile.address)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startOnlinePayment(overrides?: {
    amount?: number
    narration?: string
    propertyAddress?: string
    paymentType?: string
    lineItems?: LineItem[]
  }) {
    if (!selectedLandlord) return
    const resolvedAmount = overrides?.amount ?? payAmount
    const resolvedNarration = overrides?.narration ?? narration
    const resolvedAddress = overrides?.propertyAddress ?? propertyAddress
    const resolvedPaymentType = overrides?.paymentType ?? paymentType
    const resolvedLineItems = overrides?.lineItems ?? lineItems

    setProcessing(true)
    try {
      const targetPropertyUuid = selectedPropertyUuid || undefined
      const res = await api.createManualPaymentRequest({
        amount: resolvedAmount,
        landlordUuid: selectedLandlord.uuid,
        landlordDetails: (selectedLandlord as any).isNewLocal
          ? {
              accountNumber: selectedLandlord.accountNumber,
              bankCode: selectedLandlord.bankCode,
              name: selectedLandlord.name,
            }
          : undefined,
        propertyUuid: targetPropertyUuid,
        metadata: {
          narration: resolvedNarration || `Manual Payment for ${resolvedAddress}`,
          description: resolvedNarration || `Manual Payment for ${resolvedAddress}`,
          propertyAddress: resolvedAddress,
          userPropertyUuid: targetPropertyUuid,
          paymentType: resolvedPaymentType,
          lineItems: resolvedLineItems.length > 0 ? resolvedLineItems : undefined,
        },
      })
      if (res.uuid) {
        router.push(`/pay/${res.uuid}`)
      }
    } catch (e) {
      console.error('Failed to create manual payment request:', e)
      setProcessing(false)
    }
  }

  if (loading) return <PayRentSkeleton />

  const handleSelectPending = (p: any) => {
    if (isProofUnderReview(p)) return
    router.push(`/pay/${p.uuid}`)
  }

  const selectedProperty = userProperties.find(p => p.uuid === selectedPropertyUuid)

  const stepTitle: Record<PayRentStep, string> = {
    select: 'Pay Rent',
    'property-select': 'Pay Rent',
    new: 'Payment details',
    confirm: 'Enter Amount',
    'payment-method': 'Payment method',
    'bank-transfer': 'Bank transfer',
    'upload-proof': 'Upload Proof of Payment',
  }

  const stepSubtitle: Record<PayRentStep, string | undefined> = {
    select: 'Send payments to your landlord or property manager',
    'property-select': 'Choose the property you are paying rent for.',
    new: 'Enter the bank account this rent payment should be sent to.',
    confirm: 'Set the amount and breakdown',
    'payment-method': 'Choose how you want to pay',
    'bank-transfer': 'Choose where to send the money',
    'upload-proof': 'Upload your payment receipt',
  }

  function handleBack() {
    if (step === 'property-select') {
      setSelectedLandlord(null)
      router.push('/dashboard')
    } else if (step === 'new') {
      setStep('property-select')
    } else if (step === 'confirm') {
      if ((selectedLandlord as any)?.isNewLocal) {
        setStep('new')
      } else {
        setSelectedLandlord(null)
        setStep('property-select')
      }
    } else if (step === 'payment-method') {
      setStep('confirm')
    } else if (step === 'bank-transfer') {
      setStep('payment-method')
    } else if (step === 'upload-proof') {
      setStep('bank-transfer')
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
      {step === 'property-select' && (
        <StepPropertySelect
          properties={userProperties}
          pending={pendingPayments}
          onSelectPending={handleSelectPending}
          onAddProperty={handleAddProperty}
          onSelect={(prop) => handlePropertySelect(prop, pendingPayments)}
        />
      )}

      {step === 'new' && (
        <StepNewLandlord
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
          initialValue={
            selectedPropertyUuid
              ? (() => {
                  const prop = userProperties.find((p) => p.uuid === selectedPropertyUuid)
                  if (prop?.subaccount) {
                    return {
                      accountNumber: prop.subaccount.accountNumber || '',
                      bankCode: prop.subaccount.bankCode || '',
                      accountName: prop.subaccount.businessName || '',
                      bankName: '',
                    }
                  }
                  return undefined
                })()
              : undefined
          }
        />
      )}

      {step === 'confirm' && selectedLandlord && (
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
          authUser={authUser}
          processing={processing}
          onContinue={(amt, nar, addr, name, items) => {
            setPayAmount(amt)
            setNarration(nar)
            setPropertyAddress(addr)
            setpaymentType(name)
            setLineItems(items || [])

            const prop = userProperties.find(p => p.uuid === selectedPropertyUuid)
            if (propertySupportsBankTransfer(prop)) {
              setStep('payment-method')
            } else {
              startOnlinePayment({
                amount: amt,
                narration: nar,
                propertyAddress: addr,
                paymentType: name,
                lineItems: items || [],
              })
            }
          }}
        />
      )}

      {step === 'payment-method' && (
        <StepPaymentMethod
          amount={payAmount}
          processing={processing}
          onPayOnline={startOnlinePayment}
          onBankTransfer={() => setStep('bank-transfer')}
        />
      )}

      {step === 'bank-transfer' && selectedProperty && (
        <StepBankTransfer
          property={selectedProperty}
          amount={payAmount}
          lineItems={lineItems}
          onBack={() => setStep('payment-method')}
          onSuccess={() => router.push('/dashboard')}
        />
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
