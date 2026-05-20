'use client'

import React from 'react'
import { Menu, Bell } from 'lucide-react'
import Link from 'next/link'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useAuth } from '@/features/auth/AuthContext'
import { useVerificationStatus } from '@/features/pm/hooks/useVerification'
import '@/styles/mobile-header.css'

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  const { data: verification } = useVerificationStatus()

  const isPending = verification?.status === 'PENDING'

  return (
    <header className="mobile-header">
      <button className="mobile-header__menu" onClick={onMenuClick}>
        <Menu size={24} />
      </button>
      
      <div className="mobile-header__logo">
        <UpwardLogo size={32} />
        <span className="mobile-header__brand">{user?.businessName || 'Property Manager'}</span>
        {user && (
          user.isVerified ? (
            <div 
             style={{ 
                 width: 8, 
                 height: 8, 
                 borderRadius: '50%', 
                 background: '#10b981', 
                 marginLeft: 6, 
                 border: '2px solid white' 
             }} 
             title="Verified"
            />
          ) : (
            <Link 
             href="/settings"
             className=""
             style={{ 
                 width: 8, 
                 height: 8, 
                 borderRadius: '50%', 
                 background: isPending ? '#3b82f6' : '#ef4444', 
                 marginLeft: 6, 
                 border: '2px solid white' 
             }} 
             title={isPending ? "Verification Pending" : "Unverified"} 
            />
          )
        )}
      </div>

      <button className="mobile-header__notif">
        <Bell size={20} />
      </button>
    </header>
  )
}
