'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ShieldCheck, Upload, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'

const verificationSchema = z.object({
  idType: z.enum(['NIN', 'BVN', 'CAC']),
  idNumber: z.string().min(10, 'ID Number must be at least 10 digits'),
})

type VerificationFormData = z.infer<typeof verificationSchema>

export function VerificationForm({ onSuccess, isAuthFlow = false }: { onSuccess?: () => void, isAuthFlow?: boolean }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema)
  })

  const onSubmit = async (data: VerificationFormData) => {
    setIsSubmitting(true)
    try {
      // In a real app we'd upload the file to S3 first or send as multipart
      // For now we'll just send the text data
      await api.submitVerification({
          ...data,
          idImage: file ? 'pending_upload' : null // Placeholder
      })
      toastSuccess('Verification details submitted! We will review them shortly.')
      onSuccess?.()
    } catch (err: any) {
      toastError(err.message || 'Failed to submit verification')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={isAuthFlow ? "" : "animate-fade-in"} style={isAuthFlow ? { width: '100%' } : { 
        maxWidth: 500, 
        margin: '40px auto',
        background: 'white',
        padding: 40,
        borderRadius: 24,
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)'
    }}>
      <div className={isAuthFlow ? "auth-header" : ""} style={isAuthFlow ? {} : { textAlign: 'center', marginBottom: 32 }}>
        <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: 20, 
            background: 'rgba(34, 197, 94, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: isAuthFlow ? '0 0 24px' : '0 auto 16px',
            color: 'var(--forest)'
        }}>
            <ShieldCheck size={32} />
        </div>
        <h2 className={isAuthFlow ? "auth-card__title" : ""} style={isAuthFlow ? {} : { fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
          Identity Verification
        </h2>
        <p className={isAuthFlow ? "auth-card__subtitle" : ""} style={isAuthFlow ? {} : { color: 'var(--text-muted)', fontSize: 14 }}>
            To comply with Nigerian regulations and protect our community, please verify your identity.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label className="form-label">ID Type</label>
          <select 
            {...register('idType')} 
            className="form-input"
            style={isAuthFlow ? {} : { width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border)' }}
          >
            <option value="NIN">National Identity Number (NIN)</option>
            <option value="BVN">Bank Verification Number (BVN)</option>
            <option value="CAC">CAC Registration Number</option>
          </select>
          {errors.idType && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.idType.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">ID Number</label>
          <input 
            {...register('idNumber')}
            className="form-input"
            placeholder="Enter your ID number"
            style={isAuthFlow ? {} : { width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border)' }}
          />
          {errors.idNumber && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{errors.idNumber.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Upload Proof (Optional)</label>
          <div 
            style={{ 
                border: '2px dashed var(--border)', 
                borderRadius: 16, 
                padding: 24, 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: 'var(--ivory-dim)'
            }}
            onClick={() => document.getElementById('id-upload')?.click()}
          >
            <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8, margin: '0 auto' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            <input 
                id="id-upload"
                type="file" 
                style={{ display: 'none' }} 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ 
              padding: 16, 
              background: 'var(--ivory-dim)', 
              borderRadius: 12, 
              display: 'flex', 
              gap: 12,
              border: '1px solid var(--ivory-dark)'
          }}>
              <AlertCircle size={20} style={{ color: 'var(--forest)', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Your data is encrypted and used solely for verification purposes. You can still manage your portfolio while we review your submission.
              </p>
          </div>
        </div>

        <button 
            type="submit" 
            disabled={isSubmitting}
            className={isAuthFlow ? "auth-btn auth-btn--primary" : ""}
            style={isAuthFlow ? {} : { 
                padding: '14px', 
                borderRadius: 12, 
                background: 'var(--forest)', 
                color: 'white', 
                fontWeight: 700, 
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
            }}
        >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Verification'}
        </button>
      </form>
    </div>
  )
}

