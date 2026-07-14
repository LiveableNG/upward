import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { DashboardView } from '@/features/pm/components/dashboard/DashboardView'
import { DashboardSkeleton } from '@/components/skeletons'
import { cookies } from 'next/headers'

export const metadata: Metadata = {
  title: 'Dashboard',
}

async function getDashboardData() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pm_access_token')?.value || cookieStore.get('access_token')?.value
    
    if (!token) return undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    const res = await fetch(`${apiUrl}/pm/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      next: { revalidate: 60 }
    })
    
    if (!res.ok) return undefined
    return res.json()
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error)
    return undefined
  }
}

export default async function Dashboard() {
  const initialData = await getDashboardData()

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView initialData={initialData} />
    </Suspense>
  )
}
