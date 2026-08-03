'use client'

import React, { useState } from 'react'
import { Loader2, Download, Trash2, AlertTriangle, Settings } from 'lucide-react'
import { LetterheadMarginPreview } from '../LetterheadMarginPreview'
import { Modal } from '@/components/ui/Modal/Modal'
import type { MarginBox, SavedPmLetterhead } from '../branding.types'

type Tab = 'general' | 'margins' | 'preview' | 'advanced'

type Props = {
  letterhead: SavedPmLetterhead
  onClose: () => void
  onSave: (id: number, payload: any) => void
  onDelete: (id: number) => void
  onSetDefault: (id: number) => void
  savePending: boolean
  deletePending: boolean
  onDownloadJson: (
    lh: SavedPmLetterhead,
    firstPageMargins: MarginBox,
    continuationPageMargins: MarginBox,
    reuseFirstPage: boolean,
    singlePageOverflowMode: 'reuse' | 'blank',
  ) => void
}

export function LetterheadEditor({
  letterhead,
  onClose,
  onSave,
  onDelete,
  onSetDefault,
  savePending,
  deletePending,
  onDownloadJson,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isReuseStored = letterhead.templateConfig?.reuse_first_page_for_continuation !== false

  const [firstPageMargins, setFirstPageMargins] = useState<MarginBox>(
    letterhead.templateConfig?.first_page ?? { top: 170, bottom: 110, left: 50, right: 50 },
  )
  const [continuationPageMargins, setContinuationPageMargins] = useState<MarginBox>(
    letterhead.templateConfig?.continuation_page ?? { top: 100, bottom: 80, left: 50, right: 50 },
  )
  const [reuseFirstPage, setReuseFirstPage] = useState(isReuseStored)
  const [singlePageOverflowMode, setSinglePageOverflowMode] = useState<'reuse' | 'blank'>(
    isReuseStored ? 'reuse' : 'blank',
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'margins', label: 'Margins' },
    { key: 'preview', label: 'Preview' },
    { key: 'advanced', label: 'Advanced' },
  ]

  const handleSaveMargins = () => {
    const isReuse =
      letterhead.pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage
    onSave(letterhead.id, {
      templateConfig: {
        first_page: firstPageMargins,
        continuation_page: isReuse ? firstPageMargins : continuationPageMargins,
        reuse_first_page_for_continuation: isReuse,
      },
    })
  }

  // Footer varies by active tab
  const footer =
    activeTab === 'margins' ? (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
        <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" onClick={handleSaveMargins} disabled={savePending}>
          {savePending ? <Loader2 size={14} className="animate-spin" /> : 'Save Margins'}
        </button>
      </div>
    ) : (
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
        <button className="btn btn--secondary" onClick={onClose}>Close</button>
      </div>
    )

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Template #${letterhead.id}`}
      subtitle={`${letterhead.pageCount} ${letterhead.pageCount === 1 ? 'page' : 'pages'} · Uploaded ${new Date(letterhead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
      icon={Settings}
      maxWidth={960}
      footer={footer}
    >
      {/* Tab bar */}
      <div className="branding-editor__tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`branding-editor__tab ${activeTab === t.key ? 'branding-editor__tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="branding-editor__panel">
          <div className="branding-editor__info-grid">
            <div className="branding-editor__info-row">
              <span>Template ID</span>
              <strong>#{letterhead.id}</strong>
            </div>
            <div className="branding-editor__info-row">
              <span>Page Count</span>
              <strong>{letterhead.pageCount}</strong>
            </div>
            <div className="branding-editor__info-row">
              <span>Default Template</span>
              <strong>{letterhead.isDefault ? 'Yes' : 'No'}</strong>
            </div>
            <div className="branding-editor__info-row">
              <span>Uploaded</span>
              <strong>
                {new Date(letterhead.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </strong>
            </div>
            <div className="branding-editor__info-row">
              <span>Overflow Behaviour</span>
              <strong>
                {letterhead.pageCount === 1
                  ? isReuseStored ? 'Repeat letterhead' : 'Blank pages'
                  : isReuseStored ? 'Reuse first page' : 'Separate margins'}
              </strong>
            </div>
          </div>
          {!letterhead.isDefault && (
            <button
              className="btn btn--secondary"
              style={{ marginTop: 20 }}
              onClick={() => onSetDefault(letterhead.id)}
            >
              Set as Default
            </button>
          )}
        </div>
      )}

      {/* Margins */}
      {activeTab === 'margins' && (
        <div className="branding-editor__panel branding-editor__panel--margins">
          <div className="branding-editor__overflow-row">
            {letterhead.pageCount === 1 ? (
              <>
                <span className="branding-editor__overflow-label">Continuation pages:</span>
                <label className="branding-editor__radio">
                  <input
                    type="radio"
                    name="editor-overflow"
                    checked={singlePageOverflowMode === 'reuse'}
                    onChange={() => setSinglePageOverflowMode('reuse')}
                  />
                  Repeat letterhead
                </label>
                <label className="branding-editor__radio">
                  <input
                    type="radio"
                    name="editor-overflow"
                    checked={singlePageOverflowMode === 'blank'}
                    onChange={() => setSinglePageOverflowMode('blank')}
                  />
                  Blank pages
                </label>
              </>
            ) : (
              <label className="branding-editor__checkbox">
                <input
                  type="checkbox"
                  checked={reuseFirstPage}
                  onChange={(e) => setReuseFirstPage(e.target.checked)}
                />
                Reuse page 1 margins for continuation pages
              </label>
            )}
          </div>

          <div className="branding-editor__margin-grid">
            {/* Page 1 */}
            <div>
              {letterhead.previewFirstPageUrl ? (
                <LetterheadMarginPreview
                  imageSrc={letterhead.previewFirstPageUrl}
                  pageWidthPt={595}
                  pageHeightPt={842}
                  previewScale={0.6}
                  margins={firstPageMargins}
                  onChange={setFirstPageMargins}
                  caption="Page 1 Layout"
                />
              ) : (
                <div className="branding-editor__no-preview">No preview for page 1</div>
              )}
              <div className="branding-editor__margin-inputs">
                {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                  <div key={side} className="branding-editor__margin-field">
                    <label>{side.charAt(0).toUpperCase() + side.slice(1)}</label>
                    <input
                      type="number"
                      min={0}
                      value={firstPageMargins[side]}
                      onChange={(e) =>
                        setFirstPageMargins({ ...firstPageMargins, [side]: Number(e.target.value) })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Continuation page (conditional) */}
            {((letterhead.pageCount > 1 && !reuseFirstPage) ||
              (letterhead.pageCount === 1 && singlePageOverflowMode === 'blank')) && (
              <div>
                {letterhead.previewContinuationPageUrl ? (
                  <LetterheadMarginPreview
                    imageSrc={letterhead.previewContinuationPageUrl}
                    pageWidthPt={595}
                    pageHeightPt={842}
                    previewScale={0.6}
                    margins={continuationPageMargins}
                    onChange={setContinuationPageMargins}
                    caption="Continuation Pages Layout"
                  />
                ) : (
                  <div className="branding-editor__no-preview">No continuation page preview</div>
                )}
                <div className="branding-editor__margin-inputs">
                  {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                    <div key={side} className="branding-editor__margin-field">
                      <label>{side.charAt(0).toUpperCase() + side.slice(1)}</label>
                      <input
                        type="number"
                        min={0}
                        value={continuationPageMargins[side]}
                        onChange={(e) =>
                          setContinuationPageMargins({
                            ...continuationPageMargins,
                            [side]: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {activeTab === 'preview' && (
        <div className="branding-editor__panel branding-editor__panel--preview">
          <div className="branding-editor__preview-grid">
            <div>
              <p className="branding-editor__preview-label">Page 1</p>
              {letterhead.previewFirstPageUrl ? (
                <img
                  src={letterhead.previewFirstPageUrl}
                  alt="Page 1 preview"
                  className="branding-editor__preview-img"
                />
              ) : (
                <div className="branding-editor__no-preview">No page 1 preview</div>
              )}
            </div>
            {(letterhead.pageCount > 1 || letterhead.previewContinuationPageUrl) && (
              <div>
                <p className="branding-editor__preview-label">Continuation Pages</p>
                {letterhead.previewContinuationPageUrl ? (
                  <img
                    src={letterhead.previewContinuationPageUrl}
                    alt="Continuation page preview"
                    className="branding-editor__preview-img"
                  />
                ) : (
                  <div className="branding-editor__no-preview">No continuation preview</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced */}
      {activeTab === 'advanced' && (
        <div className="branding-editor__panel">
          <div className="branding-editor__advanced-section">
            <h4 className="branding-editor__advanced-title">Export Configuration</h4>
            <p className="branding-editor__advanced-desc">
              Download the margin configuration as a JSON file for backup or reference.
            </p>
            <button
              className="btn btn--secondary"
              onClick={() =>
                onDownloadJson(letterhead, firstPageMargins, continuationPageMargins, reuseFirstPage, singlePageOverflowMode)
              }
            >
              <Download size={14} /> Download JSON Config
            </button>
          </div>

          <div className="branding-editor__advanced-section branding-editor__advanced-section--danger">
            <h4 className="branding-editor__advanced-title branding-editor__advanced-title--danger">
              Danger Zone
            </h4>
            <p className="branding-editor__advanced-desc">
              Permanently delete this letterhead template. This action cannot be undone.
            </p>
            {confirmDelete ? (
              <div className="branding-editor__confirm-delete">
                <AlertTriangle size={16} style={{ color: 'var(--clay)' }} />
                <span>Are you sure?</span>
                <button
                  className="btn btn--secondary"
                  style={{ color: 'var(--clay)', borderColor: 'var(--clay)' }}
                  onClick={() => onDelete(letterhead.id)}
                  disabled={deletePending}
                >
                  {deletePending ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Delete'}
                </button>
                <button className="btn btn--secondary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn--secondary"
                style={{ color: 'var(--clay)', borderColor: 'var(--clay)' }}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} /> Delete Template
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
