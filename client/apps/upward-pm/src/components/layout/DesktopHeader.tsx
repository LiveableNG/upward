'use client'

import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { LogOut, Bell } from 'lucide-react'
import Link from 'next/link'
import { UserAvatar } from '@/components/common/UserAvatar'

export function DesktopHeader() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <header className="desktop-header">
      <div className="desktop-header__search">
        {/* Optional Search Bar can go here later */}
      </div>

      <div className="desktop-header__actions">
        <button className="desktop-header__icon-btn">
          <Bell size={20} />
          <span className="desktop-header__badge" />
        </button>

        <div className="desktop-header__profile">
          <div className="desktop-header__user-info">
            <span className="desktop-header__name">{user.firstName} {user.lastName}</span>
            <span className="desktop-header__role">{user.businessName || 'Property Manager'}</span>
          </div>
          
          <Link href="/settings" className="desktop-header__avatar">
            <UserAvatar 
              src={user.profilePic} 
              alt="Avatar" 
              size={40} 
              initials={`${user.firstName[0]}${user.lastName[0]}`}
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
