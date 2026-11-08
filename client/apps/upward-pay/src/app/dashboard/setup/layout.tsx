'use client'

import { SetupDraftProvider } from '@/features/dashboard/setup/SetupDraftContext'
import '@/styles/setup-page.css'

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <SetupDraftProvider>{children}</SetupDraftProvider>
}
