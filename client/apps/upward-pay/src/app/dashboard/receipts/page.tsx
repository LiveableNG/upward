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
        const landlord = tx.landlordId
          ? landlords.find((l: any) => l.uuid === tx.landlordId || String(l.id) === tx.landlordId)
          : null

        const isFutureCredit = tx.transactionType === 'FUTURE_CREDIT'
        const title = isFutureCredit 
          ? 'Future Credit Receipt' 
          : (tx.type === 'RENT' ? 'Rent Payment Receipt' : 'Savings Deposit Receipt')

        const breakdownDesc =
          tx.lineItems && tx.lineItems.length > 0
            ? `${tx.lineItems.map((item: any) => `${item.label} (N${item.amount.toLocaleString()})`).join(', ')}`
            : tx.type === 'RENT'
              ? landlord?.name
                ? `Unit at ${landlord.name}`
                : 'Property Unit'
              : 'Upward Wallet'

        const propInfo = tx.property || landlord?.properties?.[0]
        const propertyAddress = tx.propertyAddress || propInfo?.locationAddress || propInfo?.address || tx.paymentRequest?.propertyLocation || profile?.address || ''

        // Map backend Transaction to frontend ReceiptData
        const data: ReceiptData = {
          uuid: tx.uuid,
          title: title,
          receiptNumber: tx.receiptNumber || `RCP-${tx.reference.slice(-5).toUpperCase()}`,
          paidAt: tx.createdAt,
          generatedAt: new Date().toISOString(),
          tenantName: profile ? `${profile.firstName} ${profile.lastName}` : 'Tenant',
          companyName: (landlord?.accountName && landlord.accountName !== 'account_name') ? landlord.accountName : (landlord?.name || tx.paymentRequest?.companyName || tx.paymentRequest?.managerName || tx.narration),
          companyLogo: '',
          paymentType: tx.paymentType || 'Rent Payment',
          propertyAddress: propertyAddress,
          amount: tx.amount,
          currency: tx.currency || 'NGN',
          channel: 'Paystack',
          paystackReference: tx.reference,
          type: 'debit',
          status: tx.paymentRequest?.status || (tx.status === 'SUCCESS' ? 'PAID' : 'PENDING'), // PARTIAL, PAID, etc.
          lineItems:
            tx.lineItems && tx.lineItems.length > 0
              ? tx.lineItems.map((item: any) => ({
                  label: item.label || item.name,
                  amount: item.amount,
                  category: item.category || 'Package',
                }))
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
        status: receipt.status,
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

  async function handleShare() {
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
        status: receipt.status,
        lineItems: receipt.lineItems,
      })

      if (res?.url) {
        // Convert data URL or fetch URL to Blob
        let blob: Blob
        if (res.url.startsWith('data:')) {
          const arr = res.url.split(',')
          const mime = arr[0].match(/:(.*?);/)?.[1]
          const bstr = atob(arr[1])
          let n = bstr.length
          const u8arr = new Uint8Array(n)
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
          }
          blob = new Blob([u8arr], { type: mime })
        } else {
          const response = await fetch(res.url)
          blob = await response.blob()
        }

        const file = new File([blob], `receipt-${receipt.receiptNumber}.pdf`, { type: 'application/pdf' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Receipt ${receipt.receiptNumber}`,
            text: `Here is my payment receipt for ${receipt.amount.toLocaleString()} ${receipt.currency}`,
          })
        } else {
          // Fallback if sharing files is not supported
          handleDownload()
        }
      }
    } catch (e) {
      console.error('Share failed:', e)
      handleDownload()
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
      onShare={handleShare}
    />
  )
}
