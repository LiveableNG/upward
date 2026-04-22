/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Capacitor } from '@capacitor/core'
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
    
    // On native mobile, we prefer sharing as it's more reliable for 'saving' files
    if (Capacitor.isNativePlatform()) {
      return handleShare()
    }

    try {
      const res = await api.getReceiptPdf(getReceiptPayload(receipt))
      if (res?.url) {
        performFileDownload(res.url, `receipt-${receipt.receiptNumber}.pdf`)
      }
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  function getReceiptPayload(data: ReceiptData) {
    return {
      title: data.title,
      receiptNumber: data.receiptNumber,
      paidAt: data.paidAt,
      tenantName: data.tenantName,
      landlordName: data.companyName,
      paymentType: data.paymentType,
      propertyAddress: data.propertyAddress,
      amount: data.amount,
      currency: data.currency,
      reference: data.paystackReference,
      channel: data.channel,
      type: data.type === 'credit' ? 'SAVINGS' : 'RENT',
      status: data.status,
      lineItems: data.lineItems,
    }
  }

  function performFileDownload(url: string, filename: string) {
    if (url.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      window.open(url, '_blank')
    }
  }

  async function handleShare() {
    if (!receipt) return
    try {
      const res = await api.getReceiptPdf(getReceiptPayload(receipt))

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

        const filename = `receipt-${receipt.receiptNumber}.pdf`
        const file = new File([blob], filename, { type: 'application/pdf' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Receipt ${receipt.receiptNumber}`,
            text: `Here is my payment receipt for ${receipt.amount.toLocaleString()} ${receipt.currency}`,
          })
        } else {
          // Fallback if sharing files is not supported: attempt direct download
          performFileDownload(res.url, filename)
        }
      }
    } catch (e) {
      console.error('Share failed:', e)
      // Final attempt: try to just open the URL if we have one
      // But we don't have the URL easily here unless we store it or retry
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
