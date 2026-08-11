'use client'

import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react'
import { AvatarUpload } from '@/features/pm/components/settings/AvatarUpload'
import { ProfileForm } from '@/features/pm/components/settings/ProfileForm'
import { BankInfoForm } from '@/features/pm/components/settings/BankInfoForm'
import { SecurityForm } from '@/features/pm/components/settings/SecurityForm'
import { DataImportTab } from '@/features/pm/components/settings/DataImportTab'
import { TeamTab } from '@/features/pm/components/settings/TeamTab'
import { BrandingTab } from '@/features/pm/components/settings/BrandingTab'
import { FeedbackTab } from '@/features/pm/components/settings/FeedbackTab'
import { EmailSettingsTab } from '@/features/pm/components/settings/EmailSettingsTab'
import { ListSkeleton } from '@/components/skeletons'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

const MEMBER_TABS = new Set(['profile', 'security', 'feedback'])
const COMPANY_TABS = new Set(['payment', 'import', 'team', 'branding', 'email'])

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const canManageCompanySettings = user?.canManageCompanySettings !== false
  const requestedTab = searchParams.get('tab') || 'profile'
  const activeTab = useMemo(() => {
    if (canManageCompanySettings) return requestedTab
    return MEMBER_TABS.has(requestedTab) ? requestedTab : 'profile'
  }, [canManageCompanySettings, requestedTab])

  const setTab = (tab: string) => {
    if (!canManageCompanySettings && COMPANY_TABS.has(tab)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/settings?${params.toString()}`)
  }

  useEffect(() => {
    if (!canManageCompanySettings && COMPANY_TABS.has(requestedTab)) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'profile')
      router.replace(`/settings?${params.toString()}`)
    }
  }, [canManageCompanySettings, requestedTab, router, searchParams])

  const scrollContainerRef = useRef<HTMLElement>(null)
  const [scrollState, setScrollState] = useState<'start' | 'middle' | 'end'>('start')
  const [isMobile, setIsMobile] = useState(false)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    
    setCanScroll(scrollWidth > clientWidth)

    if (scrollLeft <= 5) {
      setScrollState('start')
    } else if (Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 5) {
      setScrollState('end')
    } else {
      setScrollState('middle')
    }
  }

  useEffect(() => {
    handleScroll()
    const timeout = setTimeout(handleScroll, 100)
    return () => clearTimeout(timeout)
  }, [isMobile, activeTab, canManageCompanySettings])

  const tabs = [
    { id: 'profile', label: 'Profile' },
    ...(canManageCompanySettings ? [{ id: 'payment', label: 'Payment' }] : []),
    { id: 'security', label: 'Security' },
    ...(canManageCompanySettings
      ? [
          { id: 'import', label: 'Bulk Import' },
          { id: 'team', label: 'Team' },
          { id: 'branding', label: 'Branding' },
          { id: 'email', label: 'Email' },
        ]
      : []),
    { id: 'feedback', label: 'Feedback' },
  ]

  return (
    <div className="settings animate-fade-in">
      <header className="settings__header">
        <h1 className="settings__title">Settings</h1>
        <p className="settings__subtitle">
          {canManageCompanySettings
            ? 'Manage your account, payment details and security.'
            : 'Manage your personal profile and security.'}
        </p>
      </header>

      <div style={{ position: 'relative', width: '100%' }}>
        <nav 
          className="settings__nav"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn('settings__nav-item', activeTab === tab.id && 'settings__nav-item--active')}
              onClick={() => setTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {isMobile && canScroll && scrollState !== 'end' && (
          <div className="scroll-hint-icon scroll-hint-right" onClick={() => scrollContainerRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}>
            <ChevronRight size={18} />
          </div>
        )}
        
        {isMobile && canScroll && scrollState === 'end' && (
          <div className="scroll-hint-icon scroll-hint-left" onClick={() => scrollContainerRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}>
            <ChevronLeft size={18} />
          </div>
        )}
      </div>

      <div className="settings__content">
        {activeTab === 'profile' && (
          <>
            <AvatarUpload />
            <ProfileForm />
          </>
        )}

        {canManageCompanySettings && activeTab === 'payment' && <BankInfoForm />}
        {activeTab === 'security' && <SecurityForm />}
        {canManageCompanySettings && activeTab === 'import' && <DataImportTab />}
        {canManageCompanySettings && activeTab === 'team' && <TeamTab />}
        {canManageCompanySettings && activeTab === 'branding' && <BrandingTab />}
        {canManageCompanySettings && activeTab === 'email' && <EmailSettingsTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <SettingsContent />
    </Suspense>
  )
}
