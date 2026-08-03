'use client'

import React from 'react'
import { Loader2, Check } from 'lucide-react'
import { useLetterheads } from './branding.hooks'
import { useSignatures } from './branding.hooks'

export function DocumentDefaults() {
  const { letterheads, isLoading: lhLoading, setDefaultMutation } = useLetterheads()
  const { signatures, signaturesLoading, setDefaultSigMutation } = useSignatures()

  const defaultLetterhead = letterheads.find((l) => l.isDefault)
  const defaultSignature = signatures.find((s) => s.isDefault)

  return (
    <div className="branding-manager">
      <div className="branding-manager__header">
        <div>
          <h2 className="branding-manager__title">Document Defaults</h2>
          <p className="branding-manager__subtitle">
            Choose which assets are used automatically when generating documents.
          </p>
        </div>
      </div>

      <div className="branding-defaults">
        {/* Default Letterhead */}
        <div className="branding-defaults__section">
          <h3 className="branding-defaults__section-title">Default Letterhead</h3>
          <p className="branding-defaults__section-desc">
            The letterhead template applied to all generated documents unless overridden.
          </p>
          {lhLoading ? (
            <div className="branding-defaults__loader">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--forest)' }} />
            </div>
          ) : letterheads.length === 0 ? (
            <p className="branding-defaults__empty">
              No letterhead templates configured yet. Add one in the Letterheads section.
            </p>
          ) : (
            <div className="branding-defaults__options">
              {letterheads.map((lh) => (
                <label
                  key={lh.id}
                  className={`branding-defaults__option ${lh.isDefault ? 'branding-defaults__option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="default-letterhead"
                    checked={lh.isDefault}
                    onChange={() => setDefaultMutation.mutate(lh.id)}
                    style={{ display: 'none' }}
                  />
                  {lh.previewFirstPageUrl && (
                    <img
                      src={lh.previewFirstPageUrl}
                      alt={`Template #${lh.id}`}
                      className="branding-defaults__option-thumb"
                    />
                  )}
                  <div className="branding-defaults__option-info">
                    <span className="branding-defaults__option-name">Template #{lh.id}</span>
                    <span className="branding-defaults__option-meta">
                      {lh.pageCount} {lh.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                      {new Date(lh.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {lh.isDefault && (
                    <span className="branding-defaults__option-check">
                      <Check size={14} />
                    </span>
                  )}
                  {setDefaultMutation.isPending && !lh.isDefault && (
                    <Loader2 size={14} className="animate-spin" style={{ marginLeft: 'auto' }} />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Default Signature */}
        <div className="branding-defaults__section">
          <h3 className="branding-defaults__section-title">Default Signature</h3>
          <p className="branding-defaults__section-desc">
            The signature inserted into documents unless a specific one is selected.
          </p>
          {signaturesLoading ? (
            <div className="branding-defaults__loader">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--forest)' }} />
            </div>
          ) : signatures.length === 0 ? (
            <p className="branding-defaults__empty">
              No signatures configured yet. Add one in the Signatures section.
            </p>
          ) : (
            <div className="branding-defaults__options">
              {(signatures as any[]).map((sig) => (
                <label
                  key={sig.id}
                  className={`branding-defaults__option ${sig.isDefault ? 'branding-defaults__option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="default-signature"
                    checked={sig.isDefault}
                    onChange={() => setDefaultSigMutation.mutate(sig.id)}
                    style={{ display: 'none' }}
                  />
                  <div className="branding-defaults__option-sig-preview">
                    {sig.type === 'digital' ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: sig.content || '' }}
                        style={{ transform: 'scale(0.6)', transformOrigin: 'left center' }}
                      />
                    ) : (
                      <img src={sig.fileUrl} alt={sig.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    )}
                  </div>
                  <div className="branding-defaults__option-info">
                    <span className="branding-defaults__option-name">{sig.name}</span>
                    <span className="branding-defaults__option-meta">
                      {sig.type === 'pad' ? 'Drawn' : sig.type === 'digital' ? 'Digital' : 'Uploaded'}
                    </span>
                  </div>
                  {sig.isDefault && (
                    <span className="branding-defaults__option-check">
                      <Check size={14} />
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
