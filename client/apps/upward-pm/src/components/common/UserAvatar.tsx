'use client'

import React, { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UpwardLogo } from './UpwardLogo'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  fallback?: React.ReactNode
  initials?: string
  rounded?: boolean
}

export function UserAvatar({ src, alt, size = 40, className, fallback, initials, rounded = true }: UserAvatarProps) {
  const [error, setError] = useState(false)

  const resolveUrl = (url: string | null | undefined) => {
    if (!url || url === 'null' || url === 'undefined' || url === '') return null
    if (url.startsWith('http')) return url
    return `http://localhost:4000/${url.startsWith('/') ? url.slice(1) : url}`
  }

  const finalSrc = resolveUrl(src)
  const hasImage = finalSrc && !error

  return (
    <div 
      className={cn('user-avatar', className)}
      style={{ 
        width: size, 
        height: size, 
        borderRadius: rounded ? '50%' : 'var(--radius-md)', 
        overflow: 'hidden', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ivory-dim)',
        border: '1px solid var(--border)',
        flexShrink: 0
      }}
    >
      {hasImage ? (
        <img
          src={finalSrc!}
          alt={alt || 'User Profile'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setError(true)}
        />
      ) : (
        <UpwardLogo size={size * 0.55} color = 'var(--forest)' />
      )}
    </div>
  )
}
