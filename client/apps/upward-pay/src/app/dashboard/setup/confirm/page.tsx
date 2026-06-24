'use client'

import { RentalConfirmView } from '@/features/dashboard/setup/components/RentalConfirmView'
import { useRequireRentalDraft } from '@/features/dashboard/setup/setupGuards'

export default function SetupConfirmPage() {
  useRequireRentalDraft()
  return <RentalConfirmView />
}
