'use client'

import React from 'react'
import { Loader2, FileText, Trash2, Layout, Settings } from 'lucide-react'
import { LetterheadMarginPreview } from './LetterheadMarginPreview'
import type { MarginBox, SavedPmLetterhead } from './branding.types'

type PageSize = { width: number; height: number }

type Props = {
  showCreateForm: boolean
  setShowCreateForm: (next: boolean) => void
  editingLetterhead: SavedPmLetterhead | null
  setEditingLetterhead: (next: SavedPmLetterhead | null) => void
  uploading: boolean
  draftFile: File | null
  pdfPageCount: number | null
  previewPngUrls: (string | null)[]
  previewPagePts: [PageSize | null, PageSize | null]
  previewLoading: boolean
  pageCount: number
  setPageCount: (next: number) => void
  isDefault: boolean
  setIsDefault: (next: boolean) => void
  reuseFirstPage: boolean
  setReuseFirstPage: (next: boolean) => void
  singlePageOverflowMode: 'reuse' | 'blank'
  setSinglePageOverflowMode: (next: 'reuse' | 'blank') => void
  firstPageMargins: MarginBox
  setFirstPageMargins: (next: MarginBox) => void
  continuationPageMargins: MarginBox
  setContinuationPageMargins: (next: MarginBox) => void
  letterheads: SavedPmLetterhead[]
  isLoading: boolean
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleSaveConfig: (e: React.FormEvent) => Promise<void>
  handleDownloadJsonConfig: () => void
  resetForm: () => void
  handleStartEditMargins: (lh: SavedPmLetterhead) => void
  handleUpdateConfig: () => void
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
  savePending: boolean
  updatePending: boolean
}

