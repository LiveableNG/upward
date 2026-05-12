'use client'

import React, { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useMutation } from '@tanstack/react-query'
import { Upload, Loader2, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

export function BrandingTab() {
  const { user, refreshUser } = useAuth()
  const { success, error: toastError } = useToast()
  const [uploadingType, setUploadingType] = useState<'header' | 'footer' | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File, type: 'header' | 'footer' }) => {
      setUploadingType(type)
      
      // -- S3 Logic (Commented out for testing) --
      /*
      // 1. Get signed URL
      const { uploadUrl, publicUrl } = await api.getLetterheadUploadUrl({
        type,
        contentType: file.type,
        filename: file.name
      })

      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      // 3. Update PM profile
      const updateData = type === 'header' 
        ? { letterheadHeaderUrl: publicUrl }
        : { letterheadFooterUrl: publicUrl }
        
      await api.updatePmProfile(updateData)
      return publicUrl
      */

      // -- Database/Base64 Logic (For testing without S3 CORS) --
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const updateData = type === 'header' 
              ? { letterheadHeaderUrl: base64 }
              : { letterheadFooterUrl: base64 };
            
            await api.updatePmProfile(updateData);
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
      });
    },
    onSuccess: () => {
      success('Letterhead updated successfully')
      refreshUser()
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to upload image')
    },
    onSettled: () => setUploadingType(null)
  })

  const removeBrandingMutation = useMutation({
    mutationFn: async (type: 'header' | 'footer') => {
      const updateData = type === 'header' 
        ? { letterheadHeaderUrl: null }
        : { letterheadFooterUrl: null }
      await api.updatePmProfile(updateData)
    },
    onSuccess: () => {
      success('Branding removed')
      refreshUser()
    },
    onError: () => toastError('Failed to remove branding')
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'footer') => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toastError('File is too large. Max 5MB.')
        return
      }
      uploadMutation.mutate({ file, type })
    }
  }

  return (
    <div className="branding-settings animate-fade-in">
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Letterhead Branding</h2>
          <p className="settings__section-subtitle">Upload custom headers and footers to be used on your generated documents and reports.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 24 }}>
          {/* Header Upload */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ fontSize: 16, fontWeight: 700 }}>Header Design</h3>
               {user?.letterheadHeaderUrl && <CheckCircle2 size={18} className="text-forest" />}
            </div>
            
            <div 
              style={{ 
                height: 140, 
                background: 'var(--bg)', 
                borderRadius: 16, 
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {user?.letterheadHeaderUrl ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <img 
                    src={user.letterheadHeaderUrl} 
                    alt="Header" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="hover-overlay">
                    <button onClick={() => removeBrandingMutation.mutate('header')} style={{ background: 'white', border: 'none', padding: 8, borderRadius: 8, color: 'var(--clay)', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon size={32} style={{ color: 'var(--border)', marginBottom: 12 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No header uploaded</p>
                </>
              )}
              {uploadingType === 'header' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={24} className="animate-spin text-forest" />
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <input 
                type="file" 
                id="header-input" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'header')}
                disabled={!!uploadingType}
              />
              <label 
                htmlFor="header-input" 
                className="btn btn--secondary" 
                style={{ width: '100%', borderRadius: 12, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
              >
                <Upload size={16} /> {user?.letterheadHeaderUrl ? 'Replace Header' : 'Upload Header'}
              </label>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                Recommended size: 1200x200px (PNG or JPG)
              </p>
            </div>
          </div>

          {/* Footer Upload */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ fontSize: 16, fontWeight: 700 }}>Footer Design</h3>
               {user?.letterheadFooterUrl && <CheckCircle2 size={18} className="text-forest" />}
            </div>
            
            <div 
              style={{ 
                height: 140, 
                background: 'var(--bg)', 
                borderRadius: 16, 
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {user?.letterheadFooterUrl ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <img 
                    src={user.letterheadFooterUrl} 
                    alt="Footer" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="hover-overlay">
                    <button onClick={() => removeBrandingMutation.mutate('footer')} style={{ background: 'white', border: 'none', padding: 8, borderRadius: 8, color: 'var(--clay)', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon size={32} style={{ color: 'var(--border)', marginBottom: 12 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No footer uploaded</p>
                </>
              )}
              {uploadingType === 'footer' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={24} className="animate-spin text-forest" />
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <input 
                type="file" 
                id="footer-input" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'footer')}
                disabled={!!uploadingType}
              />
              <label 
                htmlFor="footer-input" 
                className="btn btn--secondary" 
                style={{ width: '100%', borderRadius: 12, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
              >
                <Upload size={16} /> {user?.letterheadFooterUrl ? 'Replace Footer' : 'Upload Footer'}
              </label>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                Recommended size: 1200x100px (PNG or JPG)
              </p>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {(user?.letterheadHeaderUrl || user?.letterheadFooterUrl) && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20 }}>Preview</h3>
            <div style={{ 
              background: 'white', 
              borderRadius: 24, 
              border: '1px solid var(--border)',
              padding: 40,
              boxShadow: 'var(--shadow-sm)'
            }}>
              {user.letterheadHeaderUrl && (
                <div style={{ borderBottom: '1px solid #eee', paddingBottom: 20, marginBottom: 20, textAlign: 'center' }}>
                  <img src={user.letterheadHeaderUrl} alt="Header Preview" style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ height: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 12, width: '40%', background: '#f1f5f9', borderRadius: 4 }}></div>
                <div style={{ height: 12, width: '90%', background: '#f1f5f9', borderRadius: 4 }}></div>
                <div style={{ height: 12, width: '70%', background: '#f1f5f9', borderRadius: 4 }}></div>
              </div>
              {user.letterheadFooterUrl && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: 20, marginTop: 40, textAlign: 'center' }}>
                  <img src={user.letterheadFooterUrl} alt="Footer Preview" style={{ maxWidth: '100%', maxHeight: 40, objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .hidden { display: none; }
        .branding-settings :global(.hover-overlay:hover) {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
