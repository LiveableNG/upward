/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import FallbackSuspense from '@/components/FallbackSuspense'
import ReceiptTemplate, {
  type ReceiptData,
} from '@/features/dashboard/components/payment/ReceiptTemplate'

export default function ReceiptsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => {
    loadReceipt()
  }, [])

  async function loadReceipt() {
    const searchParams = new URLSearchParams(window.location.search)
    const id = searchParams.get('id')

    if (!id) {
      setLoading(false)
      return
    }

    try {
      const [tx, profile, landlords] = await Promise.all([
        api.getTransaction(id),
        api.getProfile(),
        api.getSavedLandlords().catch(() => []),
      ])

      if (tx) {
        const landlord = tx.landlordId ? landlords.find((l: any) => l.id === tx.landlordId) : null

        const breakdownDesc =
          tx.lineItems && tx.lineItems.length > 0
            ? `${tx.lineItems.map((item: any) => `${item.label} (N${item.amount.toLocaleString()})`).join(', ')}`
            : tx.type === 'RENT'
              ? landlord?.name
                ? `Unit at ${landlord.name}`
                : 'Property Unit'
              : 'Upward Wallet'

        // Map backend Transaction to frontend ReceiptData
        const data: ReceiptData = {
          uuid: tx.id,
          title: tx.type === 'RENT' ? 'Rent Payment Receipt' : 'Savings Deposit Receipt',
          receiptNumber: tx.receiptNumber || `RCP-${tx.reference.slice(-5).toUpperCase()}`,
          paidAt: tx.createdAt,
          generatedAt: new Date().toISOString(),
          tenantName: profile?.fullName || 'Tenant',
          companyName:
            landlord?.name || (tx.type === 'RENT' ? 'Property Management' : 'Upward Savings'),
          companyLogo: landlord?.bankName ? '' : '', // Could use landlord logic here if they had logos
          paymentType: tx.paymentType || breakdownDesc,
          propertyAddress: tx.propertyAddress || tx.narration || profile?.address || 'Payment via Upward',
          amount: tx.amount,
          currency: 'NGN',
          channel: 'Paystack',
          paystackReference: tx.reference,
          type: tx.type === 'SAVINGS' ? 'credit' : 'debit',
          lineItems:
            tx.lineItems && tx.lineItems.length > 0
              ? tx.lineItems.map((item: any) => ({
                  label: item.label,
                  amount: item.amount,
                  category: item.category || 'Package',
                }))
              : tx.type === 'RENT'
                ? [{ label: 'Rent Payment', amount: tx.amount, category: 'Home' }]
                : [],
        }
        setReceipt(data)
      }
    } catch (e) {
      console.error('Failed to load receipt:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!receipt) return
    try {
      const res = await api.getReceiptPdf({
        title: receipt.title,
        receiptNumber: receipt.receiptNumber,
        paidAt: receipt.paidAt,
        tenantName: receipt.tenantName,
        landlordName: receipt.companyName,
        paymentType: receipt.paymentType,
        propertyAddress: receipt.propertyAddress,
        amount: receipt.amount,
        currency: receipt.currency,
        reference: receipt.paystackReference,
        channel: receipt.channel,
        type: receipt.type === 'credit' ? 'SAVINGS' : 'RENT',
        lineItems: receipt.lineItems,
      })
      if (res?.url) {
        if (res.url.startsWith('data:')) {
          const link = document.createElement('a')
          link.href = res.url
          link.download = `receipt-${receipt.receiptNumber}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else {
          window.open(res.url, '_blank')
        }
      }
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  if (loading) {
    return <FallbackSuspense message="Loading receipt details..." />
  }

  if (!receipt) {
    return null
  }

  return (
    <ReceiptTemplate
      receipt={receipt}
      onClose={() => router.push('/dashboard/transactions')}
      onDownload={handleDownload}
    />
  )
}
