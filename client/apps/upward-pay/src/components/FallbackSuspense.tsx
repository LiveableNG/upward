'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface FallbackSuspenseProps {
  message?: string
}

export default function FallbackSuspense({ message }: FallbackSuspenseProps) {
  return (
    <div className="fallback-suspense" aria-busy="true" aria-label={message || 'Loading'}>
      <div className="fallback-suspense__content">
        <Loader2 size={32} className="animate-spin fallback-suspense__spinner" />
        {message ? <p className="fallback-suspense__text">{message}</p> : null}
      </div>
    </div>
  )
}
