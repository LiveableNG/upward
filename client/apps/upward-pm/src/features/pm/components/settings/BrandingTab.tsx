'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/common/Toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Loader2, FileText, Trash2, Layout, Settings, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { LetterheadMarginPreview } from './LetterheadMarginPreview'

// Initialize pdf.js worker using CDN to avoid Next.js bundler worker issues
let pdfjsLib: any = null
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjsLib = pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  })
}

type MarginBox = {
  top: number
  bottom: number
  left: number
  right: number
}

type LetterheadTemplateConfig = {
  first_page?: MarginBox
  continuation_page?: MarginBox
  reuse_first_page_for_continuation?: boolean
}

type SavedPmLetterhead = {
  id: number
  uuid: string
  isDefault: boolean
  pageCount: number
  templateFileKey: string | null
  previewFirstPageKey: string | null
  previewContinuationPageKey: string | null
  templateConfig?: LetterheadTemplateConfig | null
  createdAt: string
}

export function BrandingTab() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  
  // Layout views
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [previewingLetterhead, setPreviewingLetterhead] = useState<SavedPmLetterhead | null>(null)
  
  // File upload state
  const [uploading, setUploading] = useState(false)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [draftObjectUrl, setDraftObjectUrl] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [previewPngUrls, setPreviewPngUrls] = useState<(string | null)[]>([null, null])
  const [previewPagePts, setPreviewPagePts] = useState<[{ width: number; height: number } | null, { width: number; height: number } | null]>([null, null])
  const [previewLoading, setPreviewLoading] = useState(false)
  
  // Form Config states
  const [pageCount, setPageCount] = useState<number>(1)
  const [isDefault, setIsDefault] = useState<boolean>(true)
  const [reuseFirstPage, setReuseFirstPage] = useState<boolean>(true)
  
  // Margins
  const [firstPageMargins, setFirstPageMargins] = useState<MarginBox>({ top: 170, bottom: 110, left: 50, right: 50 })
  const [continuationPageMargins, setContinuationPageMargins] = useState<MarginBox>({ top: 100, bottom: 80, left: 50, right: 50 })

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (draftObjectUrl) {
        URL.revokeObjectURL(draftObjectUrl)
      }
    }
  }, [draftObjectUrl])

  // Process uploaded PDF for preview rendering
  const processPdfFile = async (file: File) => {
    if (!pdfjsLib) {
      toastError('PDF processing engine is still initializing. Please try again in a moment.')
      return
    }

    setPreviewLoading(true)
    setPreviewPngUrls([null, null])
    setPreviewPagePts([null, null])

    const objectUrl = URL.createObjectURL(file)
    setDraftObjectUrl(objectUrl)
    setDraftFile(file)

    try {
      const loadingTask = pdfjsLib.getDocument({ url: objectUrl, disableRange: true, disableStream: true })
      const pdf = await loadingTask.promise
      const pagesCount = pdf.numPages
      setPdfPageCount(pagesCount)
      setPageCount(Math.min(2, pagesCount))

      const images: (string | null)[] = [null, null]
      const dimensions: [{ width: number; height: number } | null, { width: number; height: number } | null] = [null, null]

      // Render first page preview
      const page1 = await pdf.getPage(1)
      const viewport1 = page1.getViewport({ scale: 0.6 })
      const canvas1 = document.createElement('canvas')
      canvas1.width = viewport1.width
      canvas1.height = viewport1.height
      const ctx1 = canvas1.getContext('2d')
      if (ctx1) {
        await page1.render({ canvasContext: ctx1, viewport: viewport1 }).promise
        images[0] = canvas1.toDataURL('image/png')
        dimensions[0] = { width: page1.getViewport({ scale: 1 }).width, height: page1.getViewport({ scale: 1 }).height }
      }

      // Render second page preview if available
      if (pagesCount >= 2) {
        const page2 = await pdf.getPage(2)
        const viewport2 = page2.getViewport({ scale: 0.6 })
        const canvas2 = document.createElement('canvas')
        canvas2.width = viewport2.width
        canvas2.height = viewport2.height
        const ctx2 = canvas2.getContext('2d')
        if (ctx2) {
          await page2.render({ canvasContext: ctx2, viewport: viewport2 }).promise
          images[1] = canvas2.toDataURL('image/png')
          dimensions[1] = { width: page2.getViewport({ scale: 1 }).width, height: page2.getViewport({ scale: 1 }).height }
        }
      }

      setPreviewPngUrls(images)
      setPreviewPagePts(dimensions)
      success('Template PDF parsed successfully!')
    } catch (err: any) {
      console.error(err)
      toastError('Failed to parse PDF pages for preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Fetch saved configurations
  const { data: letterheads = [], isLoading } = useQuery<SavedPmLetterhead[]>({
    queryKey: ['letterheads'],
    queryFn: async () => {
      return api.fetchLetterheads()
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.saveLetterhead(payload)
    },
    onSuccess: () => {
      success('Letterhead configuration saved successfully')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
      resetForm()
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to save letterhead')
    }
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.setDefaultLetterhead(id)
    },
    onSuccess: () => {
      success('Default letterhead updated')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
    },
    onError: () => toastError('Failed to update default letterhead')
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.deleteLetterhead(id)
    },
    onSuccess: () => {
      success('Letterhead deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
    },
    onError: () => toastError('Failed to delete letterhead')
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toastError('Please choose a valid PDF file.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toastError('File is too large. Max 10MB.')
        return
      }
      await processPdfFile(file)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftFile) {
      toastError('Please choose a PDF template file.')
      return
    }

    setUploading(true)
    try {
      // 1. Upload main template PDF
      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(draftFile)
      })

      const pdfUpload = await api.uploadLetterhead({
        type: 'template_pdf',
        base64Data: pdfBase64,
        contentType: 'application/pdf',
      })

      // 2. Upload PNG previews for fast client loading
      let previewFirstPageKey: string | null = null
      let previewContinuationPageKey: string | null = null

      if (previewPngUrls[0]) {
        const img1Base64 = previewPngUrls[0].split(',')[1]
        const upload1 = await api.uploadLetterhead({
          type: 'preview_page_1',
          base64Data: img1Base64,
          contentType: 'image/png'
        })
        previewFirstPageKey = upload1.publicUrl.includes('amazonaws.com/') 
          ? upload1.publicUrl.split('amazonaws.com/')[1] 
          : upload1.publicUrl
      }

      if (previewPngUrls[1] && pageCount >= 2 && !reuseFirstPage) {
        const img2Base64 = previewPngUrls[1].split(',')[1]
        const upload2 = await api.uploadLetterhead({
          type: 'preview_page_2',
          base64Data: img2Base64,
          contentType: 'image/png'
        })
        previewContinuationPageKey = upload2.publicUrl.includes('amazonaws.com/') 
          ? upload2.publicUrl.split('amazonaws.com/')[1] 
          : upload2.publicUrl
      }

      const templateFileKey = pdfUpload.publicUrl.includes('amazonaws.com/') 
        ? pdfUpload.publicUrl.split('amazonaws.com/')[1] 
        : pdfUpload.publicUrl

      const payload = {
        templateFileKey,
        previewFirstPageKey,
        previewContinuationPageKey,
        pageCount,
        isDefault,
        templateConfig: {
          first_page: firstPageMargins,
          continuation_page: reuseFirstPage ? firstPageMargins : continuationPageMargins,
          reuse_first_page_for_continuation: reuseFirstPage,
        }
      }

      saveMutation.mutate(payload)
    } catch (err: any) {
      toastError(err.message || 'Failed to upload configuration files')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setShowCreateForm(false)
    setDraftFile(null)
    setDraftObjectUrl(null)
    setPdfPageCount(null)
    setPreviewPngUrls([null, null])
    setPreviewPagePts([null, null])
    setPageCount(1)
    setIsDefault(true)
    setReuseFirstPage(true)
    setFirstPageMargins({ top: 170, bottom: 110, left: 50, right: 50 })
    setContinuationPageMargins({ top: 100, bottom: 80, left: 50, right: 50 })
  }

  return (
    <div className="branding-settings animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      <section className="settings__section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Letterhead Design Configurations</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upload S3 PDF background templates and configure custom printable page margins.</p>
          </div>
          {!showCreateForm && (
            <button className="btn btn--primary" onClick={() => setShowCreateForm(true)}>
              Add Configuration
            </button>
          )}
        </div>

        {showCreateForm ? (
          <form onSubmit={handleSaveConfig} className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Letterhead Template</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* File Upload */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Upload PDF Template</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="file" id="pdf-input" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading || previewLoading} />
                  <label htmlFor="pdf-input" className="btn btn--secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 12 }}>
                    {previewLoading ? <Loader2 size={16} className="animate-spin text-forest" /> : <Upload size={16} />}
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

              {/* Basic Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Template Page Count</label>
                  <select value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                    <option value={1}>1 Page Template</option>
                    <option value={2}>2+ Pages Template</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Options</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 44 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                      Set as Default
                    </label>
                    {pageCount > 1 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={reuseFirstPage} onChange={(e) => setReuseFirstPage(e.target.checked)} />
                        Reuse First Page
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Margins Drag & Drop Visual Editor */}
              {previewPngUrls[0] && previewPagePts[0] && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Settings size={16} /> Interactive Visual Margin Editor
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
                    {/* Page 1 Config */}
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

                    {/* Page 2 Config (if multiple page letterhead and not reusing) */}
                    {pageCount > 1 && !reuseFirstPage && previewPngUrls[1] && previewPagePts[1] && (
                      <div>
                        <LetterheadMarginPreview
                          imageSrc={previewPngUrls[1]}
                          pageWidthPt={previewPagePts[1].width}
                          pageHeightPt={previewPagePts[1].height}
                          previewScale={0.6}
                          margins={continuationPageMargins}
                          onChange={setContinuationPageMargins}
                          caption="Continuation Pages Layout"
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

              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <button type="button" className="btn btn--secondary" onClick={resetForm} disabled={saveMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={saveMutation.isPending || uploading || previewLoading}>
                  {saveMutation.isPending || uploading ? <Loader2 size={16} className="animate-spin text-forest" /> : 'Save Letterhead'}
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
                      {!lh.isDefault && (
                        <button className="btn btn--secondary" style={{ fontSize: 12, height: 32, padding: '0 10px' }} onClick={() => setDefaultMutation.mutate(lh.id)}>
                          Set Default
                        </button>
                      )}
                      <button className="btn btn--secondary" style={{ fontSize: 12, height: 32, padding: '0 10px', color: 'var(--clay)' }} onClick={() => deleteMutation.mutate(lh.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        .hidden { display: none; }
        .text-brand { color: var(--brand, #3b82f6); }
      `}</style>
    </div>
  )
}
