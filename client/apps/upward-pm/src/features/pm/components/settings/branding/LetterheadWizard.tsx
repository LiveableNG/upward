'use client'

import React, { useState } from 'react'
import { FileText, Loader2, Upload, ChevronRight, ChevronLeft, Check, Wand2 } from 'lucide-react'
import { LetterheadMarginPreview } from '../LetterheadMarginPreview'
import { Modal } from '@/components/ui/Modal/Modal'
import type { MarginBox } from '../branding.types'

type PageSize = { width: number; height: number }

type WizardStep = 1 | 2 | 3 | 4 | 5

type Props = {
  onClose: () => void
  onSave: (payload: any) => void
  savePending: boolean
  // PDF processor state
  draftFile: File | null
  pdfPageCount: number | null
  previewPngUrls: (string | null)[]
  previewPagePts: [PageSize | null, PageSize | null]
  previewLoading: boolean
  uploading: boolean
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadLetterheadFiles: (
    pageCount: number,
    firstPageMargins: MarginBox,
    continuationPageMargins: MarginBox,
    reuseFirstPage: boolean,
    singlePageOverflowMode: 'reuse' | 'blank',
    isDefault: boolean,
  ) => Promise<any>
  setUploading: (v: boolean) => void
}

const STEPS: { title: string }[] = [
  { title: 'Upload PDF' },
  { title: 'Template Type' },
  { title: 'Overflow Behaviour' },
  { title: 'Margin Editor' },
  { title: 'Review & Save' },
]

