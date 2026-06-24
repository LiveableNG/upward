'use client'

import { Suspense } from 'react'
import { SetupDraftProvider } from '@/features/dashboard/setup/SetupDraftContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import '@/styles/setup-page.css'

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading setup..." />}>
      <SetupDraftProvider>{children}</SetupDraftProvider>
    </Suspense>
  )
}
