'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/common/PageHeader'
import { type UserProfile, type ContractData } from '../../types'

import { ProfileMenuView } from './ProfileMenuView'
import { PersonalDetailsView } from './PersonalDetailsView'
import { BankingPayoutsView } from './BankingPayoutsView'

type ViewMode = 'menu' | 'personal' | 'banking'

export function ProfileMenuContent() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10">Loading...</div>}>
      <ProfileMenuContentInner />
    </Suspense>
  )
}

function ProfileMenuContentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout, user, refreshUser } = useAuth()
  
  const [view, setView] = useState<ViewMode>(
    searchParams.get('view') === 'personal' ? 'personal' : 'menu'
  )
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [contracts, setContracts] = useState<ContractData[]>([])

  useEffect(() => {
    if (user) {
      setProfile(user)
      loadDocuments()
    }
  }, [user])

  async function loadDocuments() {
    try {
      const data = await api.getContracts()
      setContracts(data || [])
    } catch (err) {
      console.error('Failed to load documents', err)
    }
  }

  if (!profile) return null

  if (view === 'personal') {
    return (
      <PersonalDetailsView 
        user={profile} 
        refreshUser={refreshUser} 
        onBack={() => setView('menu')} 
      />
    )
  }

  if (view === 'banking') {
    return (
      <BankingPayoutsView 
        onBack={() => setView('menu')} 
      />
    )
  }

  return (
    <div className="profile-menu-page dashboard--nav-offset">
      <PageHeader 
        title="Profile" 
        showBack 
        backPath="/dashboard" 
        showSettings={true}
      />
      <div className="profile-content-scroll">
        <ProfileMenuView 
          profile={profile}
          contracts={contracts}
          refreshUser={refreshUser}
          logout={logout}
          onNavigate={(v) => setView(v)}
        />
      </div>

      <style jsx>{`
        .profile-menu-page {
          padding-bottom: 4rem;
        }

        .profile-content-scroll {
          padding: 0 0 10rem;
        }

        @media (min-width: 1024px) {
          .profile-menu-page {
            max-width: 860px;
            margin: 0 auto;
            padding-top: 2rem;
          }
          .profile-content-scroll {
            padding: 3rem 2rem 10rem;
          }
        }
      `}</style>
    </div>
  )
}
