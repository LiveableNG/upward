'use client'

import React, { Suspense, useRef, useState, useEffect } from 'react'
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

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'profile'


  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/settings?${params.toString()}`)
  }

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
  }, [isMobile, activeTab])

  return (
    <div className="settings animate-fade-in">
      <header className="settings__header">
        <h1 className="settings__title">Settings</h1>
        <p className="settings__subtitle">Manage your account, payment details and security.</p>
      </header>

      <div style={{ position: 'relative', width: '100%' }}>
        <nav 
          className="settings__nav"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
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
        <button 
          className={cn('settings__nav-item', activeTab === 'email' && 'settings__nav-item--active')}
          onClick={() => setTab('email')}
        >
          Email
        </button>
        <button 
          className={cn('settings__nav-item', activeTab === 'feedback' && 'settings__nav-item--active')}
          onClick={() => setTab('feedback')}
        >
          Feedback
        </button>
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

        {activeTab === 'payment' && <BankInfoForm />}
        {activeTab === 'security' && <SecurityForm />}
        {activeTab === 'import' && <DataImportTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'email' && <EmailSettingsTab />}
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
