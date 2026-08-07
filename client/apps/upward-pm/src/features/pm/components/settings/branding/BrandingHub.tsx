'use client'

import React, { useState } from 'react'
import { LayoutDashboard, FileText, PenTool, Settings, Mail, Globe, ChevronRight } from 'lucide-react'
import { BrandingOverview } from './BrandingOverview'
import { LetterheadManager } from './LetterheadManager'
import { SignatureManager } from './SignatureManager'
import { DocumentDefaults } from './DocumentDefaults'
import { useLetterheads, useSignatures } from './branding.hooks'
import { EmailSettingsTab } from '../EmailSettingsTab'
import { ReceiptSettingsTab } from './ReceiptSettingsTab'

type Section = 'overview' | 'sender-identity' | 'receipt-settings' | 'letterheads' | 'signatures' | 'domains' | 'defaults'

interface NavItem {
  key: Section
  label: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Brand Assets',
    items: [
      { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
      { key: 'receipt-settings', label: 'Receipt Branding', icon: <FileText size={16} /> },
      { key: 'letterheads', label: 'Letterheads', icon: <FileText size={16} /> },
      { key: 'signatures', label: 'Signatures', icon: <PenTool size={16} /> },
    ]
  },
  {
    title: 'Email',
    items: [
      { key: 'sender-identity', label: 'Sender Identity', icon: <Mail size={16} /> },
      { key: 'domains', label: 'Domains', icon: <Globe size={16} /> },
    ]
  },
  {
    title: 'Defaults',
    items: [
      { key: 'defaults', label: 'Document Defaults', icon: <Settings size={16} /> },
    ]
  }
]

const FLAT_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

export function BrandingHub() {
  const [activeSection, setActiveSection] = useState<Section>('overview')

  // Pre-fetch data at the hub level so Overview cards can show counts immediately
  const { letterheads, isLoading: lhLoading } = useLetterheads()
  const { signatures, signaturesLoading } = useSignatures()

  const activeItem = FLAT_NAV_ITEMS.find((item) => item.key === activeSection)
  const activeLabel = activeItem ? activeItem.label : ''

  return (
    <div className="branding-hub">
      {/* Sidebar (desktop) */}
      <aside className="branding-hub__sidebar">
        <nav className="branding-hub__nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="branding-hub__nav-group">
              <div className="branding-hub__nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  className={`branding-hub__nav-item ${activeSection === item.key ? 'branding-hub__nav-item--active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile pill nav */}
      <div className="branding-hub__mobile-nav">
        {FLAT_NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`branding-hub__mobile-pill ${activeSection === item.key ? 'branding-hub__mobile-pill--active' : ''}`}
            onClick={() => setActiveSection(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <main className="branding-hub__content animate-fade-in" key={activeSection}>
        {/* Breadcrumbs */}
        <div className="branding-hub__breadcrumbs">
          <span className="branding-hub__breadcrumbs-item">Settings</span>
          <span className="branding-hub__breadcrumbs-separator"><ChevronRight size={12} /></span>
          <span className="branding-hub__breadcrumbs-item">Branding</span>
          <span className="branding-hub__breadcrumbs-separator"><ChevronRight size={12} /></span>
          <span className="branding-hub__breadcrumbs-item branding-hub__breadcrumbs-item--active">{activeLabel}</span>
        </div>

        {activeSection === 'overview' && (
          <BrandingOverview
            letterheads={letterheads}
            signatures={signatures as any}
            isLoading={lhLoading}
            signaturesLoading={signaturesLoading}
            onNavigate={(section) => setActiveSection(section as Section)}
          />
        )}
        {activeSection === 'sender-identity' && <EmailSettingsTab mode="sender" />}
        {activeSection === 'domains' && <EmailSettingsTab mode="domain" />}
        {activeSection === 'receipt-settings' && <ReceiptSettingsTab />}
        {activeSection === 'letterheads' && <LetterheadManager />}
        {activeSection === 'signatures' && <SignatureManager />}
        {activeSection === 'defaults' && <DocumentDefaults />}
      </main>
    </div>
  )
}
