'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FallbackSuspense from '@/components/FallbackSuspense'
import { persistSignupVoucherCode } from '@/lib/voucher-code'

const DEFAULT_SIGNUP_VOUCHER_CODE = 'HOME_REFRESH_1K'

function SignupVoucherRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const requestedCode =
      searchParams.get('code') ||
      searchParams.get('voucher') ||
      searchParams.get('v') ||
      DEFAULT_SIGNUP_VOUCHER_CODE

    const savedCode = persistSignupVoucherCode(requestedCode) || DEFAULT_SIGNUP_VOUCHER_CODE

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('code')
    nextParams.delete('v')
    nextParams.set('voucher', savedCode)

    router.replace(`/signup?${nextParams.toString()}`)
  }, [router, searchParams])

  return <FallbackSuspense message="Unlocking your ₦1,000 Home Refresh voucher…" />
}

export default function SignupVoucherPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Unlocking your ₦1,000 Home Refresh voucher…" />}>
      <SignupVoucherRedirect />
    </Suspense>
  )
}
