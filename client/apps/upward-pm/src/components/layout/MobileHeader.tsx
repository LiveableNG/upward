'use client'

import React from 'react'
import { Menu, Bell } from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useAuth } from '@/features/auth/AuthContext'
import '@/styles/mobile-header.css'

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  
  return (
    <header className="mobile-header">
      <button className="mobile-header__menu" onClick={onMenuClick}>
        <Menu size={24} />
      </button>
      
      <div className="mobile-header__logo">
        <UpwardLogo size={32} />
        <span className="mobile-header__brand">{user?.businessName || 'Property Manager'}</span>
      </div>

      <button className="mobile-header__notif">
        <Bell size={20} />
      </button>
    </header>
  )
}
