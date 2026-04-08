'use client'

import React, { useState } from 'react'
import { UpwardLogo } from '@/components/PoweredByUpward'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  color?: string
}

export function UserAvatar({ src, alt, color, size = 40, className = '' }: UserAvatarProps) {
  const [error, setError] = useState(false)

  const hasImage = src && src.trim() !== '' && !error

  if (hasImage) {
    return (
      <div
        className={`user-avatar ${className}`}
        style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
      >
        <img
          src={src as string}
          alt={alt || 'User Profile'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setError(true)}
        />
      </div>
    )
  }

  // Default brand avatar
  return (
    <div
      className={`user-avatar user-avatar--brand ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'var(--surface2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0,
        border: '1px solid var(--border-solid)'
      }}
    >
      <UpwardLogo size={size * 0.55} color={color || 'var(--clay)'} />
    </div>
  )
}