function createBlankPagePreviewDataUrl(pageWidthPt: number, pageHeightPt: number, scale = 0.6): string {
  const width = Math.max(1, Math.round(pageWidthPt * scale))
  const height = Math.max(1, Math.round(pageHeightPt * scale))
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
  ctx.fillStyle = '#64748b'
  ctx.font = `600 ${Math.max(11, Math.round(width * 0.028))}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Blank page - page 2 and beyond', width / 2, Math.min(height * 0.12, 48))
  ctx.font = `${Math.max(10, Math.round(width * 0.022))}px system-ui, sans-serif`
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('No letterhead artwork', width / 2, Math.min(height * 0.12, 48) + Math.max(14, width * 0.03))
  return canvas.toDataURL('image/png')
}

export function LetterheadConfigurationsSection({
  showCreateForm,
  setShowCreateForm,
  editingLetterhead,
  setEditingLetterhead,
  uploading,
  draftFile,
  pdfPageCount,
  previewPngUrls,
  previewPagePts,
  previewLoading,
  pageCount,
  setPageCount,
  isDefault,
  setIsDefault,
  reuseFirstPage,
  setReuseFirstPage,
  singlePageOverflowMode,
  setSinglePageOverflowMode,
  firstPageMargins,
  setFirstPageMargins,
  continuationPageMargins,
  setContinuationPageMargins,
  letterheads,
  isLoading,
  handleFileUpload,
  handleSaveConfig,
  handleDownloadJsonConfig,
  resetForm,
  handleStartEditMargins,
  handleUpdateConfig,
  onSetDefault,
  onDelete,
  savePending,
  updatePending,
}: Props) {
  return (
    <section id="letterhead-configurations" className="settings__section" style={{ marginBottom: 32, scrollMarginTop: 24 }}>
      <div className="flex-header-responsive" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Letterhead Design Configurations</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upload PDF background templates and define printable margins with a more focused workflow.</p>
        </div>
        {!showCreateForm && (
          <button className="btn btn--primary" onClick={() => setShowCreateForm(true)}>
            Add Configuration
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, padding: 12, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <a href="#letterhead-configurations" style={{ textDecoration: 'none' }}>
          <span className="btn btn--secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 999 }}>
            Letterhead Configurations
          </span>
        </a>
        <a href="#signature-configurations" style={{ textDecoration: 'none' }}>
          <span className="btn btn--secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 999 }}>
            Signature Configurations
          </span>
        </a>
      </div>

      {showCreateForm ? (
        <form onSubmit={handleSaveConfig} className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Letterhead Template</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Upload PDF Template</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="file" id="pdf-input" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading || previewLoading} />
                <label htmlFor="pdf-input" className="btn btn--secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 12 }}>
                  {previewLoading ? <Loader2 size={16} className="animate-spin text-forest" /> : <FileText size={16} />}
                  Choose PDF File
                </label>
                {draftFile && (
                  <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} className="text-forest" />
                    {draftFile.name} (pages: {pdfPageCount})
                  </span>
                )}
              </div>
            </div>

            <div className="grid-responsive-2col">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Template Page Count</label>
                <select value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  <option value={1}>1 Page Template</option>
                  <option value={2}>2+ Pages Template</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                    Set as Default
                  </label>
                  {pageCount === 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Continuation Pages (Page 2+)</span>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                          <input type="radio" name="overflow-mode" checked={singlePageOverflowMode === 'reuse'} onChange={() => setSinglePageOverflowMode('reuse')} />
                          Repeat Letterhead
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                          <input type="radio" name="overflow-mode" checked={singlePageOverflowMode === 'blank'} onChange={() => setSinglePageOverflowMode('blank')} />
                          Blank Page
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={reuseFirstPage} onChange={(e) => setReuseFirstPage(e.target.checked)} />
                      Reuse First Page
                    </label>
                  )}
                </div>
              </div>
            </div>

            {previewPngUrls[0] && previewPagePts[0] && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={16} /> Interactive Visual Margin Editor
                </h4>

                <div className="grid-responsive-layout">
                  <div>
                    <LetterheadMarginPreview
                      imageSrc={previewPngUrls[0]}
                      pageWidthPt={previewPagePts[0].width}
                      pageHeightPt={previewPagePts[0].height}
                      previewScale={0.6}
                      margins={firstPageMargins}
                      onChange={setFirstPageMargins}
                      caption="Page 1 Safe Area Layout"
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top Margin (pt)</label>
                        <input type="number" min={0} value={firstPageMargins.top} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, top: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bottom Margin (pt)</label>
                        <input type="number" min={0} value={firstPageMargins.bottom} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, bottom: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Left Margin (pt)</label>
                        <input type="number" min={0} value={firstPageMargins.left} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, left: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Right Margin (pt)</label>
                        <input type="number" min={0} value={firstPageMargins.right} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, right: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  </div>

                  {((pageCount > 1 && !reuseFirstPage && previewPngUrls[1] && previewPagePts[1]) ||
                    (pageCount === 1 && singlePageOverflowMode === 'blank' && previewPagePts[0])) && (
                    <div>
                      <LetterheadMarginPreview
                        imageSrc={pageCount === 1 ? createBlankPagePreviewDataUrl(previewPagePts[0]!.width, previewPagePts[0]!.height, 0.6) : previewPngUrls[1]!}
                        pageWidthPt={pageCount === 1 ? previewPagePts[0]!.width : previewPagePts[1]!.width}
                        pageHeightPt={pageCount === 1 ? previewPagePts[0]!.height : previewPagePts[1]!.height}
                        previewScale={0.6}
                        margins={continuationPageMargins}
                        onChange={setContinuationPageMargins}
                        caption={pageCount === 1 ? 'Page 2+ (Blank Page) Layout' : 'Continuation Pages Layout'}
                        helperText={pageCount === 1 ? 'Overflow pages use plain paper. Drag handles to set where text can go.' : undefined}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top Margin (pt)</label>
                          <input type="number" min={0} value={continuationPageMargins.top} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, top: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bottom Margin (pt)</label>
                          <input type="number" min={0} value={continuationPageMargins.bottom} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, bottom: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Left Margin (pt)</label>
                          <input type="number" min={0} value={continuationPageMargins.left} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, left: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Right Margin (pt)</label>
                          <input type="number" min={0} value={continuationPageMargins.right} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, right: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {draftFile && (
                <button type="button" className="btn btn--secondary" onClick={handleDownloadJsonConfig} style={{ marginRight: 'auto' }}>
                  Download JSON Config
                </button>
              )}
              <button type="button" className="btn btn--secondary" onClick={resetForm} disabled={savePending}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={savePending || uploading || previewLoading}>
                {savePending || uploading ? <Loader2 size={16} className="animate-spin text-forest" /> : 'Save Letterhead'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={32} className="animate-spin text-forest" />
            </div>
          ) : letterheads.length === 0 ? (
            <div className="glass" style={{ padding: 40, borderRadius: 24, textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <Layout size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, margin: '0 auto' }} />
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Configurations Yet</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Upload a PDF template to style document outputs.</p>
              <button className="btn btn--primary" onClick={() => setShowCreateForm(true)}>
                Create Configuration
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {letterheads.map((lh) => (
                <div key={lh.id} className="glass" style={{
                  padding: 20,
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  position: 'relative',
                  background: lh.isDefault ? 'rgba(var(--brand-rgb, 59, 130, 246), 0.03)' : 'var(--bg-card)',
                  borderColor: lh.isDefault ? 'var(--brand, #3b82f6)' : 'var(--border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={20} className={lh.isDefault ? 'text-brand' : 'text-grey'} />
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>Configuration #{lh.id}</h4>
                    </div>
                    {lh.isDefault && (
                      <span style={{ fontSize: 11, background: 'var(--brand, #3b82f6)', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                        Default
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    <div>Pages: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{lh.pageCount}</span></div>
                    <div>Margins P1: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{lh.templateConfig?.first_page ? `T:${lh.templateConfig.first_page.top} B:${lh.templateConfig.first_page.bottom} L:${lh.templateConfig.first_page.left} R:${lh.templateConfig.first_page.right}` : 'Default'}</span></div>
                    {lh.pageCount > 1 && (
                      <div>Margins P2+: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{lh.templateConfig?.reuse_first_page_for_continuation ? 'Reusing P1' : `T:${lh.templateConfig?.continuation_page?.top} B:${lh.templateConfig?.continuation_page?.bottom} L:${lh.templateConfig?.continuation_page?.left} R:${lh.templateConfig?.continuation_page?.right}`}</span></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <button className="btn btn--secondary" style={{ fontSize: 12, height: 32, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleStartEditMargins(lh)}>
                      <Settings size={14} /> Edit Margins
                    </button>
                    {!lh.isDefault && (
                      <button className="btn btn--secondary" style={{ fontSize: 12, height: 32, padding: '0 10px' }} onClick={() => onSetDefault(lh.id)}>
                        Set Default
                      </button>
                    )}
                    <button className="btn btn--secondary" style={{ fontSize: 12, height: 32, padding: '0 10px', color: 'var(--clay)' }} onClick={() => onDelete(lh.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editingLetterhead && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass" style={{
            background: 'white',
            borderRadius: 24,
            border: '1px solid var(--border)',
            padding: 32,
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Margins for Configuration #{editingLetterhead.id}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drag the dashed lines to adjust printable area margins.</p>
              </div>
              <button
                onClick={() => setEditingLetterhead(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>

            <div className="grid-responsive-layout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {editingLetterhead.previewFirstPageUrl ? (
                  <LetterheadMarginPreview
                    imageSrc={editingLetterhead.previewFirstPageUrl}
                    pageWidthPt={595}
                    pageHeightPt={842}
                    previewScale={0.6}
                    margins={firstPageMargins}
                    onChange={setFirstPageMargins}
                    caption="Page 1 Layout"
                  />
                ) : (
                  <div style={{ padding: 40, border: '1.5px dashed var(--border)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No preview image available for this template.
                  </div>
                )}

                {((pageCount > 1 && !reuseFirstPage && editingLetterhead.previewContinuationPageUrl) ||
                  (pageCount === 1 && singlePageOverflowMode === 'blank')) && (
                  <LetterheadMarginPreview
                    imageSrc={pageCount === 1 ? createBlankPagePreviewDataUrl(595, 842, 0.6) : editingLetterhead.previewContinuationPageUrl!}
                    pageWidthPt={595}
                    pageHeightPt={842}
                    previewScale={0.6}
                    margins={continuationPageMargins}
                    onChange={setContinuationPageMargins}
                    caption={pageCount === 1 ? 'Page 2+ (Blank Page) Layout' : 'Continuation Pages Layout'}
                    helperText={pageCount === 1 ? 'Overflow pages use plain paper. Drag handles to set where text can go.' : undefined}
                  />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>First Page Margins (pt)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Top</label>
                      <input type="number" min={0} value={firstPageMargins.top} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, top: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Bottom</label>
                      <input type="number" min={0} value={firstPageMargins.bottom} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, bottom: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Left</label>
                      <input type="number" min={0} value={firstPageMargins.left} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, left: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Right</label>
                      <input type="number" min={0} value={firstPageMargins.right} onChange={(e) => setFirstPageMargins({ ...firstPageMargins, right: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                    </div>
                  </div>
                </div>

                {pageCount === 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Continuation Pages (Page 2+)</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input type="radio" name="edit-overflow-mode" checked={singlePageOverflowMode === 'reuse'} onChange={() => setSinglePageOverflowMode('reuse')} />
                        Repeat Letterhead
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input type="radio" name="edit-overflow-mode" checked={singlePageOverflowMode === 'blank'} onChange={() => setSinglePageOverflowMode('blank')} />
                        Blank Page
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                      <input type="checkbox" checked={reuseFirstPage} onChange={(e) => setReuseFirstPage(e.target.checked)} />
                      Reuse page 1 margins & letterhead artwork for continuation pages
                    </label>
                  </div>
                )}

                {((pageCount > 1 && !reuseFirstPage) || (pageCount === 1 && singlePageOverflowMode === 'blank')) && (
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                      {pageCount === 1 ? 'Page 2+ (Blank Page) Margins (pt)' : 'Continuation Page Margins (pt)'}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Top</label>
                        <input type="number" min={0} value={continuationPageMargins.top} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, top: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Bottom</label>
                        <input type="number" min={0} value={continuationPageMargins.bottom} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, bottom: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Left</label>
                        <input type="number" min={0} value={continuationPageMargins.left} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, left: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Right</label>
                        <input type="number" min={0} value={continuationPageMargins.right} onChange={(e) => setContinuationPageMargins({ ...continuationPageMargins, right: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <button type="button" className="btn btn--secondary" onClick={() => setEditingLetterhead(null)} disabled={updatePending}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn--primary" onClick={handleUpdateConfig} disabled={updatePending}>
                    {updatePending ? <Loader2 size={16} className="animate-spin text-forest" /> : 'Save Margins'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hidden { display: none; }
        .text-brand { color: var(--brand, #3b82f6); }
        .grid-responsive-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .grid-responsive-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 768px) {
          .grid-responsive-2col {
            grid-template-columns: 1fr 1fr;
          }
          .grid-responsive-layout {
            grid-template-columns: 1.2fr 1fr;
          }
        }
      `}</style>
    </section>
  )
}
