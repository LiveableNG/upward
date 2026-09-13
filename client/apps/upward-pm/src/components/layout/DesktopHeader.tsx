'use client'

import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { LogOut, Bell, Wallet as WalletIcon, ShieldCheck, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useVerificationStatus } from '@/features/pm/hooks/useVerification'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AlertCircle, Calendar, Sparkles, Check, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationsMenu } from '@/components/common/NotificationsMenu'
import { useSubscription } from '@/features/pm/hooks/useSubscription'

export function DesktopHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { data: verification } = useVerificationStatus()
  const { wallet } = useSubscription()
  const pathname = usePathname()

  if (!user) return null
  if (pathname !== '/dashboard') return null

  const isPending = verification?.status === 'PENDING'
  const isEmployee = user.accountType === 'PM_EMPLOYEE'

  return (
    <header className="desktop-header">
      <div className="desktop-header__search">
        {/* Optional Search Bar can go here later */}
      </div>

      <div className="desktop-header__actions">
        {/* Notification Bell */}
        <NotificationsMenu />

        <div className="desktop-header__profile">
          {/* Role Badge: ADMIN vs EMPLOYEE */}
          {isEmployee ? (
            <div className="role-tag role-tag--employee" title={`Employee at ${user.employer?.companyName || 'Property Team'}`}>
              <UserCheck size={11} />
              <span>EMPLOYEE</span>
            </div>
          ) : (
            <div className="role-tag role-tag--admin" title="Account Owner / Admin">
              <ShieldCheck size={11} />
              <span>ADMIN</span>
            </div>
          )}

          {/* Verification Badge (Only for Owner/Admin PMs, or active employee status) */}
          {!isEmployee && (
            user.isVerified ? (
              <div 
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: 20, 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: '#10b981', 
                  fontSize: 11, 
                  fontWeight: 700,
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
                prefetch={false}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: 20, 
                  background: isPending ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  color: isPending ? '#3b82f6' : '#ef4444', 
                  fontSize: 11, 
                  fontWeight: 700,
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
            )
          )}

          <div className="desktop-header__user-info">
            <span className="desktop-header__name">{user.firstName} {user.lastName}</span>
            <span className="desktop-header__role">
              {isEmployee
                ? `${user.jobTitle || 'Staff'} • ${user.employer?.companyName || 'Property Team'}`
                : (user.businessName || 'Property Manager')}
            </span>
          </div>
          
          <Link href="/settings" prefetch={false} className="desktop-header__avatar">
            <UserAvatar 
              src={user.profilePic} 
              alt="Avatar" 
              size={40} 
              initials={`${user.firstName[0] || 'P'}${user.lastName[0] || 'M'}`}
            />
          </Link>
        </div>
      </div>
    </header>
  )
}
