'use client'

import React, { Suspense } from 'react'
import { AvatarUpload } from '@/features/pm/components/settings/AvatarUpload'
import { ProfileForm } from '@/features/pm/components/settings/ProfileForm'
import { BankInfoForm } from '@/features/pm/components/settings/BankInfoForm'
import { SecurityForm } from '@/features/pm/components/settings/SecurityForm'
import { DataImportTab } from '@/features/pm/components/settings/DataImportTab'
import { TeamTab } from '@/features/pm/components/settings/TeamTab'
import { BrandingTab } from '@/features/pm/components/settings/BrandingTab'
import { VerificationForm } from '@/features/pm/components/verification/VerificationForm'
import { Splash } from '@/components/common/Splash'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useVerificationStatus } from '@/features/pm/hooks/useVerification'
import { Clock, CheckCircle2 } from 'lucide-react'

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'profile'
  const { data: verification, isLoading: isVerificationLoading } = useVerificationStatus()

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
          className={cn('settings__nav-item', activeTab === 'verification' && 'settings__nav-item--active')}
          onClick={() => setTab('verification')}
        >
          Verification
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
        <button 
          className={cn('settings__nav-item', activeTab === 'import' && 'settings__nav-item--active')}
          onClick={() => setTab('import')}
        >
          Bulk Import
        </button>
        <button 
          className={cn('settings__nav-item', activeTab === 'team' && 'settings__nav-item--active')}
          onClick={() => setTab('team')}
        >
          Team
        </button>
        <button 
          className={cn('settings__nav-item', activeTab === 'branding' && 'settings__nav-item--active')}
          onClick={() => setTab('branding')}
        >
          Branding
        </button>
      </nav>

      <div className="settings__content">
        {activeTab === 'profile' && (
          <>
            <AvatarUpload />
            <ProfileForm />
          </>
        )}
        {activeTab === 'verification' && (
          <div style={{ maxWidth: 600 }}>
            {isVerificationLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Splash /></div>
            ) : (verification?.status === 'PENDING' || verification?.status === 'APPROVED') ? (
                <div className="animate-fade-in" style={{ 
                    background: 'white', 
                    padding: 40, 
                    borderRadius: 24, 
                    border: '1px solid var(--border)',
                    textAlign: 'center'
                }}>
                    <div style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: 20, 
                        background: verification.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        color: verification.status === 'APPROVED' ? 'var(--forest)' : '#3b82f6'
                    }}>
                        {verification.status === 'APPROVED' ? <CheckCircle2 size={32} /> : <Clock size={32} />}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                        {verification.status === 'APPROVED' ? 'Profile Verified' : 'Verification Pending'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                        {verification.status === 'APPROVED' 
                            ? 'Your identity has been successfully verified. Your account is now in good standing.' 
                            : 'We have received your verification details and are currently reviewing them. This usually takes 24-48 hours.'}
                    </p>
                </div>
            ) : (
                <VerificationForm />
            )}
          </div>
        )}
        {activeTab === 'payment' && <BankInfoForm />}
        {activeTab === 'security' && <SecurityForm />}
        {activeTab === 'import' && <DataImportTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'branding' && <BrandingTab />}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Splash />}>
      <SettingsContent />
    </Suspense>
  )
}
