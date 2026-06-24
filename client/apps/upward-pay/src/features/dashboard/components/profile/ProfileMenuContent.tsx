'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { type UserProfile, type ContractData } from '../../types'

import { ProfileMenuView } from './ProfileMenuView'
import { ProfileMenuSkeleton } from './ProfileMenuSkeleton'
import { ProfilePageShell } from './ProfilePageShell'
import { PersonalDetailsView } from './PersonalDetailsView'
import { BankingPayoutsView } from './BankingPayoutsView'

type ViewMode = 'menu' | 'personal' | 'banking'

export function ProfileMenuContent() {
  return (
    <Suspense fallback={<ProfileMenuSkeleton />}>
      <ProfileMenuContentInner />
    </Suspense>
  )
}

function ProfileMenuContentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout, user, refreshUser } = useAuth()

  const initialView = searchParams.get('view')
  const [view, setView] = useState<ViewMode>(
    initialView === 'personal' ? 'personal' : initialView === 'banking' ? 'banking' : 'menu',
  )
  const startInEditMode = searchParams.get('edit') === 'true'
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

  if (!profile) return <ProfileMenuSkeleton />

  if (view === 'personal') {
    return (
      <PersonalDetailsView
        user={profile}
        refreshUser={refreshUser}
        onBack={() => setView('menu')}
        initialEditing={startInEditMode}
      />
    )
  }

  if (view === 'banking') {
    return (
      <BankingPayoutsView
        onBack={() => setView('menu')}
        initialEditing={startInEditMode}
      />
    )
  }

  return (
    <ProfilePageShell
      title="Profile"
      subtitle="Manage your account and settings"
      onSettings={() => router.push('/dashboard/settings')}
    >
      <ProfileMenuView
        profile={profile}
        contracts={contracts}
        refreshUser={refreshUser}
        logout={logout}
        onNavigate={(v) => setView(v)}
      />
    </ProfilePageShell>
  )
}
