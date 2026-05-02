import { Suspense } from 'react'
import WelcomeClient from './WelcomeClient'
import FallbackSuspense from '@/components/FallbackSuspense'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<FallbackSuspense />}>
      <WelcomeClient />
    </Suspense>
  )
}
