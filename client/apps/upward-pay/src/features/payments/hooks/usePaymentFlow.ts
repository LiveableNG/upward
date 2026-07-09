/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { Capacitor } from '@capacitor/core'
import { setCookie } from '@/lib/cookie-utils'

export type PayStep = 'loading' | 'invoice' | 'checkout' | 'processing' | 'success' | 'success-manual' | 'onboarding' | 'already-paid' | 'cancelled' | 'error' | 'manual-transfer'

export interface LineItemRecord {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  status: 'PENDING' | 'PARTIAL' | 'PAID'
}

export interface LineItemAllocation {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  allocated: number
  remaining: number
}

function distributeAmount(
  amount: number, 
  items: LineItemRecord[], 
  transactionFee: number, 
  benefitsFee: number, 
  isBenefitsOptedIn: boolean
): LineItemAllocation[] {
  const allocs: LineItemAllocation[] = items.map(i => {
    let remaining = Math.max(0, i.totalAmount - i.amountPaid)
    let totalAmount = i.totalAmount

    // Set the dynamic fee totalAmounts based on current selection
    if (i.id === -2 || i.name === 'Transaction Fee') {
      totalAmount = amount > 0 ? transactionFee : 0
      remaining = totalAmount
    } else if (i.id === -3 || i.name === 'Upward Benefits') {
      if (i.status === 'PAID') {
        totalAmount = i.totalAmount
        remaining = 0
      } else {
        totalAmount = (amount > 0 && isBenefitsOptedIn) ? benefitsFee : 0
        remaining = totalAmount
      }
    }

    return {
      id: i.id,
      name: i.name,
      totalAmount,
      amountPaid: i.amountPaid,
      remaining,
      allocated: 0
    }
  })

  let remaining = amount

  // 1. Pay Transaction Fee first (always repeats)
  const txFeeItem = allocs.find(a => a.id === -2 || a.name === 'Transaction Fee')
  if (txFeeItem && txFeeItem.remaining > 0) {
    const pay = Math.min(remaining, txFeeItem.remaining)
    txFeeItem.allocated = pay
    remaining -= pay
  }

  // 2. Pay rest of line items (e.g. Rent, management fees)
  for (const item of allocs) {
    if (item.id === -2 || item.id === -3 || item.name === 'Transaction Fee' || item.name === 'Upward Benefits') continue
    if (item.remaining <= 0) continue
    const pay = Math.min(remaining, item.remaining)
    item.allocated = pay
    remaining -= pay
    if (remaining <= 0) break
  }

  // 3. Pay Upward Benefits last (if opted in - lowest priority)
  if (isBenefitsOptedIn) {
    const benFeeItem = allocs.find(a => a.id === -3 || a.name === 'Upward Benefits')
    if (benFeeItem && benFeeItem.remaining > 0) {
      const pay = Math.min(remaining, benFeeItem.remaining)
      benFeeItem.allocated = pay
      remaining -= pay
    }
  }

  return allocs
}

