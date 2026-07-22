import React, { useState } from 'react'
import { Monitor, EyeOff, X } from 'lucide-react'

export interface Campaign {
  id: string
  weekNumber: number
  subject: string
  htmlContent: string
  textContent?: string
  label?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CampaignFormData {
  weekNumber: number
  subject: string
  label: string
  htmlContent: string
  textContent: string
  isActive: boolean
}

export const wrapInPreviewTemplate = (content: string) => {
  if (content.toLowerCase().includes('<html') || content.toLowerCase().includes('<!doctype')) {
    return content
  }
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #F9FAFB; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
    .main { padding: 40px 20px; }
    .card { 
      max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; 
      border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
    }
    @media (max-width: 600px) {
      .main { padding: 20px 0; }
      .card { border-radius: 0; border-left: none; border-right: none; }
      .inner { padding: 32px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="main">
    <div class="card">
      <div style="height:4px; background:#d97757;"></div>
      <div class="inner" style="padding: 48px 40px;">
        <div style="margin-bottom:40px;">
          <span style="color:#d97757; font-size:14px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;">Upward</span>
          <div style="color:#6B7280; font-size:12px; margin-top:4px;">by GoodTenants</div>
        </div>
        
        <div style="color:#374151; font-size:16px; line-height:1.7;">${content
          .replace(/{{firstName}}/g, 'Recipient')
          .replace(/{{lastName}}/g, '(Test)')}</div>
        

      </div>
    </div>
  </div>
</body>
</html>`
}

interface CampaignEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  form: CampaignFormData
  setForm: (form: CampaignFormData) => void
  editingCampaign: Campaign | null
}

export const CampaignEditorModal: React.FC<CampaignEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  editingCampaign,
}) => {
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: showEmailPreview ? '1100px' : '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
          transition: 'max-width 0.3s ease',
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {editingCampaign ? `Edit Week ${form.weekNumber} Campaign` : 'New Campaign Week'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              This email will be sent every Tuesday to users in their Week {form.weekNumber}.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="btn-toggle-email-preview"
              onClick={() => setShowEmailPreview((v) => !v)}
              title={showEmailPreview ? 'Hide email preview' : 'Show email preview'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: showEmailPreview ? 'rgba(217,119,87,0.08)' : 'var(--white)',
                color: showEmailPreview ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {showEmailPreview ? <EyeOff size={15} /> : <Monitor size={15} />}
              {showEmailPreview ? 'Hide Preview' : 'Preview Email'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: showEmailPreview && window.innerWidth < 1024 ? 'column' : 'row',
            minHeight: 0,
          }}
        >
          <div
            style={{
              flex: showEmailPreview && window.innerWidth < 1024 ? 'none' : '0 0 auto',
              width: showEmailPreview ? (window.innerWidth < 1024 ? '100%' : '420px') : '100%',
              overflowY: 'auto',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              borderRight:
                showEmailPreview && window.innerWidth >= 1024 ? '1px solid var(--border)' : 'none',
              borderBottom:
                showEmailPreview && window.innerWidth < 1024 ? '1px solid var(--border)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Week Number
                </label>
                <input
                  id="input-week-number"
                  type="number"
                  min={1}
                  value={form.weekNumber}
                  disabled={!!editingCampaign}
                  onChange={(e) => setForm({ ...form, weekNumber: parseInt(e.target.value) || 1 })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    background: editingCampaign ? 'var(--surface)' : 'var(--white)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Label (optional)
                </label>
                <input
                  id="input-campaign-label"
                  type="text"
                  placeholder="e.g. Welcome to Upward"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--white)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Email Subject Line *
              </label>
              <input
                id="input-campaign-subject"
                type="text"
                placeholder="Enter email subject…"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '15px',
                  outline: 'none',
                  background: 'var(--white)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  HTML Email Content *
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Use <code>{'{{firstName}}'}</code>, <code>{'{{email}}'}</code> for personalisation
                </div>
              </div>
              <textarea
                id="input-campaign-html"
                rows={14}
                value={form.htmlContent}
                onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                placeholder="Paste full HTML email here…"
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical',
                  background: '#0d1117',
                  color: '#c9d1d9',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Plain Text Fallback (optional)
              </label>
              <textarea
                id="input-campaign-text"
                rows={4}
                value={form.textContent}
                onChange={(e) => setForm({ ...form, textContent: e.target.value })}
                placeholder="Plain text version for email clients that don't render HTML…"
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'vertical',
                  background: 'var(--white)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            >
              <div
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  position: 'relative',
                  background: form.isActive ? 'var(--accent)' : 'var(--border)',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '3px',
                    left: form.isActive ? '23px' : '3px',
                    transition: 'left 0.2s',
                  }}
                />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {form.isActive
                  ? 'Active — will be included in Tuesday sends'
                  : 'Paused — will be skipped'}
              </span>
            </label>
          </div>

          {showEmailPreview && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  padding: '10px 20px',
                  background: 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <Monitor size={14} color="var(--text-muted)" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Live Email Preview
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Updates as you type
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  background: '#f3f4f6',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {form.htmlContent.trim() ? (
                  <iframe
                    srcDoc={wrapInPreviewTemplate(form.htmlContent)}
                    title="Email preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                    }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      gap: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Monitor size={36} color="var(--border)" />
                    <span style={{ fontSize: '13px' }}>Paste HTML to see a preview</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '20px 28px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '11px 22px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--white)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            Cancel
          </button>
          <button
            id="btn-save-campaign"
            onClick={onSave}
            style={{
              padding: '11px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #d97757, #c2622e)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {editingCampaign ? 'Save Changes' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}
