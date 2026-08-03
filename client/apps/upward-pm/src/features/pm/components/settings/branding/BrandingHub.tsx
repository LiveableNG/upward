'use client'

import React, { useState } from 'react'
import { LayoutDashboard, FileText, PenTool, Settings } from 'lucide-react'
import { BrandingOverview } from './BrandingOverview'
import { LetterheadManager } from './LetterheadManager'
import { SignatureManager } from './SignatureManager'
import { DocumentDefaults } from './DocumentDefaults'
import { useLetterheads } from './branding.hooks'
import { useSignatures } from './branding.hooks'

type Section = 'overview' | 'letterheads' | 'signatures' | 'defaults'

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { key: 'letterheads', label: 'Letterheads', icon: <FileText size={16} /> },
  { key: 'signatures', label: 'Signatures', icon: <PenTool size={16} /> },
  { key: 'defaults', label: 'Document Defaults', icon: <Settings size={16} /> },
]

export function BrandingHub() {
  const [activeSection, setActiveSection] = useState<Section>('overview')

  // Pre-fetch data at the hub level so Overview cards can show counts immediately
  const { letterheads, isLoading: lhLoading } = useLetterheads()
  const { signatures, signaturesLoading } = useSignatures()

  return (
    <div className="branding-hub">
      {/* Sidebar (desktop) / pill nav (mobile) */}
      <aside className="branding-hub__sidebar">
        <nav className="branding-hub__nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`branding-hub__nav-item ${activeSection === item.key ? 'branding-hub__nav-item--active' : ''}`}
              onClick={() => setActiveSection(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile pill nav */}
      <div className="branding-hub__mobile-nav">
        {NAV_ITEMS.map((item) => (
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
        {activeSection === 'overview' && (
          <BrandingOverview
            letterheads={letterheads}
            signatures={signatures as any}
            isLoading={lhLoading}
            signaturesLoading={signaturesLoading}
            onNavigate={(section) => setActiveSection(section as Section)}
          />
        )}
        {activeSection === 'letterheads' && <LetterheadManager />}
        {activeSection === 'signatures' && <SignatureManager />}
        {activeSection === 'defaults' && <DocumentDefaults />}
      </main>
    </div>
  )
}
