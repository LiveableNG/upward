'use client'

import React, { Suspense } from 'react'
import { AvatarUpload } from '@/features/pm/components/settings/AvatarUpload'
import { ProfileForm } from '@/features/pm/components/settings/ProfileForm'
import { BankInfoForm } from '@/features/pm/components/settings/BankInfoForm'
import { SecurityForm } from '@/features/pm/components/settings/SecurityForm'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'profile'

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/settings?${params.toString()}`)
  }

  return (
    <div className="settings animate-fade-in">
      <header className="settings__header">
        <h1 className="settings__title">Settings</h1>
        <p className="settings__subtitle">Manage your account, payment details and security.</p>
      </header>

      <nav className="settings__nav">
        <button 
          className={cn('settings__nav-item', activeTab === 'profile' && 'settings__nav-item--active')}
          onClick={() => setTab('profile')}
        >
          Profile
        </button>
        <button 
          className={cn('settings__nav-item', activeTab === 'payment' && 'settings__nav-item--active')}
          onClick={() => setTab('payment')}
        >
          Payment
        </button>
        <button 
          className={cn('settings__nav-item', activeTab === 'security' && 'settings__nav-item--active')}
          onClick={() => setTab('security')}
        >
          Security
        </button>
      </nav>

      <div className="settings__content">
        {activeTab === 'profile' && (
          <>
            <AvatarUpload />
            <ProfileForm />
          </>
        )}
        {activeTab === 'payment' && <BankInfoForm />}
        {activeTab === 'security' && <SecurityForm />}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
