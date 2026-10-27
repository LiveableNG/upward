import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  confirmPaymentRequest,
  fetchPaymentRequest,
  initializePayment,
  verifyPayment,
} from '@/features/payments/services/paymentService'
import { type LineItemRecord } from '@/features/payments/types'
import {
  buildLineItemsWithFees,
  distributeAmount,
} from '@/features/payments/utils/paymentAllocation'
import { getErrorMessage } from '@/lib/errors'

WebBrowser.maybeCompleteAuthSession()

export type CheckoutStep =
  | 'loading'
  | 'invoice'
  | 'checkout'
  | 'success'
  | 'activation'
  | 'error'
  | 'already-paid'

export function useUnifiedCheckout(paymentUuid: string | null) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<CheckoutStep>('loading')
  const [amountInput, setAmountInput] = useState('')
  const [benefitsOptIn, setBenefitsOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dvaConfig, setDvaConfig] = useState<{
    accountNumber: string
    accountName: string
    bankName: string
    reference: string
  } | null>(null)
  const [activeReference, setActiveReference] = useState<string | null>(null)
  const [successAmount, setSuccessAmount] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ['payment-request', paymentUuid],
    enabled: !!paymentUuid,
    queryFn: () => fetchPaymentRequest(paymentUuid!),
  })

  const paymentRequest = query.data
  const payment = paymentRequest?.payment
  const userEmail = paymentRequest?.user?.email
  const needsAccountActivation =
    paymentRequest?.hasPassword === false ||
    (paymentRequest?.user?.hasPassword === false && !!paymentRequest?.user?.email)

  const rates = payment?.processingRates ?? {
    transactionFee: 0,
    benefitsFee: 0,
    benefitsPaid: true,
    benefitsPaidForRequest: false,
  }

  const lineItems: LineItemRecord[] = useMemo(() => {
    if (!payment) return []
    return buildLineItemsWithFees(payment.lineItemRecords || [], rates)
  }, [payment, rates])

  const totalOwed = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + Math.max(0, item.totalAmount - item.amountPaid), 0)
  }, [lineItems])

  const parsedAmount = Math.min(Math.max(0, parseFloat(amountInput) || 0), totalOwed)

  const allocations = useMemo(
    () =>
      distributeAmount(
        parsedAmount,
        lineItems,
        rates.transactionFee,
        rates.benefitsFee,
        benefitsOptIn,
      ),
    [parsedAmount, lineItems, rates, benefitsOptIn],
  )

  useEffect(() => {
    if (!paymentUuid) {
      setStep('error')
      setError('No payment selected')
      return
    }
    if (query.isLoading) {
      setStep('loading')
      return
    }
    if (query.isError) {
      setStep('error')
      setError(getErrorMessage(query.error))
      return
    }
    if (!payment) return

    const due = payment.amount - (payment.amountPaid || 0)
    if (payment.status === 'PAID' || due <= 0) {
      setStep('already-paid')
      return
    }
    setStep('invoice')
  }, [paymentUuid, query.isLoading, query.isError, payment])

  useEffect(() => {
    if (!payment) return
    const due = payment.amount - (payment.amountPaid || 0)
    setAmountInput(String(Math.max(0, due)))
  }, [payment?.uuid])

  const finalLineItemPayments = useMemo(
    () =>
      allocations
        .filter((a) => a.allocated > 0)
        .map((a) => ({ id: a.id, amountPaid: a.allocated, name: a.name })),
    [allocations],
  )

  const completePayment = useCallback(
    async (reference: string) => {
      if (!paymentUuid) return
      setProcessing(true)
      try {
        await confirmPaymentRequest(paymentUuid, {
          reference,
          lineItemPayments: finalLineItemPayments,
        })
        setSuccessAmount(parsedAmount)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['pending-payments'] }),
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['score-profile'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        ])
        setStep(needsAccountActivation ? 'activation' : 'success')
      } catch (err) {
        setError(getErrorMessage(err))
        setStep('error')
      } finally {
        setProcessing(false)
      }
    },
    [paymentUuid, finalLineItemPayments, parsedAmount, queryClient, needsAccountActivation],
  )

  const pollVerify = useCallback(
    async (reference: string) => {
      const res = await verifyPayment(reference)
      if (res?.isVerified || res?.status === 'SUCCESS' || res?.status === 'PAID') {
        await completePayment(reference)
        return true
      }
      return false
    },
    [completePayment],
  )

  useEffect(() => {
    if (!dvaConfig?.reference || step !== 'checkout') return
    const interval = setInterval(() => {
      void pollVerify(dvaConfig.reference)
    }, 8000)
    return () => clearInterval(interval)
  }, [dvaConfig?.reference, step, pollVerify])

  const startCheckout = useCallback(async () => {
    if (!paymentUuid || parsedAmount <= 0) return
    setProcessing(true)
    setError(null)
    try {
      const lineItemsPayload = finalLineItemPayments.map((item) => ({
        name: item.name,
        amount: item.amountPaid,
      }))

      const init = await initializePayment({
        amount: parsedAmount,
        paymentRequestUuid: paymentUuid,
        metadata: {
          lineItems: lineItemsPayload,
          description: payment?.description || 'Rent payment',
          propertyAddress: payment?.property_address,
        },
      })

      if (init.type === 'DVA') {
        setDvaConfig({
          accountNumber: init.dva.accountNumber,
          accountName: init.dva.accountName,
          bankName: init.dva.bankName,
          reference: init.reference,
        })
        setActiveReference(init.reference)
        setStep('checkout')
        setProcessing(false)
        return
      }

      const accessCode = init.accessCode
      const reference = init.reference
      setActiveReference(reference)
      const url = `https://checkout.paystack.com/${accessCode}`
      await WebBrowser.openBrowserAsync(url)
      const verified = await pollVerify(reference)
      if (!verified) {
        setError(
          'Payment not confirmed yet. If you completed checkout, tap “I’ve paid” to check again.',
        )
        setStep('checkout')
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setStep('error')
    } finally {
      setProcessing(false)
    }
  }, [paymentUuid, parsedAmount, finalLineItemPayments, payment, pollVerify])

  const retryVerify = useCallback(async () => {
    if (!activeReference) return
    setProcessing(true)
    try {
      const ok = await pollVerify(activeReference)
      if (!ok) setError('Payment not detected yet. Bank transfers can take a few minutes.')
    } finally {
      setProcessing(false)
    }
  }, [activeReference, pollVerify])

  const activationInviteToken = paymentRequest?.inviteToken ?? paymentRequest?.user?.uuid ?? null

  return {
    step,
    loading: query.isLoading || processing,
    error,
    payment,
    paymentRequest,
    activationInviteToken,
    userEmail,
    lineItems,
    allocations,
    totalOwed,
    amountInput,
    setAmountInput,
    benefitsOptIn,
    setBenefitsOptIn,
    benefitsAvailable: rates.benefitsFee > 0 && !rates.benefitsPaid,
    dvaConfig,
    startCheckout,
    retryVerify,
    refetch: query.refetch,
    successAmount,
  }
}
