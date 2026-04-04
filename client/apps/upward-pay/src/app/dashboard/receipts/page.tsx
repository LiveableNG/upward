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

    // MOCK RECEIPT FOR DESIGN PHASE OR IF API FAILS
    const mockReceipt: ReceiptData = {
      uuid: 'mock-id',
      title: 'Monthly Rent Receipt',
      receiptNumber: 'RCP-89240',
      paidAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      tenantName: 'John Doe',
      companyName: 'Livable Properties',
      companyLogo:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40&q=80',
      propertyName: 'Luxury Suite 402',
      propertyAddress: '12-14 Kingsway Road, Ikoyi, Lagos',
      amount: 450000,
      currency: 'NGN',
      channel: 'Credit Card',
      paystackReference: 'T74291085141',
      lineItems: [
        { label: 'Annual Rent (2025/2026)', amount: 400000, category: 'Rent' },
        { label: 'Service Charge', amount: 50000, category: 'Service' },
      ],
    }

    if (!id) {
      setReceipt(mockReceipt)
      setLoading(false)
      return
    }

    try {
      // Typically fetch from transactions endpoint in a real app, e.g. api.getTransaction(id)
      const data = await api.getMyDocuments() // Based on user provided mock code
      const found = data.receipts.find((r: ReceiptData) => r.uuid === id)
      if (found) {
        setReceipt(found)
      } else {
        setReceipt(mockReceipt)
      }
    } catch {
      setReceipt(mockReceipt)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FallbackSuspense message="Loading receipt details..." />
  }

  if (!receipt) {
    return null
  }

  return (
    <ReceiptTemplate receipt={receipt} onClose={() => router.push('/dashboard/transactions')} />
  )
}
