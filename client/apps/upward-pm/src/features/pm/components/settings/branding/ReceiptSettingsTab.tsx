import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Loader2, Save, UploadCloud, Eye, Image as ImageIcon, CheckCircle2, Paintbrush } from 'lucide-react'

export function ReceiptSettingsTab() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

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
    <div className="receipt-settings animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'flex-start' }}>
      
      {/* ─── CONFIGURATION SECTION ─── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Receipt Branding</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Customize the look and feel of your payment receipts.
          </p>
        </div>

        {/* Logo Configuration */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ImageIcon size={18} /> Receipt Logo
          </h3>
          
          <div style={{ marginTop: 16 }}>
            {logoUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                  <img src={logoUrl} alt="Receipt Logo" style={{ height: 60, objectFit: 'contain', background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
                  <button onClick={() => setLogoUrl('')} className="btn btn--secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    Remove Logo
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  padding: 32, border: '2px dashed var(--border)', borderRadius: 12,
                  background: 'var(--bg)', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <UploadCloud size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Click to upload custom logo</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG or JPG (Max 2MB)</span>
                  <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleLogoUpload} />
                </label>
              )}
            </div>
        </div>

        {/* Theme Color Configuration */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Paintbrush size={18} /> Theme Color
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            This color will replace the default Upward clay color in the receipt header and accents.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input 
              type="color" 
              value={themeColor} 
              onChange={(e) => setThemeColor(e.target.value)}
              style={{ width: 48, height: 48, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
            />
            <input 
              type="text" 
              value={themeColor} 
              onChange={(e) => setThemeColor(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: 120, fontFamily: 'monospace' }}
            />
          </div>
        </div>

        {/* Save Button */}
        <div>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Receipt Settings
          </button>
        </div>
      </section>

      {/* ─── PREVIEW SECTION ─── */}
      <section style={{ position: 'sticky', top: 24, background: '#f8fafc', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={16} /> Live Preview
          </h3>
          {isPreviewLoading && <Loader2 size={14} className="animate-spin text-muted" />}
        </div>
        
        <div style={{ height: 600, background: '#e2e8f0', position: 'relative' }}>
          {previewBlobUrl ? (
            <iframe 
              src={previewBlobUrl + '#toolbar=0&navpanes=0&scrollbar=0'} 
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Receipt Preview"
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin text-muted" size={32} />
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
