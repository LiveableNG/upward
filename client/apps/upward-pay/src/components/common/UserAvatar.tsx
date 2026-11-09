'use client'

import React, { useState } from 'react'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  color?: string
}

function getInitials(name?: string): string {
  if (!name?.trim()) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
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

  const initials = getInitials(alt)
  const fontSize = Math.max(11, Math.round(size * 0.36))

  return (
    <div
      className={`user-avatar user-avatar--initials ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'var(--shell-tint, #fbede5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color || 'var(--clay)',
        flexShrink: 0,
        border: '1px solid var(--border-solid, #e5dbcf)',
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}
      aria-label={alt || 'User avatar'}
    >
      {initials}
    </div>
  )
}
