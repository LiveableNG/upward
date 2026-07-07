'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { mergeUtmIntoUrl, readStoredUtm } from '@/lib/utm'

interface TrackedCtaLinkProps {
  href: string
  className?: string
  children: React.ReactNode
}

export function TrackedCtaLink({ href, className, children }: TrackedCtaLinkProps) {
  const targetHref = useMemo(() => {
    const utm = readStoredUtm()
    return mergeUtmIntoUrl(href, utm)
  }, [href])

  return (
    <Link href={targetHref} className={className}>
      {children}
    </Link>
  )
}
