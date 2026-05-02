import { Suspense } from 'react'
import InviteClient from './InviteClient'
import FallbackSuspense from '@/components/FallbackSuspense'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default function InvitePage() {
  return (
    <Suspense fallback={<FallbackSuspense />}>
      <InviteClient />
    </Suspense>
  )
}