function createBlankPageDataUrl(w: number, h: number, scale = 0.6): string {
  const width = Math.max(1, Math.round(w * scale))
  const height = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)
  ctx.fillStyle = '#94a3b8'
  ctx.font = `${Math.max(10, Math.round(width * 0.025))}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Blank continuation page', width / 2, height / 2)
  return canvas.toDataURL('image/png')
}

export function LetterheadWizard({
  onClose,
  onSave,
  savePending,
  draftFile,
  pdfPageCount,
  previewPngUrls,
  previewPagePts,
  previewLoading,
  uploading,
  handleFileUpload,
  uploadLetterheadFiles,
  setUploading,
}: Props) {
  const [step, setStep] = useState<WizardStep>(1)
  const [pageCount, setPageCount] = useState(1)
  const [isDefault, setIsDefault] = useState(true)
  const [reuseFirstPage, setReuseFirstPage] = useState(true)
  const [singlePageOverflowMode, setSinglePageOverflowMode] = useState<'reuse' | 'blank'>('blank')
  const [firstPageMargins, setFirstPageMargins] = useState<MarginBox>({
    top: 170, bottom: 110, left: 50, right: 50,
  })
  const [continuationPageMargins, setContinuationPageMargins] = useState<MarginBox>({
    top: 100, bottom: 80, left: 50, right: 50,
  })

  const canAdvance = () => {
    if (step === 1) return !!draftFile && !previewLoading
    return true
  }

  const handleNext = () => { if (step < 5) setStep((s) => (s + 1) as WizardStep) }
  const handleBack = () => { if (step > 1) setStep((s) => (s - 1) as WizardStep) }

  const handleSave = async () => {
    setUploading(true)
    try {
      const payload = await uploadLetterheadFiles(
        pageCount, firstPageMargins, continuationPageMargins,
        reuseFirstPage, singlePageOverflowMode, isDefault,
      )
      onSave(payload)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const isReuse = pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 12 }}>
      <button className="btn btn--secondary" onClick={step === 1 ? onClose : handleBack}>
        {step === 1 ? 'Cancel' : <><ChevronLeft size={14} /> Back</>}
      </button>
      <div style={{ display: 'flex', gap: 10 }}>
        {step < 5 ? (
          <button className="btn btn--primary" onClick={handleNext} disabled={!canAdvance()}>
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button className="btn btn--primary" onClick={handleSave} disabled={savePending || uploading}>
            {savePending || uploading
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Check size={14} /> Save Template</>}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Letterhead Template"
      subtitle={STEPS[step - 1].title}
      icon={Wand2}
      maxWidth={820}
      footer={footer}
    >
      {/* Step indicator */}
      <div className="branding-wizard__steps">
        {STEPS.map((s, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <React.Fragment key={n}>
              <div className={`branding-wizard__step ${active ? 'branding-wizard__step--active' : ''} ${done ? 'branding-wizard__step--done' : ''}`}>
                <div className="branding-wizard__step-dot">
                  {done ? <Check size={12} /> : n}
                </div>
                <span className="branding-wizard__step-label">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`branding-wizard__step-line ${done ? 'branding-wizard__step-line--done' : ''}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step content */}
      <div className="branding-wizard__body">
        {/* Step 1 — Upload PDF */}
        {step === 1 && (
          <div className="branding-wizard__step-content">
            <label className="branding-wizard__upload-zone" htmlFor="wizard-pdf-input">
              {previewLoading ? (
                <>
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--forest)' }} />
                  <span>Processing PDF…</span>
                </>
              ) : draftFile ? (
                <>
                  <FileText size={32} style={{ color: 'var(--forest)' }} />
                  <span className="branding-wizard__upload-filename">{draftFile.name}</span>
                  <span className="branding-wizard__upload-meta">
                    {pdfPageCount} page{pdfPageCount !== 1 ? 's' : ''} detected · Click to replace
                  </span>
                </>
              ) : (
                <>
                  <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                  <span>Click to browse or drag a PDF here</span>
                  <span className="branding-wizard__upload-meta">PDF only · Max 10MB</span>
                </>
              )}
            </label>
            <input
              id="wizard-pdf-input"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={previewLoading}
            />
          </div>
        )}

        {/* Step 2 — Template Type */}
        {step === 2 && (
          <div className="branding-wizard__step-content">
            <p className="branding-wizard__step-desc">
              How many pages does your letterhead template PDF have?
            </p>
            <div className="branding-wizard__option-grid">
              <button
                type="button"
                className={`branding-wizard__option-card ${pageCount === 1 ? 'branding-wizard__option-card--active' : ''}`}
                onClick={() => setPageCount(1)}
              >
                <FileText size={28} />
                <strong>1 Page</strong>
                <span>Single-page letterhead template</span>
              </button>
              <button
                type="button"
                className={`branding-wizard__option-card ${pageCount === 2 ? 'branding-wizard__option-card--active' : ''}`}
                onClick={() => setPageCount(2)}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  <FileText size={24} />
                  <FileText size={24} />
                </div>
                <strong>2+ Pages</strong>
                <span>Separate first &amp; continuation pages</span>
              </button>
            </div>
            <label className="branding-wizard__checkbox-row">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Set as default template
            </label>
          </div>
        )}

        {/* Step 3 — Overflow Behaviour */}
        {step === 3 && (
          <div className="branding-wizard__step-content">
            <p className="branding-wizard__step-desc">
              When a document overflows onto additional pages, how should the letterhead behave?
            </p>
            {pageCount === 1 ? (
              <div className="branding-wizard__option-grid">
                <button
                  type="button"
                  className={`branding-wizard__option-card ${singlePageOverflowMode === 'reuse' ? 'branding-wizard__option-card--active' : ''}`}
                  onClick={() => setSinglePageOverflowMode('reuse')}
                >
                  <FileText size={28} />
                  <strong>Repeat Letterhead</strong>
                  <span>Use the same page 1 design on all pages</span>
                </button>
                <button
                  type="button"
                  className={`branding-wizard__option-card ${singlePageOverflowMode === 'blank' ? 'branding-wizard__option-card--active' : ''}`}
                  onClick={() => setSinglePageOverflowMode('blank')}
                >
                  <div style={{ width: 28, height: 28, border: '2px dashed var(--border-strong)', borderRadius: 4 }} />
                  <strong>Blank Pages</strong>
                  <span>Continuation pages have no letterhead artwork</span>
                </button>
              </div>
            ) : (
              <div className="branding-wizard__option-grid">
                <button
                  type="button"
                  className={`branding-wizard__option-card ${reuseFirstPage ? 'branding-wizard__option-card--active' : ''}`}
                  onClick={() => setReuseFirstPage(true)}
                >
                  <FileText size={28} />
                  <strong>Reuse First Page</strong>
                  <span>Use page 1 margins &amp; artwork for all continuation pages</span>
                </button>
                <button
                  type="button"
                  className={`branding-wizard__option-card ${!reuseFirstPage ? 'branding-wizard__option-card--active' : ''}`}
                  onClick={() => setReuseFirstPage(false)}
                >
                  <div style={{ display: 'flex', gap: 4 }}>
                    <FileText size={24} />
                    <FileText size={24} style={{ opacity: 0.5 }} />
                  </div>
                  <strong>Separate Pages</strong>
                  <span>Distinct margins for page 1 and continuation pages</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Margin Editor */}
        {step === 4 && (
          <div className="branding-wizard__step-content branding-wizard__step-content--margins">
            {previewPngUrls[0] && previewPagePts[0] ? (
              <div className="branding-wizard__margin-grid">
                <div>
                  <LetterheadMarginPreview
                    imageSrc={previewPngUrls[0]}
                    pageWidthPt={previewPagePts[0].width}
                    pageHeightPt={previewPagePts[0].height}
                    previewScale={0.6}
                    margins={firstPageMargins}
                    onChange={setFirstPageMargins}
                    caption="Page 1 Safe Area"
                  />
                  <div className="branding-wizard__margin-inputs">
                    {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                      <div key={side} className="branding-wizard__margin-field">
                        <label>{side.charAt(0).toUpperCase() + side.slice(1)} (pt)</label>
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

                {!isReuse && (
                  <div>
                    <LetterheadMarginPreview
                      imageSrc={
                        pageCount === 1
                          ? createBlankPageDataUrl(previewPagePts[0]!.width, previewPagePts[0]!.height, 0.6)
                          : (previewPngUrls[1] ?? createBlankPageDataUrl(previewPagePts[0]!.width, previewPagePts[0]!.height, 0.6))
                      }
                      pageWidthPt={pageCount === 1 ? previewPagePts[0]!.width : (previewPagePts[1]?.width ?? 595)}
                      pageHeightPt={pageCount === 1 ? previewPagePts[0]!.height : (previewPagePts[1]?.height ?? 842)}
                      previewScale={0.6}
                      margins={continuationPageMargins}
                      onChange={setContinuationPageMargins}
                      caption="Continuation Pages Safe Area"
                      helperText="Drag handles to set where text can go on overflow pages."
                    />
                    <div className="branding-wizard__margin-inputs">
                      {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                        <div key={side} className="branding-wizard__margin-field">
                          <label>{side.charAt(0).toUpperCase() + side.slice(1)} (pt)</label>
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

                {isReuse && (
                  <div className="branding-wizard__reuse-notice">
                    <Check size={18} style={{ color: 'var(--forest)' }} />
                    <span>Continuation pages will use the same margins and artwork as Page 1.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="branding-wizard__no-preview">
                <FileText size={40} style={{ color: 'var(--text-muted)' }} />
                <p>No preview available — go back and upload a PDF first.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Review & Save */}
        {step === 5 && (
          <div className="branding-wizard__step-content">
            <div className="branding-wizard__review">
              <h4 className="branding-wizard__review-title">Review Configuration</h4>
              <div className="branding-wizard__review-grid">
                <div className="branding-wizard__review-row">
                  <span>PDF File</span>
                  <strong>{draftFile?.name ?? '—'}</strong>
                </div>
                <div className="branding-wizard__review-row">
                  <span>Template Pages</span>
                  <strong>{pageCount}</strong>
                </div>
                <div className="branding-wizard__review-row">
                  <span>Overflow Behaviour</span>
                  <strong>
                    {pageCount === 1
                      ? singlePageOverflowMode === 'reuse' ? 'Repeat letterhead' : 'Blank pages'
                      : reuseFirstPage ? 'Reuse first page' : 'Separate margins'}
                  </strong>
                </div>
                <div className="branding-wizard__review-row">
                  <span>First Page Margins</span>
                  <strong>T:{firstPageMargins.top} B:{firstPageMargins.bottom} L:{firstPageMargins.left} R:{firstPageMargins.right}</strong>
                </div>
                {!isReuse && (
                  <div className="branding-wizard__review-row">
                    <span>Continuation Margins</span>
                    <strong>T:{continuationPageMargins.top} B:{continuationPageMargins.bottom} L:{continuationPageMargins.left} R:{continuationPageMargins.right}</strong>
                  </div>
                )}
                <div className="branding-wizard__review-row">
                  <span>Set as Default</span>
                  <strong>{isDefault ? 'Yes' : 'No'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
