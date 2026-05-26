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

export type PayStep = 'loading' | 'invoice' | 'checkout' | 'processing' | 'success' | 'onboarding' | 'already-paid' | 'cancelled' | 'error'

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

function distributeAmount(amount: number, items: LineItemRecord[], processingFee = 2000): LineItemAllocation[] {
  const allocs: LineItemAllocation[] = items.map(i => ({
    id: i.id,
    name: i.name,
    totalAmount: i.totalAmount,
    amountPaid: i.amountPaid,
    remaining: Math.max(0, i.totalAmount - i.amountPaid),
    allocated: 0
  }))

  let remaining = amount
  
  const feeItem = allocs.find(a => a.name === 'Processing Fee' || a.id === -2)
  if (feeItem) {
    const estimatedNet = amount > processingFee ? amount - processingFee : 0
    const dynamicFee = estimatedNet > 0 ? processingFee : 0
    
    feeItem.totalAmount = dynamicFee
    feeItem.remaining = dynamicFee
    
    const pay = Math.min(remaining, dynamicFee)
    feeItem.allocated = pay
    remaining -= pay
  }

  for (const item of allocs) {
    if (item.name === 'Processing Fee' || item.id === -2) continue
    if (item.remaining <= 0) continue
    const pay = Math.min(remaining, item.remaining)
    item.allocated = pay
    remaining -= pay
    if (remaining <= 0) break
  }

  return allocs
}

export function usePaymentFlow(uuid: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: authUser, login } = useAuth()
  const { success, error: toastError } = useToast()

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

  const feeVal = paymentData?.payment?.processingFee ?? 2000

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

  const loadPaymentDetails = useCallback(async () => {
    if (!uuid) return

    setStep('loading')
    const timeout = setTimeout(() => {
      if (step === 'loading') {
        setErrorMessage('Connection timed out. Please try again.')
        setStep('error')
      }
    }, 10000)

    try {
      const res = await api.get(`/payment-request/${uuid}`)
      clearTimeout(timeout)
      
      if (res.success) {
        setPaymentData(res.data)
        let items = (res.data.payment.lineItemRecords || []) as LineItemRecord[]
        
        // Insert dynamic Processing Fee
        items.unshift({
          id: -2,
          name: 'Processing Fee',
          totalAmount: 0,
          amountPaid: 0,
          status: 'PENDING'
        })
        
        setLineItems(items)
        const due = res.data.payment.amount - (res.data.payment.amountPaid || 0)

        if (res.data.payment.status === 'PAID' || due <= 0) {
          setStep('already-paid')
        } else if (res.data.payment.status === 'CANCELLED') {
          setStep('cancelled')
        } else {
          setStep('invoice')
        }

        const rentRemaining = items.reduce((sum, item) => {
          const isFee = item.name === 'Processing Fee' || item.id === -2
          if (isFee) return sum
          return sum + Math.max(0, item.totalAmount - item.amountPaid)
        }, 0)

        const finalDue = rentRemaining > 0 ? rentRemaining + (res.data.payment.processingFee ?? 2000) : 0
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
      clearTimeout(timeout)
      setErrorMessage(err.message || 'Payment request not found or expired')
      setStep('error')
    }
  }, [uuid])

  useEffect(() => {
    if (uuid) loadPaymentDetails()
  }, [uuid, loadPaymentDetails])

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
      const isFee = item.name === 'Processing Fee' || item.id === -2
      if (isFee) return sum
      return sum + Math.max(0, item.totalAmount - item.amountPaid)
    }, 0)
    if (rentRemaining <= 0) return 0
    return rentRemaining + (paymentData.payment.processingFee ?? 2000)
  }, [paymentData])

  const parsedAmount = parseFloat(amountInput) || 0
  const minRequired = paymentData?.payment?.minAmount || 0
  const isBelowMin = minRequired > 0 && parsedAmount > 0 && parsedAmount < minRequired && parsedAmount < totalOwed
  const isValidAmount = parsedAmount > 0 && !isBelowMin && parsedAmount <= totalOwed
  const currency = paymentData?.payment?.currency || 'NGN'
  const isFullPaymentRequired = paymentData?.payment?.allowPartial === false
  const isUnderpaying = isFullPaymentRequired && parsedAmount > 0 && parsedAmount < totalOwed

  const autoAllocs = useMemo(() => distributeAmount(Math.min(parsedAmount, totalOwed), lineItems, feeVal), [parsedAmount, lineItems, totalOwed, feeVal])

  const effectiveAllocs: LineItemAllocation[] = useMemo(() => {
    if (Object.keys(manualAllocs).length === 0) return autoAllocs

    const manualSum = Object.values(manualAllocs).reduce((acc, val) => acc + val, 0)
    const dynamicFee = manualSum > 0 ? feeVal : 0
    const feePayment = Math.min(parsedAmount - manualSum, dynamicFee)

    return lineItems.map(item => {
      const isFee = item.name === 'Processing Fee' || item.id === -2
      if (isFee) {
        return {
          id: item.id,
          name: item.name,
          totalAmount: dynamicFee,
          amountPaid: item.amountPaid,
          remaining: dynamicFee,
          allocated: feePayment
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
  }, [autoAllocs, manualAllocs, lineItems, parsedAmount, feeVal])

  const finalLineItemPayments = useMemo(() => 
    effectiveAllocs.filter(a => a.allocated > 0).map(a => ({ id: a.id, amountPaid: a.allocated, name: a.name }))
  , [effectiveAllocs])

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
    if (!item || item.name === 'Processing Fee' || item.id === -2 || item.status === 'PAID') return

    const remainingForThisItem = Math.max(0, item.totalAmount - item.amountPaid)
    const finalAmountForThisItem = Math.min(Math.max(0, amount), remainingForThisItem)

    let newManual = { ...manualAllocs }
    if (Object.keys(newManual).length === 0) {
      autoAllocs.forEach(a => {
        if (a.name !== 'Processing Fee' && a.id !== -2) newManual[a.id] = a.allocated
      })
    }

    newManual[id] = finalAmountForThisItem
    setManualAllocs(newManual)
    
    const manualSum = Object.values(newManual).reduce((acc, val) => acc + val, 0)
    const dynamicFee = manualSum > 0 ? feeVal : 0
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
        // Invalidate dashboard and score queries to reflect changes immediately
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['scoreProfile'] })
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
  }
}
