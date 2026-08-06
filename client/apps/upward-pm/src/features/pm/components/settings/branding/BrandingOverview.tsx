'use client'

import React from 'react'
import { FileText, PenTool, Settings, Loader2, ChevronRight, Mail } from 'lucide-react'
import type { SavedPmLetterhead } from '../branding.types'
import type { SignatureConfig } from '../branding.types'

type Props = {
  letterheads: SavedPmLetterhead[]
  signatures: SignatureConfig[]
  isLoading: boolean
  signaturesLoading: boolean
  onNavigate: (section: string) => void
}

export function BrandingOverview({
  letterheads,
  signatures,
  isLoading,
  signaturesLoading,
  onNavigate,
}: Props) {
  const defaultLetterhead = letterheads.find((l) => l.isDefault)
  const defaultSignature = signatures.find((s) => s.isDefault)

  return (
    <div className="branding-overview">
      <div className="branding-overview__header">
        <h2 className="branding-overview__title">Branding & Documents</h2>
        <p className="branding-overview__subtitle">
          Configure how your generated documents look. Choose a section to manage.
        </p>
      </div>

      <div className="branding-overview__grid">
        {/* Letterheads card */}
        <div className="branding-overview__card">
          <div className="branding-overview__card-icon branding-overview__card-icon--letterhead">
            <FileText size={24} />
          </div>
          <div className="branding-overview__card-body">
            <h3 className="branding-overview__card-title">Letterhead Templates</h3>
            <p className="branding-overview__card-desc">
              PDF background templates applied to generated documents.
            </p>
            {isLoading ? (
              <div className="branding-overview__card-meta">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="branding-overview__card-meta">
                <span className="branding-overview__badge">
                  {letterheads.length} template{letterheads.length !== 1 ? 's' : ''}
                </span>
                {defaultLetterhead && (
                  <span className="branding-overview__card-default">
                    Default: #{defaultLetterhead.id}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            className="branding-overview__card-action"
            onClick={() => onNavigate('letterheads')}
          >
            Manage <ChevronRight size={14} />
          </button>
        </div>

        {/* Signatures card */}
        <div className="branding-overview__card">
          <div className="branding-overview__card-icon branding-overview__card-icon--signature">
            <PenTool size={24} />
          </div>
          <div className="branding-overview__card-body">
            <h3 className="branding-overview__card-title">Signatures</h3>
            <p className="branding-overview__card-desc">
              Drawn, uploaded, or digital signatures for use in documents.
            </p>
            {signaturesLoading ? (
              <div className="branding-overview__card-meta">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="branding-overview__card-meta">
                <span className="branding-overview__badge">
                  {signatures.length} signature{signatures.length !== 1 ? 's' : ''}
                </span>
                {defaultSignature && (
                  <span className="branding-overview__card-default">
                    Default: {defaultSignature.name}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            className="branding-overview__card-action"
            onClick={() => onNavigate('signatures')}
          >
            Manage <ChevronRight size={14} />
          </button>
        </div>

        {/* Document Defaults card */}
        <div className="branding-overview__card">
          <div className="branding-overview__card-icon branding-overview__card-icon--defaults">
            <Settings size={24} />
          </div>
          <div className="branding-overview__card-body">
            <h3 className="branding-overview__card-title">Document Defaults</h3>
            <p className="branding-overview__card-desc">
              Choose which letterhead and signature are used by default when generating documents.
            </p>
            <div className="branding-overview__card-meta">
              {defaultLetterhead ? (
                <span className="branding-overview__badge">
                  Letterhead #{defaultLetterhead.id}
                </span>
              ) : (
                <span className="branding-overview__badge branding-overview__badge--empty">
                  No default set
                </span>
              )}
            </div>
          </div>
          <button
            className="branding-overview__card-action"
            onClick={() => onNavigate('defaults')}
          >
            Configure <ChevronRight size={14} />
          </button>
        </div>

        {/* Email Settings card */}
        <div className="branding-overview__card">
          <div className="branding-overview__card-icon branding-overview__card-icon--email" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}>
            <Mail size={24} />
          </div>
          <div className="branding-overview__card-body">
            <h3 className="branding-overview__card-title">Email Settings</h3>
            <p className="branding-overview__card-desc">
              Configure your verified sender domain, global CC/BCC, and email footer settings.
            </p>
            <div className="branding-overview__card-meta">
              <span className="branding-overview__badge">
                Domain Verification & Footer
              </span>
            </div>
          </div>
          <button
            className="branding-overview__card-action"
            onClick={() => onNavigate('email-settings')}
          >
            Manage <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
