'use client'

import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { LogOut, Bell } from 'lucide-react'
import Link from 'next/link'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useVerificationStatus } from '@/features/pm/hooks/useVerification'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Calendar, Sparkles, Check, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationsMenu } from '@/components/common/NotificationsMenu'

export function DesktopHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { data: verification } = useVerificationStatus()

  if (!user) return null

  const isPending = verification?.status === 'PENDING'


  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const past = new Date(dateStr)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_COMPLETED':
        return <CheckCircle2 size={16} className="notif-icon--success" />
      case 'PAYMENT_OVERDUE':
        return <AlertCircle size={16} className="notif-icon--error" />
      case 'PAYMENT_DUE':
      case 'PAYMENT_PROOF':
        return <Calendar size={16} className="notif-icon--warning" />
      default:
        return <Sparkles size={16} className="notif-icon--system" />
    }
  }

  return (
    <header className="desktop-header">
      <div className="desktop-header__search">
        {/* Optional Search Bar can go here later */}
      </div>

      <div className="desktop-header__actions">
        
        {/* Notification Bell */}
        <NotificationsMenu />

        <div className="desktop-header__profile">
          {user.isVerified ? (
            <div 
              style={{ 
                padding: '4px 10px', 
                borderRadius: 20, 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10b981', 
                fontSize: 11, 
                fontWeight: 700,
                marginRight: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
                <div style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: '#10b981' 
                }} />
                VERIFIED
            </div>
          ) : (
            <Link 
              href="/settings"
              className=""
              style={{ 
                padding: '4px 10px', 
                borderRadius: 20, 
                background: isPending ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                color: isPending ? '#3b82f6' : '#ef4444', 
                fontSize: 11, 
                fontWeight: 700,
                marginRight: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: `1px solid ${isPending ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                cursor: 'pointer'
              }}
            >
                <div style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: isPending ? '#3b82f6' : '#ef4444' 
                }} />
                {isPending ? 'PENDING REVIEW' : 'UNVERIFIED'}
            </Link>
          )}
          <div className="desktop-header__user-info">
            <span className="desktop-header__name">{user.firstName} {user.lastName}</span>
            <span className="desktop-header__role">{user.businessName || 'Property Manager'}</span>
          </div>
          
          <Link href="/settings" className="desktop-header__avatar">
            <UserAvatar 
              src={user.profilePic} 
              alt="Avatar" 
              size={40} 
              initials={`${user.firstName[0] || 'P'}${user.lastName[0] || 'M'}`}
            />
          </Link>

          <button onClick={logout} className="desktop-header__logout" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

    </header>
  )
}