export function usePaymentFlow(
  uuid: string,
  options?: {
    forceBenefitsOptOut?: boolean
  },
) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: authUser, login } = useAuth()
  const { success, error: toastError, info: toastInfo } = useToast()

  const [step, setStep] = useState<PayStep>('loading')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [lineItems, setLineItems] = useState<LineItemRecord[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [amountInput, setAmountInput] = useState('')
  const [manualAllocs, setManualAllocs] = useState<Record<number, number>>({})
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [autoPrompted, setAutoPrompted] = useState(false)
  const [isPendingRefund, setIsPendingRefund] = useState(false)

  const [isBenefitsOptedIn, setIsBenefitsOptedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.has('excludeBenefits')) {
        return searchParams.get('excludeBenefits') !== 'true'
      }
      if (searchParams.has('benefits')) {
        return searchParams.get('benefits') === 'true'
      }
    }
    // Default to standard checkout unless explicitly opted in.
    return false
  })
  const effectiveIsBenefitsOptedIn = options?.forceBenefitsOptOut
    ? false
    : isBenefitsOptedIn

  const rates = paymentData?.payment?.processingRates || { transactionFee: 2000, benefitsFee: 0, rentValue: 0, benefitsPaid: false, benefitsPaidForRequest: false }
  const activeBenefitsFee = (effectiveIsBenefitsOptedIn && !rates.benefitsPaid) ? rates.benefitsFee : 0
  const feeVal = rates.transactionFee + activeBenefitsFee

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  })

  const { login: executeLogin, loading: loginLoading } = useLogin(`/pay/${uuid}`)

  const loadPaymentDetails = useCallback(async (showLoadingStep = true) => {
    if (!uuid) return

    let timeout: any = null
    if (showLoadingStep) {
      setStep('loading')
      timeout = setTimeout(() => {
        setStep(prev => {
          if (prev === 'loading') {
            setErrorMessage('Connection timed out. Please try again.')
            return 'error'
          }
          return prev
        })
      }, 10000)
    }

    try {
      const res = await api.get(`/payment-request/${uuid}`)
      if (timeout) clearTimeout(timeout)
      
      if (res.success) {
        setPaymentData(res.data)
        let items = (res.data.payment.lineItemRecords || []) as LineItemRecord[]
        
        // Remove any existing dynamic fees to avoid duplicates
        items = items.filter(i => i.id !== -2 && i.id !== -3 && i.name !== 'Processing Fee' && i.name !== 'Transaction Fee' && i.name !== 'Upward Benefits')

        const dynamicRates = res.data.payment.processingRates || { transactionFee: 2000, benefitsFee: 0, benefitsPaid: false, benefitsPaidForRequest: false }

        // Insert dynamic Transaction Fee
        items.unshift({
          id: -2,
          name: 'Transaction Fee',
          totalAmount: dynamicRates.transactionFee,
          amountPaid: 0,
          status: 'PENDING'
        })
        
        // Insert dynamic Upward Benefits if not paid yet in tenure, or if paid specifically for this request
        const shouldShowBenefitsItem = (dynamicRates.benefitsFee > 0 && !dynamicRates.benefitsPaid) || 
                                       (dynamicRates.benefitsPaid && dynamicRates.benefitsPaidForRequest)
        
        if (shouldShowBenefitsItem) {
          items.unshift({
            id: -3,
            name: 'Upward Benefits',
            totalAmount: dynamicRates.benefitsFee,
            amountPaid: dynamicRates.benefitsPaidForRequest ? dynamicRates.benefitsFee : 0,
            status: dynamicRates.benefitsPaidForRequest ? 'PAID' : 'PENDING'
          })
        }
        
        setLineItems(items)
        const due = res.data.payment.amount - (res.data.payment.amountPaid || 0)

        const pendingRefund = res.data.payment.isPendingRefund || false
        setIsPendingRefund(pendingRefund)

        if (pendingRefund && !res.data.user.hasBankDetails) {
          toastInfo(
            'Add your payout account details under Profile > Banking & Payouts to receive your pending refund.',
            'Refund Pending'
          )
        }

        if (res.data.payment.status === 'PAID' || due <= 0) {
          setStep('already-paid')
        } else if (res.data.payment.status === 'CANCELLED') {
          setStep('cancelled')
        } else {
          setStep(prev => {
            if (prev === 'success' || prev === 'onboarding' || prev === 'already-paid') {
              return prev
            }
            return 'invoice'
          })
        }

        const rentRemaining = items.reduce((sum, item) => {
          const isFee = item.name === 'Processing Fee' || item.id === -2 || item.name === 'Transaction Fee' || item.id === -3 || item.name === 'Upward Benefits'
          if (isFee) return sum
          return sum + Math.max(0, item.totalAmount - item.amountPaid)
        }, 0)

        const finalDue = rentRemaining > 0 ? rentRemaining + dynamicRates.transactionFee + ((effectiveIsBenefitsOptedIn && !dynamicRates.benefitsPaid) ? dynamicRates.benefitsFee : 0) : 0
        setAmountInput(finalDue.toString())
        
        setFormData(prev => ({
          ...prev,
          firstName: res.data.user.firstName || '',
          lastName: res.data.user.lastName || '',
          email: res.data.user.email || '',
          phone: res.data.user.phone || '',
        }))

        if (res.data.property?.isPastTenancy) {
          setShowRenewalModal(true)
        }
      } else {
        throw new Error('Could not retrieve payment details')
      }
    } catch (err: any) {
      if (timeout) clearTimeout(timeout)
      setErrorMessage(err.message || 'Payment request not found or expired')
      setStep('error')
    }
  }, [uuid])

  useEffect(() => {
    if (uuid) loadPaymentDetails()
  }, [uuid, loadPaymentDetails])

  useEffect(() => {
    if (!paymentData?.payment) return
    if (Object.keys(manualAllocs).length > 0) return

    const rentRemaining = lineItems.reduce((sum, item) => {
      const isFee =
        item.name === 'Processing Fee' ||
        item.id === -2 ||
        item.name === 'Transaction Fee' ||
        item.id === -3 ||
        item.name === 'Upward Benefits'
      if (isFee) return sum
      return sum + Math.max(0, item.totalAmount - item.amountPaid)
    }, 0)

    const nextDue =
      rentRemaining > 0
        ? rentRemaining +
          rates.transactionFee +
          ((effectiveIsBenefitsOptedIn && !rates.benefitsPaid)
            ? rates.benefitsFee
            : 0)
        : 0

    setAmountInput((prev) => {
      const current = parseFloat(prev) || 0
      return current === nextDue ? prev : nextDue.toString()
    })
  }, [
    paymentData,
    lineItems,
    manualAllocs,
    rates.transactionFee,
    rates.benefitsFee,
    rates.benefitsPaid,
    effectiveIsBenefitsOptedIn,
  ])

  useEffect(() => {
    if (!uuid) return

    const getSseUrl = (reqUuid: string) => {
      if (typeof window === 'undefined') return ''
      const apiRoot = process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api/v1`
      return `${apiRoot}/payments/sse/request/${reqUuid}`
    }

    const sseUrl = getSseUrl(uuid)
    console.log('[SSE Checkout] Connecting to:', sseUrl)
    const eventSource = new EventSource(sseUrl)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'heartbeat') return

        console.log('[SSE Checkout] Event received:', data)

        if (data.type === 'payment.succeeded') {
          toastInfo('Payment confirmed. Updating checkout...', 'Payment Success')
          setStep(prev => {
            if (prev === 'invoice' || prev === 'checkout' || prev === 'processing') {
              return 'success'
            }
            return prev
          })
          loadPaymentDetails(false)
        } else if (data.type === 'payment.request.updated') {
          toastInfo('Payment request updated. Refreshing checkout...', 'Invoice Update')
          loadPaymentDetails(false)
        }
      } catch (err) {
        console.error('[SSE Checkout] Error processing event:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[SSE Checkout] Connection error:', err)
      eventSource.close()
    }

    return () => {
      console.log('[SSE Checkout] Disconnecting')
      eventSource.close()
    }
  }, [uuid, loadPaymentDetails, toastInfo])

  // Biometrics
  useEffect(() => {
    async function triggerAutoBiometrics() {
      if (!Capacitor.isNativePlatform() || autoPrompted || authUser || step !== 'invoice' || !paymentData?.hasPassword) return

      const available = await BiometricsService.isAvailable()
      const enabled = await BiometricsService.isEnabled()

      if (available && enabled && !loginLoading) {
        setAutoPrompted(true)
        setTimeout(async () => {
          try {
            const authenticated = await BiometricsService.authenticate('Log in to Pay')
            if (authenticated) {
              const credentials = await BiometricsService.getCredentials()
              if (credentials) {
                executeLogin(credentials.email, credentials.password)
              }
            }
          } catch (e) {
            console.error('Auto-biometric login failed:', e)
          }
        }, 800)
      }
    }
    triggerAutoBiometrics()
  }, [step, paymentData, authUser, autoPrompted, loginLoading, executeLogin])

  const totalOwed = useMemo(() => {
    if (!paymentData?.payment) return 0
    const items = paymentData.payment.lineItemRecords || []
    const rentRemaining = items.reduce((sum: number, item: any) => {
      const isFee = item.name === 'Processing Fee' || item.id === -2 || item.name === 'Transaction Fee' || item.id === -3 || item.name === 'Upward Benefits'
      if (isFee) return sum
      return sum + Math.max(0, item.totalAmount - item.amountPaid)
    }, 0)
    if (rentRemaining <= 0) return 0
    return rentRemaining + rates.transactionFee + ((effectiveIsBenefitsOptedIn && !rates.benefitsPaid) ? rates.benefitsFee : 0)
  }, [paymentData, rates, effectiveIsBenefitsOptedIn])

  const parsedAmount = parseFloat(amountInput) || 0
  const minRequired = paymentData?.payment?.minAmount || 0
  const isBelowMin = minRequired > 0 && parsedAmount > 0 && parsedAmount < minRequired && parsedAmount < totalOwed
  const isValidAmount = parsedAmount > 0 && !isBelowMin && parsedAmount <= totalOwed
  const currency = paymentData?.payment?.currency || 'NGN'
  const isFullPaymentRequired = paymentData?.payment?.allowPartial === false
  const isUnderpaying = isFullPaymentRequired && parsedAmount > 0 && parsedAmount < totalOwed

  const autoAllocs = useMemo(() => distributeAmount(
    Math.min(parsedAmount, totalOwed),
    lineItems,
    rates.transactionFee,
    rates.benefitsPaid ? 0 : rates.benefitsFee,
    effectiveIsBenefitsOptedIn
  ), [parsedAmount, lineItems, totalOwed, rates, effectiveIsBenefitsOptedIn])

  const effectiveAllocs: LineItemAllocation[] = useMemo(() => {
    if (Object.keys(manualAllocs).length === 0) return autoAllocs

    const manualSum = Object.values(manualAllocs).reduce((acc, val) => acc + val, 0)
    const dynamicTxFee = manualSum > 0 ? rates.transactionFee : 0
    const dynamicBenFee = (manualSum > 0 && effectiveIsBenefitsOptedIn && !rates.benefitsPaid) ? rates.benefitsFee : 0
    
    let remaining = parsedAmount - manualSum

    return lineItems.map(item => {
      if (item.id === -2 || item.name === 'Transaction Fee') {
        const pay = Math.min(remaining, dynamicTxFee)
        remaining -= pay
        return {
          id: item.id,
          name: item.name,
          totalAmount: dynamicTxFee,
          amountPaid: item.amountPaid,
          remaining: dynamicTxFee,
          allocated: pay
        }
      }
      if (item.id === -3 || item.name === 'Upward Benefits') {
        if (item.status === 'PAID') {
          return {
            id: item.id,
            name: item.name,
            totalAmount: item.totalAmount,
            amountPaid: item.amountPaid,
            remaining: 0,
            allocated: 0
          }
        }
        const pay = Math.min(remaining, dynamicBenFee)
        remaining -= pay
        return {
          id: item.id,
          name: item.name,
          totalAmount: dynamicBenFee,
          amountPaid: item.amountPaid,
          remaining: dynamicBenFee,
          allocated: pay
        }
      }
      return {
        id: item.id,
        name: item.name,
        totalAmount: item.totalAmount,
        amountPaid: item.amountPaid,
        remaining: Math.max(0, item.totalAmount - item.amountPaid),
        allocated: manualAllocs[item.id] || 0
      }
    })
  }, [autoAllocs, manualAllocs, lineItems, parsedAmount, rates, effectiveIsBenefitsOptedIn])

  const finalLineItemPayments = useMemo(() => {
    return effectiveAllocs.filter(a => a.allocated > 0).map(a => ({
      id: a.id,
      amountPaid: a.allocated,
      name: a.name
    }))
  }, [effectiveAllocs])

  const progressPct = totalOwed > 0 ? Math.min(100, (Math.min(parsedAmount, totalOwed) / totalOwed) * 100) : 0

  const handleAmountChange = (val: string) => {
    setManualAllocs({})
    let n = parseFloat(val) || 0
    if (n > totalOwed) {
      setAmountInput(totalOwed.toString())
    } else {
      setAmountInput(val)
    }
  }

  const handleAllocationChange = (id: number, amount: number) => {
    const item = lineItems.find(a => a.id === id)
    if (!item || item.name === 'Processing Fee' || item.id === -2 || item.name === 'Transaction Fee' || item.id === -3 || item.name === 'Upward Benefits' || item.status === 'PAID') return

    const remainingForThisItem = Math.max(0, item.totalAmount - item.amountPaid)
    const finalAmountForThisItem = Math.min(Math.max(0, amount), remainingForThisItem)

    let newManual = { ...manualAllocs }
    if (Object.keys(newManual).length === 0) {
      autoAllocs.forEach(a => {
        if (a.name !== 'Processing Fee' && a.id !== -2 && a.name !== 'Transaction Fee' && a.id !== -3 && a.name !== 'Upward Benefits') newManual[a.id] = a.allocated
      })
    }

    newManual[id] = finalAmountForThisItem
    setManualAllocs(newManual)
    
    const manualSum = Object.values(newManual).reduce((acc, val) => acc + val, 0)
    const dynamicFee = manualSum > 0 ? (rates.transactionFee + ((effectiveIsBenefitsOptedIn && !rates.benefitsPaid) ? rates.benefitsFee : 0)) : 0
    setAmountInput((manualSum + dynamicFee).toString())
  }

  const handlePaymentSuccess = async (reference: string) => {
    setStep('processing')
    try {
      const res = await api.post(`/payment-request/${uuid}/confirm`, {
        reference,
        lineItemPayments: finalLineItemPayments
      })
      if (res.success) {
        if (res.settlementStatus === 'PENDING_REFUND') {
          setIsPendingRefund(true)
          setStep('success')
        } else {
          success('Payment successful!')
          setStep(!paymentData.hasPassword ? 'onboarding' : 'success')
        }
        // Invalidate and refetch queries to reflect changes immediately
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['scoreProfile'] })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.refetchQueries({ queryKey: ['dashboard'] })
        queryClient.refetchQueries({ queryKey: ['scoreProfile'] })
        queryClient.refetchQueries({ queryKey: ['notifications'] })
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to verify payment')
      setStep('invoice')
    }
  }

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toastError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await api.post(`/public/invite/${paymentData.inviteToken || paymentData.user.uuid}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      })
      if (res.success) {
        success('Account activated!')
        if (res.user && res.accessToken) {
          setCookie('pay_access_token', res.accessToken)
          login(res.user)
          router.replace('/dashboard')
        } else {
          router.push('/login')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to activate account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    step, setStep,
    paymentData,
    lineItems,
    errorMessage,
    showPassword, setShowPassword,
    isSubmitting,
    amountInput,
    manualAllocs,
    showBreakdown, setShowBreakdown,
    showRenewalModal, setShowRenewalModal,
    formData, setFormData,
    totalOwed,
    parsedAmount,
    minRequired,
    isBelowMin,
    isValidAmount,
    isFullPaymentRequired,
    isUnderpaying,
    currency,
    effectiveAllocs,
    finalLineItemPayments,
    progressPct,
    handleAmountChange,
    handleAllocationChange,
    handlePaymentSuccess,
    handleActivation,
    loadPaymentDetails,
    loginLoading,
    executeLogin,
    authUser,
    isPendingRefund,
    isBenefitsOptedIn: effectiveIsBenefitsOptedIn,
    setIsBenefitsOptedIn,
    rates
  }
}
