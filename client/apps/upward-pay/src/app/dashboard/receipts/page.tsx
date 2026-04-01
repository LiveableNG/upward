'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ReceiptData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import ReceiptTemplate from '@/components/payment/ReceiptTemplate'
import { Receipt, ArrowLeft, ChevronRight } from 'lucide-react'

export default function ReceiptsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard/receipts')
      return
    }
    loadReceipt()
  }, [router])

  async function loadReceipt() {
    const searchParams = new URLSearchParams(window.location.search)
    const id = searchParams.get('id')
    
    // MOCK RECEIPT FOR DESIGN PHASE
    const mockReceipt: ReceiptData = {
      uuid: 'mock-id',
      title: 'Monthly Rent Receipt',
      receiptNumber: 'RCP-89240',
      paidAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      tenantName: 'John Doe',
      companyName: 'Livable Properties',
      companyLogo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40&q=80',
      propertyName: 'Luxury Suite 402',
      propertyAddress: '12-14 Kingsway Road, Ikoyi, Lagos',
      amount: 450000,
      currency: 'NGN',
      channel: 'Credit Card',
      paystackReference: 'T74291085141',
      lineItems: [
        { label: 'Annual Rent (2025/2026)', amount: 400000, category: 'Rent' },
        { label: 'Service Charge', amount: 50000, category: 'Service' }
      ]
    }

    if (!id) {
      setReceipt(mockReceipt)
      setLoading(false)
      return
    }

    if (id === 'mock-credit-1' || id === 'mock-credit-2') {
      setReceipt({
        ...mockReceipt,
        uuid: id,
        title: 'Rent Savings Deposit',
        receiptNumber: id === 'mock-credit-1' ? 'RSV-001' : 'RSV-002',
        amount: id === 'mock-credit-1' ? 5000000 : 2500000,
        companyName: 'Upward Savings',
        propertyName: 'Rent Savings Wallet',
        propertyAddress: 'Lagos, Nigeria',
        paystackReference: id === 'mock-credit-1' ? 'RSV-7SH92KL' : 'RSV-6XJ21PL',
        channel: id === 'mock-credit-1' ? 'Auto-Deduction' : 'Manual Deposit',
        lineItems: [],
        type: 'credit'
      })
      setLoading(false)
      return
    }

    try {
      const data = await api.getMyDocuments()
      const found = data.receipts.find((r: ReceiptData) => r.uuid === id)
      if (found) {
        setReceipt(found)
      } else {
        // Fallback to mock for design phase
        setReceipt(mockReceipt)
      }
    } catch {
      setReceipt(mockReceipt)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return null
  }

  return (
    <ReceiptTemplate 
      receipt={receipt} 
      onClose={() => router.push('/dashboard/transactions')} 
    />
  )
}
