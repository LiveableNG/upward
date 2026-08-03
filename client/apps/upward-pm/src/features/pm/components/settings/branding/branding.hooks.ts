'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import { downloadBlob } from '@/lib/download-helper'
import type { MarginBox, SavedPmLetterhead } from '../branding.types'

// ---------------------------------------------------------------------------
// PDF.js — lazy loaded once, shared across the whole branding module
// ---------------------------------------------------------------------------
let pdfjsLib: any = null
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjsLib = pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  })
}

// ---------------------------------------------------------------------------
// Letterhead hooks
// ---------------------------------------------------------------------------

export function useLetterheads() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

  const { data: letterheads = [], isLoading } = useQuery<SavedPmLetterhead[]>({
    queryKey: ['letterheads'],
    queryFn: () => api.fetchLetterheads(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.saveLetterhead(payload),
    onSuccess: () => {
      success('Letterhead saved successfully')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
    },
    onError: (err: any) => toastError(err.message || 'Failed to save letterhead'),
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.setDefaultLetterhead(id),
    onSuccess: () => {
      success('Default letterhead updated')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
    },
    onError: () => toastError('Failed to update default letterhead'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteLetterhead(id),
    onSuccess: () => {
      success('Letterhead deleted')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
    },
    onError: () => toastError('Failed to delete letterhead'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.patch(`/pm/letterheads/${id}`, payload),
    onSuccess: () => {
      success('Letterhead updated successfully')
      queryClient.invalidateQueries({ queryKey: ['letterheads'] })
    },
    onError: (err: any) => toastError(err.message || 'Failed to update letterhead'),
  })

  return {
    letterheads,
    isLoading,
    saveMutation,
    setDefaultMutation,
    deleteMutation,
    updateMutation,
  }
}

// ---------------------------------------------------------------------------
// Signature hooks
// ---------------------------------------------------------------------------

export function useSignatures() {
  const { success, error: toastError } = useToast()

  const { data: signatures = [], isLoading: signaturesLoading, refetch: refetchSignatures } =
    useQuery<any[]>({
      queryKey: ['signatures'],
      queryFn: () => api.fetchSignatures(),
    })

  const saveSigMutation = useMutation({
    mutationFn: (payload: any) => api.saveSignature(payload),
    onSuccess: () => {
      success('Signature saved successfully!')
      refetchSignatures()
    },
    onError: (err: any) => toastError(err.message || 'Failed to save signature'),
  })

  const setDefaultSigMutation = useMutation({
    mutationFn: (id: number) => api.setDefaultSignature(id),
    onSuccess: () => {
      success('Default signature updated')
      refetchSignatures()
    },
    onError: () => toastError('Failed to update default signature'),
  })

  const deleteSigMutation = useMutation({
    mutationFn: (id: number) => api.deleteSignature(id),
    onSuccess: () => {
      success('Signature deleted')
      refetchSignatures()
    },
    onError: () => toastError('Failed to delete signature'),
  })

  return {
    signatures,
    signaturesLoading,
    refetchSignatures,
    saveSigMutation,
    setDefaultSigMutation,
    deleteSigMutation,
  }
}

// ---------------------------------------------------------------------------
// PDF processing hook
// ---------------------------------------------------------------------------

export function usePdfProcessor() {
  const { success, error: toastError } = useToast()

  const [uploading, setUploading] = useState(false)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [draftObjectUrl, setDraftObjectUrl] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [previewPngUrls, setPreviewPngUrls] = useState<(string | null)[]>([null, null])
  const [previewPagePts, setPreviewPagePts] = useState<
    [{ width: number; height: number } | null, { width: number; height: number } | null]
  >([null, null])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (draftObjectUrl) URL.revokeObjectURL(draftObjectUrl)
    }
  }, [draftObjectUrl])

  const processPdfFile = async (file: File) => {
    if (!pdfjsLib) {
      toastError('PDF engine still initialising. Please try again in a moment.')
      return
    }
    setPreviewLoading(true)
    setPreviewPngUrls([null, null])
    setPreviewPagePts([null, null])

    const objectUrl = URL.createObjectURL(file)
    setDraftObjectUrl(objectUrl)
    setDraftFile(file)

    try {
      const pdf = await pdfjsLib
        .getDocument({ url: objectUrl, disableRange: true, disableStream: true })
        .promise
      const pagesCount = pdf.numPages
      setPdfPageCount(pagesCount)

      const images: (string | null)[] = [null, null]
      const dimensions: [
        { width: number; height: number } | null,
        { width: number; height: number } | null,
      ] = [null, null]

      const page1 = await pdf.getPage(1)
      const vp1 = page1.getViewport({ scale: 0.6 })
      const c1 = document.createElement('canvas')
      c1.width = vp1.width
      c1.height = vp1.height
      const ctx1 = c1.getContext('2d')
      if (ctx1) {
        await page1.render({ canvasContext: ctx1, viewport: vp1 }).promise
        images[0] = c1.toDataURL('image/png')
        dimensions[0] = {
          width: page1.getViewport({ scale: 1 }).width,
          height: page1.getViewport({ scale: 1 }).height,
        }
      }

      if (pagesCount >= 2) {
        const page2 = await pdf.getPage(2)
        const vp2 = page2.getViewport({ scale: 0.6 })
        const c2 = document.createElement('canvas')
        c2.width = vp2.width
        c2.height = vp2.height
        const ctx2 = c2.getContext('2d')
        if (ctx2) {
          await page2.render({ canvasContext: ctx2, viewport: vp2 }).promise
          images[1] = c2.toDataURL('image/png')
          dimensions[1] = {
            width: page2.getViewport({ scale: 1 }).width,
            height: page2.getViewport({ scale: 1 }).height,
          }
        }
      }

      setPreviewPngUrls(images)
      setPreviewPagePts(dimensions)
      success('PDF parsed successfully!')
    } catch (err: any) {
      console.error(err)
      toastError('Failed to parse PDF pages for preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
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

  const resetDraft = () => {
    setDraftFile(null)
    setDraftObjectUrl(null)
    setPdfPageCount(null)
    setPreviewPngUrls([null, null])
    setPreviewPagePts([null, null])
  }

  const handleDownloadJsonConfig = (
    pageCount: number,
    firstPageMargins: MarginBox,
    continuationPageMargins: MarginBox,
    reuseFirstPage: boolean,
    singlePageOverflowMode: 'reuse' | 'blank',
  ) => {
    if (!draftFile) {
      toastError('Please upload a PDF template first.')
      return
    }
    const isReuse = pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage
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
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    downloadBlob(blob, 'letterhead-template-config.json')
      .then(() => success('Configuration exported.'))
      .catch((err) => console.error(err))
  }

  const uploadLetterheadFiles = async (
    pageCount: number,
    firstPageMargins: MarginBox,
    continuationPageMargins: MarginBox,
    reuseFirstPage: boolean,
    singlePageOverflowMode: 'reuse' | 'blank',
    isDefault: boolean,
  ) => {
    if (!draftFile) throw new Error('No PDF file selected.')

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

    let previewFirstPageKey: string | null = null
    let previewContinuationPageKey: string | null = null

    if (previewPngUrls[0]) {
      const img1Base64 = previewPngUrls[0].split(',')[1]
      const upload1 = await api.uploadLetterhead({
        type: 'preview_page_1',
        base64Data: img1Base64,
        contentType: 'image/png',
      })
      previewFirstPageKey = upload1.publicUrl.includes('amazonaws.com/')
        ? upload1.publicUrl.split('amazonaws.com/')[1]
        : upload1.publicUrl
    }

    const isReuse = pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage

    if (previewPngUrls[1] && pageCount >= 2 && !isReuse) {
      const img2Base64 = previewPngUrls[1].split(',')[1]
      const upload2 = await api.uploadLetterhead({
        type: 'preview_page_2',
        base64Data: img2Base64,
        contentType: 'image/png',
      })
      previewContinuationPageKey = upload2.publicUrl.includes('amazonaws.com/')
        ? upload2.publicUrl.split('amazonaws.com/')[1]
        : upload2.publicUrl
    }

    const templateFileKey = pdfUpload.publicUrl.includes('amazonaws.com/')
      ? pdfUpload.publicUrl.split('amazonaws.com/')[1]
      : pdfUpload.publicUrl

    return {
      templateFileKey,
      previewFirstPageKey,
      previewContinuationPageKey,
      pageCount,
      isDefault,
      templateConfig: {
        first_page: firstPageMargins,
        continuation_page: isReuse ? firstPageMargins : continuationPageMargins,
        reuse_first_page_for_continuation: isReuse,
      },
    }
  }

  return {
    uploading,
    setUploading,
    draftFile,
    draftObjectUrl,
    pdfPageCount,
    previewPngUrls,
    previewPagePts,
    previewLoading,
    handleFileUpload,
    resetDraft,
    handleDownloadJsonConfig,
    uploadLetterheadFiles,
  }
}

// ---------------------------------------------------------------------------
// Signature canvas hook
// ---------------------------------------------------------------------------

export function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e3a8a'
    const rect = canvas.getBoundingClientRect()
    let x: number, y: number
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

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    let x: number, y: number
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

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const isCanvasBlank = () => {
    const canvas = canvasRef.current
    if (!canvas) return true
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    return !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((ch) => ch !== 0)
  }

  const getCanvasDataUrl = () => {
    return canvasRef.current?.toDataURL('image/png') ?? null
  }

  return { canvasRef, startDrawing, draw, stopDrawing, clearCanvas, isCanvasBlank, getCanvasDataUrl }
}
