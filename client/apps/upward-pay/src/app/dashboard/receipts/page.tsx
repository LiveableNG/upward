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

        const rentStartDate = tx.paymentRequest?.rentStartDate
        const rentEndDate = tx.paymentRequest?.rentEndDate
        const tenancyPeriod = (rentStartDate && rentEndDate)
          ? `${new Date(rentStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(rentEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : undefined

        // Map backend Transaction to frontend ReceiptData
        const data: ReceiptData = {
          uuid: tx.uuid,
          title: title,
          receiptNumber: tx.receiptNumber || `RCP-${tx.reference.slice(-5).toUpperCase()}`,
          paidAt: tx.createdAt,
          generatedAt: new Date().toISOString(),
          tenantName: profile ? `${profile.firstName} ${profile.lastName}` : 'Tenant',
          companyName: (landlord?.accountName && landlord.accountName !== 'account_name') ? landlord.accountName : (landlord?.name || tx.paymentRequest?.companyName || tx.paymentRequest?.managerName || tx.paymentRequest?.subaccount?.businessName || tx.narration),
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
          tenancyPeriod,
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
      } else {
        await generateClientSidePdf('download')
      }
    } catch (e) {
      console.error('Download failed:', e)
      await generateClientSidePdf('download')
    }
  }

  async function generateClientSidePdf(action: 'download' | 'share') {
    if (!receipt) return
    const element = document.getElementById('receipt-printable')
    if (!element) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      const filename = `receipt-${receipt.receiptNumber}.pdf`

      if (action === 'download') {
        pdf.save(filename)
      } else {
        const pdfBlob = pdf.output('blob')
        await shareFile(pdfBlob, filename)
      }
    } catch (err) {
      console.error('Client-side PDF generation failed:', err)
    }
  }

  async function shareFile(blob: Blob, filename: string) {
    if (!receipt) return

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const { Share } = await import('@capacitor/share')

        // Convert Blob to Base64 for Capacitor Filesystem
        const reader = new FileReader()
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string
            if (result) {
              resolve(result.split(',')[1]) // Extract pure base64
            } else {
              reject(new Error('Failed to convert blob to base64'))
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        // Save to temporary cache for sharing
        const fileName = `receipt-${receipt.receiptNumber.replace(/\//g, '-')}.pdf`
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        })

        // Trigger native share sheet
        await Share.share({
          title: `Receipt ${receipt.receiptNumber}`,
          text: `Your payment receipt from Upward for ${receipt.amount.toLocaleString()} ${receipt.currency}`,
          url: writeResult.uri,
        })
        
        return
      } catch (err) {
        console.error('Native sharing failed, falling back to web share:', err)
      }
    }

    // Standard Web Share API / Download Fallback
    try {
      const file = new File([blob], filename, { type: 'application/pdf' })
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt ${receipt.receiptNumber}`,
          text: `Here is my payment receipt for ${receipt.amount.toLocaleString()} ${receipt.currency}`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        performFileDownload(url, filename)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (err) {
      console.error('Sharing failed:', err)
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
      tenancyPeriod: data.tenancyPeriod,
    }
  }

  function performFileDownload(url: string, filename: string) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleShare() {
    if (!receipt) return
    try {
      const res = await api.getReceiptPdf(getReceiptPayload(receipt))

      if (res?.url) {
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
          // Use our authenticated api.getBlob instead of raw fetch
          blob = await api.getBlob(res.url)
        }

        const filename = `receipt-${receipt.receiptNumber}.pdf`
        await shareFile(blob, filename)
      } else {
        await generateClientSidePdf('share')
      }
    } catch (e) {
      console.error('Share failed:', e)
      // Fallback to client-side generation
      await generateClientSidePdf('share')
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
      onDownload={Capacitor.isNativePlatform() ? undefined : handleDownload}
      onShare={handleShare}
    />
  )
}
