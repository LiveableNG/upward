import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Loader2, Save, UploadCloud, Eye, Image as ImageIcon, CheckCircle2, Paintbrush } from 'lucide-react'
import { useSubscription } from '@/features/pm/hooks/useSubscription'
import { usePricingModal } from '@/features/pm/hooks/usePricingModal'
import { FeatureKey } from '@/features/pm/types/subscription'

export function ReceiptSettingsTab() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const { checkAccess } = useSubscription()
  const { openPricing } = usePricingModal()
  const hasBrandingAccess = checkAccess(FeatureKey.BRANDING).hasAccess

  const [logoUrl, setLogoUrl] = useState<string>('')
  const [themeColor, setThemeColor] = useState<string>('#d97757')
  
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['pmReceiptSettings'],
    queryFn: api.getReceiptSettings,
  })

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logoUrl || '')
      setThemeColor(settings.themeColor || '#d97757')
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: api.updateReceiptSettings,
    onSuccess: () => {
      success('Receipt settings saved successfully.')
      queryClient.invalidateQueries({ queryKey: ['pmReceiptSettings'] })
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to save receipt settings.')
    }
  })

  const previewMutation = useMutation({
    mutationFn: api.previewReceipt,
    onMutate: () => setIsPreviewLoading(true),
    onSuccess: (blob) => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      const url = URL.createObjectURL(blob)
      setPreviewBlobUrl(url)
      setIsPreviewLoading(false)
    },
    onError: () => {
      setIsPreviewLoading(false)
      toastError('Failed to generate preview.')
    }
  })

  // Debounce the preview update
  useEffect(() => {
    if (isLoading) return
    const timer = setTimeout(() => {
      previewMutation.mutate({ logoUrl, useEmailLogo: false, themeColor })
    }, 800)
    return () => clearTimeout(timer)
  }, [logoUrl, themeColor, isLoading])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasBrandingAccess) {
      e.target.value = ''
      openPricing()
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toastError('Logo must be less than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const resultString = event.target?.result as string
      const base64Data = resultString.includes(',') ? resultString.split(',')[1] : resultString
      try {
        const res = await api.uploadReceiptLogo({
          base64Data,
          contentType: file.type,
        })
        setLogoUrl(res.publicUrl)
      } catch (err: any) {
        toastError(err?.message || 'Failed to upload logo.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!hasBrandingAccess) {
      openPricing()
      return
    }
    saveMutation.mutate({ logoUrl, useEmailLogo: false, themeColor })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    )
  }

  return (
    <div className="receipt-branding animate-fade-in">
      
      {/* ─── CONFIGURATION SECTION ─── */}
      <section className="receipt-branding__config">
        <div className="receipt-branding__header">
          <h2>Receipt Branding</h2>
          <p>
            Customize the look and feel of your payment receipts.
          </p>
        </div>

        <div className="receipt-branding__row">
          {/* Logo Configuration */}
          <div className="receipt-branding__card">
            <h3>
              <ImageIcon size={18} /> Receipt Logo
            </h3>
            
            <div className="receipt-branding__logo-container">
              {logoUrl ? (
                <div className="receipt-branding__logo-preview-wrapper">
                  <img src={logoUrl} alt="Receipt Logo" className="receipt-branding__logo-img" />
                  <button onClick={() => setLogoUrl('')} className="btn btn--secondary receipt-branding__logo-remove-btn">
                    Remove Logo
                  </button>
                </div>
              ) : (
                <label className="receipt-branding__upload-zone">
                  <UploadCloud size={20} color="var(--forest)" />
                  <div className="receipt-branding__upload-text">
                    <span className="receipt-branding__upload-title">Click to upload custom logo</span>
                    <span className="receipt-branding__upload-desc">PNG or JPG (Max 2MB)</span>
                  </div>
                  <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleLogoUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Theme Color Configuration */}
          <div className="receipt-branding__card">
            <h3>
              <Paintbrush size={18} /> Theme Color
            </h3>
            <p className="receipt-branding__card-desc">
              Replaces the default Upward clay color in the receipt header and accents.
            </p>
            <div className="receipt-branding__color-inputs">
              <input 
                type="color" 
                value={themeColor} 
                onChange={(e) => setThemeColor(e.target.value)}
                className="receipt-branding__color-picker"
              />
              <input 
                type="text" 
                value={themeColor} 
                onChange={(e) => setThemeColor(e.target.value)}
                className="receipt-branding__color-text"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="receipt-branding__actions">
          <button
            className="btn btn--primary receipt-branding__save-btn"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Receipt Settings
          </button>
        </div>
      </section>

      {/* ─── PREVIEW SECTION ─── */}
      <section className="receipt-branding__preview">
        <div className="receipt-branding__preview-header">
          <h3>
            <Eye size={16} /> Live Preview
          </h3>
          {isPreviewLoading && <Loader2 size={14} className="animate-spin text-muted" />}
        </div>
        
        <div className="receipt-branding__preview-frame">
          {previewBlobUrl ? (
            <iframe 
              src={previewBlobUrl + '#toolbar=0&navpanes=0&scrollbar=0'} 
              className="receipt-branding__iframe"
              title="Receipt Preview"
            />
          ) : (
            <div className="receipt-branding__loader-wrapper">
              <Loader2 className="animate-spin text-muted" size={32} />
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
