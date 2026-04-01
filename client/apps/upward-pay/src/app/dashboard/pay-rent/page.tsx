'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PayRentPage } from '@/components/dashboard/PayRentFlow'
import { api, type DashboardData } from '@/lib/api'

export default function PayRentRoute() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const result = await api.getMe()
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <div style={{ height: '100dvh', background: 'var(--surface)' }}>
      <PayRentPage
        onBack={() => router.push('/dashboard')}
        pendingPayments={data?.pendingPayments || []}
        savedLandlords={data?.savedLandlords || []}
        savingsBalance={data?.tenant.savingsBalance || 0}
      />
    </div>
  )
}
