'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/common/Toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Loader2, FileText, Trash2, Layout, Settings, Eye, PenTool, Type, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { downloadBlob } from '@/lib/download-helper'
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
  previewFirstPageUrl?: string | null
  previewContinuationPageUrl?: string | null
}

function createBlankPagePreviewDataUrl(
  pageWidthPt: number,
  pageHeightPt: number,
  scale = 0.6
): string {
  const w = Math.max(1, Math.round(pageWidthPt * scale));
  const h = Math.max(1, Math.round(pageHeightPt * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#64748b';
  ctx.font = `600 ${Math.max(11, Math.round(w * 0.028))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Blank page — page 2 and beyond', w / 2, Math.min(h * 0.12, 48));
  ctx.font = `${Math.max(10, Math.round(w * 0.022))}px system-ui, sans-serif`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('No letterhead artwork', w / 2, Math.min(h * 0.12, 48) + Math.max(14, w * 0.03));
  return canvas.toDataURL('image/png');
}

export function BrandingTab() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  
  // Layout views
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [previewingLetterhead, setPreviewingLetterhead] = useState<SavedPmLetterhead | null>(null)
  const [editingLetterhead, setEditingLetterhead] = useState<SavedPmLetterhead | null>(null)
  
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
  const [singlePageOverflowMode, setSinglePageOverflowMode] = useState<'reuse' | 'blank'>('blank')
  
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

  // Cursive Fonts Injection
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link')
      link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Great+Vibes&family=Caveat:wght@700&display=swap'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
  }, [])

  // Signature States
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [sigType, setSigType] = useState<'pad' | 'upload' | 'digital'>('pad')
  const [sigName, setSigName] = useState('')
  const [typedText, setTypedText] = useState('')
  const [selectedFont, setSelectedFont] = useState("'Dancing Script', cursive")
  const [uploadedSigFile, setUploadedSigFile] = useState<File | null>(null)
  const [uploadedSigPreview, setUploadedSigPreview] = useState<string | null>(null)
  const [sigSaving, setSigSaving] = useState(false)

  // Query & Mutations for Signatures
  const { data: signatures = [], refetch: refetchSignatures, isLoading: signaturesLoading } = useQuery<any[]>({
    queryKey: ['signatures'],
    queryFn: async () => {
      return api.fetchSignatures()
    }
  })

  const saveSigMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.saveSignature(payload)
    },
    onSuccess: () => {
      success('Signature saved successfully!')
      refetchSignatures()
      setSigName('')
      setTypedText('')
      setUploadedSigFile(null)
      setUploadedSigPreview(null)
      clearCanvas()
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to save signature')
    }
  })

  const setDefaultSigMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.setDefaultSignature(id)
    },
    onSuccess: () => {
      success('Default signature updated')
      refetchSignatures()
    },
    onError: () => toastError('Failed to update default signature')
  })

  const deleteSigMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.deleteSignature(id)
    },
    onSuccess: () => {
      success('Signature deleted successfully')
      refetchSignatures()
    },
    onError: () => toastError('Failed to delete signature')
  })

  // Canvas Drawing Actions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e3a8a'

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toastError('Please choose a valid image file.')
        return
      }
      setUploadedSigFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setUploadedSigPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sigName.trim()) {
      toastError('Please enter a signature name.')
      return
    }

    setSigSaving(true)
    try {
      if (sigType === 'pad') {
        const canvas = canvasRef.current
        if (!canvas) {
          setSigSaving(false)
          return
        }
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setSigSaving(false)
          return
        }
        const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const isCanvasBlank = !buffer.data.some(channel => channel !== 0)
        if (isCanvasBlank) {
          toastError('Please draw your signature before saving.')
          setSigSaving(false)
          return
        }

        const dataUrl = canvas.toDataURL('image/png')
        const base64Data = dataUrl.split(',')[1]
        const uploadRes = await api.uploadSignature({
          base64Data,
          contentType: 'image/png'
        })

        await saveSigMutation.mutateAsync({
          name: sigName,
          type: 'pad',
          fileKey: uploadRes.fileKey,
          isDefault: signatures.length === 0,
        })
      } else if (sigType === 'upload') {
        if (!uploadedSigPreview) {
          toastError('Please select or drag a signature image file.')
          setSigSaving(false)
          return
        }

        const base64Data = uploadedSigPreview.split(',')[1]
        const uploadRes = await api.uploadSignature({
          base64Data,
          contentType: uploadedSigFile?.type || 'image/png'
        })

        await saveSigMutation.mutateAsync({
          name: sigName,
          type: 'upload',
          fileKey: uploadRes.fileKey,
          isDefault: signatures.length === 0,
        })
      } else if (sigType === 'digital') {
        if (!typedText.trim()) {
          toastError('Please type your signature.')
          setSigSaving(false)
          return
        }

        const stylizedHtml = `<span style="font-family: ${selectedFont}; font-size: 28px; color: #1e3a8a; font-weight: bold; display: inline-block;">${typedText}</span>`

        await saveSigMutation.mutateAsync({
          name: sigName,
          type: 'digital',
          content: stylizedHtml,
          isDefault: signatures.length === 0,
        })
      }
    } catch (err: any) {
      console.error(err)
      toastError(err.message || 'Failed to save signature')
    } finally {
      setSigSaving(false)
    }
  }

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      return api.patch(`/pm/letterheads/${id}`, payload)
    },
    onSuccess: () => {
      success('Letterhead margins updated successfully')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
      setEditingLetterhead(null)
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update letterhead margins')
    }
  })

  const handleUpdateConfig = () => {
    if (!editingLetterhead) return

    const isReuse = pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage;

    const payload = {
      templateConfig: {
        first_page: firstPageMargins,
        continuation_page: isReuse ? firstPageMargins : continuationPageMargins,
        reuse_first_page_for_continuation: isReuse,
      }
    }

    updateMutation.mutate({ id: editingLetterhead.id, payload })
  }

  const handleStartEditMargins = (lh: SavedPmLetterhead) => {
    setEditingLetterhead(lh)
    setFirstPageMargins(lh.templateConfig?.first_page || { top: 170, bottom: 110, left: 50, right: 50 })
    setContinuationPageMargins(lh.templateConfig?.continuation_page || { top: 100, bottom: 80, left: 50, right: 50 })
    const isReuse = lh.templateConfig?.reuse_first_page_for_continuation !== false;
    setReuseFirstPage(isReuse)
    setSinglePageOverflowMode(isReuse ? 'reuse' : 'blank')
    setPageCount(lh.pageCount)
  }

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

      const isReuse = pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage;

      const payload = {
        templateFileKey,
        previewFirstPageKey,
        previewContinuationPageKey,
        pageCount,
        isDefault,
        templateConfig: {
          first_page: firstPageMargins,
          continuation_page: isReuse ? firstPageMargins : continuationPageMargins,
          reuse_first_page_for_continuation: isReuse,
        }
      }

      saveMutation.mutate(payload)
    } catch (err: any) {
      toastError(err.message || 'Failed to upload configuration files')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadJsonConfig = () => {
    if (!draftFile) {
      toastError('Please upload a PDF template first.')
      return
    }
    const isReuse = pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage;
    
    const exportPayload = {
      version: 1,
      sourceFileName: draftFile.name,
      pageCount,
      templateConfig: {
        first_page: firstPageMargins,
        continuation_page: isReuse ? firstPageMargins : continuationPageMargins,
        reuse_first_page_for_continuation: isReuse,
      },
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'letterhead-template-config.json').then(() => {
      success('Configuration exported successfully.');
    }).catch(err => console.error(err));
  };

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

                    {/* Page 2 Config (if multiple page letterhead and not reusing, or 1-page letterhead in blank page continuation mode) */}
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
                          caption={pageCount === 1 ? "Page 2+ (Blank Page) Layout" : "Continuation Pages Layout"}
                          helperText={pageCount === 1 ? "Overflow pages use plain paper. Drag handles to set where text can go." : undefined}
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
                {draftFile && (
                  <button type="button" className="btn btn--secondary" onClick={handleDownloadJsonConfig} style={{ marginRight: 'auto' }}>
                    Download JSON Config
                  </button>
                )}
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
                      <button className="btn btn--secondary" style={{ fontSize: 12, height: 32, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleStartEditMargins(lh)}>
                        <Settings size={14} /> Edit Margins
                      </button>
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

      {/* Signature Configuration Section */}
      <section className="glass" style={{ padding: 32, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)', marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Signature Configurations</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Configure your drawn, uploaded, or typed signature to sign documents.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 32 }}>
          {/* Create Signature Form */}
          <form onSubmit={handleSaveSignature} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Signature Name</label>
              <input
                type="text"
                placeholder="e.g. CEO Signature, Digital Sign"
                value={sigName}
                onChange={(e) => setSigName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Signature Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`btn ${sigType === 'pad' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, height: 38 }}
                  onClick={() => setSigType('pad')}
                >
                  <PenTool size={14} /> Draw Pad
                </button>
                <button
                  type="button"
                  className={`btn ${sigType === 'digital' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, height: 38 }}
                  onClick={() => setSigType('digital')}
                >
                  <Type size={14} /> Type Digital
                </button>
                <button
                  type="button"
                  className={`btn ${sigType === 'upload' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, height: 38 }}
                  onClick={() => setSigType('upload')}
                >
                  <Upload size={14} /> Upload File
                </button>
              </div>
            </div>

            {sigType === 'pad' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Draw Signature below</label>
                <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    style={{ display: 'block', width: '100%', height: 160, cursor: 'crosshair' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary"
                    style={{ position: 'absolute', bottom: 8, right: 8, height: 28, fontSize: 11, padding: '0 8px' }}
                    onClick={clearCanvas}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {sigType === 'digital' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Type Signature</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Choose Font Style</label>
                  <select
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  >
                    <option value="'Dancing Script', cursive">Dancing Script</option>
                    <option value="'Pacifico', cursive">Pacifico</option>
                    <option value="'Great Vibes', cursive">Great Vibes</option>
                    <option value="'Caveat', cursive">Caveat</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Preview</label>
                  <div style={{
                    padding: 24,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: '#f8fafc',
                    textAlign: 'center',
                    minHeight: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: selectedFont,
                    fontSize: 28,
                    color: '#1e3a8a'
                  }}>
                    {typedText || 'Signature Preview'}
                  </div>
                </div>
              </div>
            )}

            {sigType === 'upload' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Upload Image File</label>
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureFileChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  {uploadedSigPreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <img src={uploadedSigPreview} alt="Signature Upload Preview" style={{ maxHeight: 100, objectFit: 'contain' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to replace file</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Click to browse signature image</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supports PNG, JPG (Max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={sigSaving || saveSigMutation.isPending}
            >
              {sigSaving ? (
                <Loader2 size={16} className="animate-spin text-forest" />
              ) : (
                'Save Signature'
              )}
            </button>
          </form>

          {/* List of Configured Signatures */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Configured Signatures</h4>
            {signaturesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={24} className="animate-spin text-forest" />
              </div>
            ) : signatures.length === 0 ? (
              <div style={{ padding: 40, border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center', background: 'var(--bg)' }}>
                <PenTool size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No signatures configured yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {signatures.map((sig) => (
                  <div key={sig.id} className="glass" style={{
                    padding: 16,
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    background: sig.isDefault ? 'rgba(var(--brand-rgb, 59, 130, 246), 0.03)' : 'var(--bg-card)',
                    borderColor: sig.isDefault ? 'var(--brand, #3b82f6)' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Preview signature */}
                      <div style={{
                        width: 120,
                        height: 60,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: 4
                      }}>
                        {sig.type === 'digital' ? (
                          <div dangerouslySetInnerHTML={{ __html: sig.content }} style={{ transform: 'scale(0.8)', transformOrigin: 'center' }} />
                        ) : (
                          <img src={sig.fileUrl} alt={sig.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h5 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{sig.name}</h5>
                          {sig.isDefault && (
                            <span style={{ fontSize: 9, background: 'var(--brand, #3b82f6)', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                              Default
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type: {sig.type}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {!sig.isDefault && (
                        <button
                          className="btn btn--secondary"
                          style={{ fontSize: 11, height: 28, padding: '0 8px' }}
                          onClick={() => setDefaultSigMutation.mutate(sig.id)}
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        className="btn btn--secondary"
                        style={{ fontSize: 11, height: 28, padding: '0 8px', color: 'var(--clay)' }}
                        onClick={() => deleteSigMutation.mutate(sig.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>


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

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
              {/* Visual preview */}
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
                    caption={pageCount === 1 ? "Page 2+ (Blank Page) Layout" : "Continuation Pages Layout"}
                    helperText={pageCount === 1 ? "Overflow pages use plain paper. Drag handles to set where text can go." : undefined}
                  />
                )}
              </div>

              {/* Numeric margin forms */}
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
                      {pageCount === 1 ? "Page 2+ (Blank Page) Margins (pt)" : "Continuation Page Margins (pt)"}
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
                  <button 
                    type="button" 
                    className="btn btn--secondary" 
                    onClick={() => setEditingLetterhead(null)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn--primary" 
                    onClick={handleUpdateConfig}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 size={16} className="animate-spin text-forest" /> : 'Save Margins'}
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
      `}</style>
    </div>
  )
}
