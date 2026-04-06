'use client'

import React from 'react'
import { UpwardLogo } from '@/components/PoweredByUpward'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  color?: string
}

export function UserAvatar({ src, alt, color, size = 40, className = '' }: UserAvatarProps) {
  if (src) {
    return (
      <div
        className={`user-avatar ${className}`}
        style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}
      >
        <img
          src={src}
          alt={alt || 'User Profile'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}
    >
      <UpwardLogo size={size * 0.55} className="text-white" color={color} />
    </div>
  )
}
