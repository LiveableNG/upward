import React, { useState } from 'react'
import { Link2, Plus } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { showToast } from '@upward/client-core'
import type { CreateSourceFormData } from '../types'
import { slugify } from '../utils'

interface CreateTrafficSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateSourceFormData) => Promise<boolean>
  creating: boolean
}

export const CreateTrafficSourceModal: React.FC<CreateTrafficSourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  creating,
}) => {
  const [form, setForm] = useState<CreateSourceFormData>({
    name: '',
    identifier: '',
    channel: 'INSTAGRAM',
    targetUrl: '/academy',
    forcedVariant: 'AUTO',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.identifier.trim()) {
      showToast('Name and identifier are required', true)
      return
    }

    const success = await onSubmit(form)
    if (success) {
      setForm({
        name: '',
        identifier: '',
        channel: 'INSTAGRAM',
        targetUrl: '/academy',
        forcedVariant: 'AUTO',
        description: '',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !creating && onClose()}
      title="Create Campaign Tracking Link"
      description="Generate a unique tracking identifier to monitor organic, ad, or flyer traffic with GA-level anti-reload tracking."
      icon={<Link2 size={20} color="#8A4A2A" />}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Campaign / Source Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Instagram Ads — Lagos Cohort"
              value={form.name}
              onChange={(e) => {
                const val = e.target.value
                setForm((prev) => ({
                  ...prev,
                  name: val,
                  identifier: prev.identifier === slugify(prev.name) ? slugify(val) : prev.identifier,
                }))
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Marketing Channel *
              </label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="TIKTOK">TikTok</option>
                <option value="TWITTER">Twitter / X</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="FLYER">Flyer & Campus Posters</option>
                <option value="INFLUENCER">Influencer Outreach</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="OTHER">Other / Direct</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Target Destination *
              </label>
              <select
                value={form.targetUrl}
                onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="/academy">Main Landing Page (/academy)</option>
                <option value="/academy/apply">Direct Application (/academy/apply)</option>
                <option value="/academy/scholarships">Scholarship Page (/academy/scholarships)</option>
                <option value="/academy/landlord">Landlord Programme (/academy/landlord)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Unique Slug / Identifier *
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRight: 'none',
                  borderRadius: '8px 0 0 8px',
                  fontSize: '12.5px',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                /academy/
              </span>
              <input
                type="text"
                required
                placeholder="e.g. ig-lagos-1"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: slugify(e.target.value) })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '0 8px 8px 0',
                  border: '1px solid var(--border)',
                  fontSize: '13.5px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#8A4A2A',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Only lowercase letters, numbers, and dashes (auto-formatted).
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              A/B Test Variant Routing (Optional)
            </label>
            <select
              value={form.forcedVariant}
              onChange={(e) => setForm({ ...form, forcedVariant: e.target.value as any })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontWeight: 600,
                background: '#fff',
                boxSizing: 'border-box',
              }}
            >
              <option value="AUTO">Auto (50/50 Random Split)</option>
              <option value="A">Force Variant A (Upfront Pricing)</option>
              <option value="B">Force Variant B (Post-Registration Pricing)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Campaign Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Target: UNILAG students, Ad budget: ₦50k, Duration: 2 weeks"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Generated URL Preview Box */}
          {form.identifier && (
            <div
              style={{
                background: '#fdf8f5',
                border: '1px solid #f4e4d8',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#8A4A2A', fontWeight: 700, textTransform: 'uppercase' }}>
                Live Link Preview:
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  color: '#8A4A2A',
                  fontWeight: 700,
                  marginTop: '4px',
                  wordBreak: 'break-all',
                }}
              >
                {typeof window !== 'undefined' ? window.location.origin : 'https://upward.ng'}
                {form.targetUrl.includes('/apply')
                  ? `/academy/apply?ref=${form.identifier}${form.forcedVariant !== 'AUTO' ? `&variant=${form.forcedVariant}` : ''}`
                  : `/academy/${form.identifier}${form.forcedVariant !== 'AUTO' ? `?variant=${form.forcedVariant}` : ''}`}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
            style={{
              background: '#8A4A2A',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            {creating ? 'Creating Link...' : 'Create Tracking Link'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
