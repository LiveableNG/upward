'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  Upload,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Globe,
  Send,
  AlertCircle,
  Copy,
  RefreshCw,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { api } from '@/lib/api'

interface DnsRecord {
  name: string
  record_type: string
  value: string
  status: boolean
}

interface DomainResult {
  name: string
  state: string
  sending_dns_records: DnsRecord[]
}

interface EmailSettings {
  id: number
  senderName: string | null
  senderEmail: string | null
  logoUrl: string | null
  footerAddress: string | null
  cc: string | null
  bcc: string | null
  closingStatement: string | null
  domain: string | null
  isVerified: boolean
}

export function EmailSettingsTab() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [footerAddress, setFooterAddress] = useState('')
  const [closingStatement, setClosingStatement] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])
  const [domainState, setDomainState] = useState<string | null>(null)
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'sender' | 'domain'>('sender')

  // Load existing settings
  const { data: settings, isLoading } = useQuery<EmailSettings | null>({
    queryKey: ['emailSettings'],
    queryFn: () => api.getEmailSettings(),
  })

  useEffect(() => {
    if (settings) {
      setSenderName(settings.senderName || '')
      setSenderEmail(settings.senderEmail || '')
      setFooterAddress(settings.footerAddress || '')
      setClosingStatement(settings.closingStatement || '')
      setCc(settings.cc || '')
      setBcc(settings.bcc || '')
      setLogoUrl(settings.logoUrl || null)
      setDomainInput(settings.domain || '')
      if (settings.isVerified) setDomainState('active')
    }
  }, [settings])

  // Save sender config
  const saveConfigMutation = useMutation({
    mutationFn: () =>
      api.updateEmailConfig({ senderName, senderEmail, logoUrl, footerAddress, closingStatement, cc, bcc }),
    onSuccess: () => {
      success('Email settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
    },
    onError: (err: any) => toastError(err.message || 'Failed to save settings'),
  })

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toastError('File too large. Max 5MB.'); return }
    if (!file.type.startsWith('image/')) { toastError('Please select an image file.'); return }

    setUploadingLogo(true)
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const { publicUrl } = await api.uploadLogo({ base64Data, contentType: file.type })
      setLogoUrl(publicUrl)
      success('Logo uploaded')
    } catch (err: any) {
      toastError(err.message || 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Register custom domain
  const createDomainMutation = useMutation({
    mutationFn: () => api.createEmailDomain(domainInput.trim().toLowerCase()),
    onSuccess: (data: DomainResult) => {
      setDnsRecords(data.sending_dns_records || [])
      setDomainState(data.state)
      success(`Domain "${data.name}" registered — add the DNS records below`)
    },
    onError: (err: any) => toastError(err.message || 'Failed to register domain'),
  })

  // Verify domain
  const verifyDomainMutation = useMutation({
    mutationFn: () => api.verifyEmailDomain(domainInput.trim().toLowerCase()),
    onSuccess: (data: DomainResult) => {
      setDnsRecords(data.sending_dns_records || [])
      setDomainState(data.state)
      if (data.state === 'active') {
        success('Domain verified! Your custom domain is now active.')
        queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
      } else {
        toastError('DNS records not yet propagated. Please check and try again.')
      }
    },
    onError: (err: any) => toastError(err.message || 'Verification failed'),
  })

  // Send test email
  const sendTestMutation = useMutation({
    mutationFn: () => api.sendEmailSettingsTest(testEmail),
    onSuccess: () => success(`Test email sent to ${testEmail}`),
    onError: (err: any) => toastError(err.message || 'Failed to send test email'),
  })

  const copyToClipboard = (value: string, id: string) => {
    navigator.clipboard.writeText(value)
    setCopiedRecord(id)
    setTimeout(() => setCopiedRecord(null), 2000)
  }

  const isVerified = settings?.isVerified || domainState === 'active'

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--forest)' }} />
      </div>
    )
  }

  return (
    <div className="email-settings animate-fade-in">
      {/* Section Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {(['sender', 'domain'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            style={{
              padding: '8px 20px',
              borderRadius: 40,
              border: '1px solid var(--border)',
              background: activeSection === s ? 'var(--forest)' : 'transparent',
              color: activeSection === s ? '#fff' : 'var(--text)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {s === 'sender' ? 'Sender & Branding' : 'Custom Domain'}
          </button>
        ))}
      </div>

      {/* ─── SENDER & BRANDING ─── */}
      {activeSection === 'sender' && (
        <div>
          <section className="settings__section">
            <div className="settings__section-header">
              <h2 className="settings__section-title">Sender Identity</h2>
              <p className="settings__section-subtitle">
                Configure how your emails appear to tenants — name, address, and branding.
              </p>
            </div>

            <div style={{ marginTop: 28, display: 'grid', gap: 20 }}>
              {/* Logo */}
              <div className="glass" style={{ padding: 24, borderRadius: 20, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={16} /> Company Logo
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  {/* Preview */}
                  <div style={{
                    width: 120, height: 72, borderRadius: 14,
                    border: '2px dashed var(--border)', background: 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0, position: 'relative',
                  }}>
                    {uploadingLogo && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--forest)' }} />
                      </div>
                    )}
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <ImageIcon size={24} style={{ color: 'var(--border)' }} />
                    )}
                  </div>
                  <div>
                    <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    <label htmlFor="logo-upload" className="btn btn--secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 12, padding: '10px 20px', fontSize: 13 }}>
                      <Upload size={14} /> {logoUrl ? 'Replace Logo' : 'Upload Logo'}
                    </label>
                    {logoUrl && (
                      <button onClick={() => setLogoUrl(null)} style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Remove logo
                      </button>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>PNG or JPG · Max 5MB · Displayed in email header</p>
                  </div>
                </div>
              </div>

              {/* Sender fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Sender Name</label>
                  <input
                    id="email-sender-name"
                    className="form-input"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Greenfield Properties"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sender Email</label>
                  <input
                    id="email-sender-email"
                    className="form-input"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="e.g. hello@yourcompany.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">CC Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="email-cc" className="form-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@yourcompany.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">BCC Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="email-bcc" className="form-input" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@yourcompany.com" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Closing Statement <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  id="email-closing"
                  className="form-input"
                  rows={3}
                  value={closingStatement}
                  onChange={(e) => setClosingStatement(e.target.value)}
                  placeholder="e.g. Warm regards,&#10;The Greenfield Team"
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  id="email-footer"
                  className="form-input"
                  rows={2}
                  value={footerAddress}
                  onChange={(e) => setFooterAddress(e.target.value)}
                  placeholder="e.g. 12 Main Street, Lagos, Nigeria"
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <button
                id="save-email-config"
                className="btn btn--primary"
                onClick={() => saveConfigMutation.mutate()}
                disabled={saveConfigMutation.isPending || !senderName || !senderEmail}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}
              >
                {saveConfigMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Save Sender Settings
              </button>
            </div>
          </section>

          {/* Preview */}
          {(logoUrl || senderName || closingStatement || footerAddress) && (
            <section className="settings__section" style={{ marginTop: 32 }}>
              <div className="settings__section-header">
                <h2 className="settings__section-title">Email Preview</h2>
                <p className="settings__section-subtitle">How your branding will appear in outgoing emails.</p>
              </div>
              <div style={{ marginTop: 20, background: '#f9fafb', borderRadius: 20, border: '1px solid var(--border)', padding: 32, maxWidth: 540 }}>
                {logoUrl && (
                  <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                    <img src={logoUrl} alt="Logo" style={{ maxHeight: 48, objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 10, width: '50%', background: '#e5e7eb', borderRadius: 4 }} />
                  <div style={{ height: 10, width: '85%', background: '#e5e7eb', borderRadius: 4 }} />
                  <div style={{ height: 10, width: '70%', background: '#e5e7eb', borderRadius: 4 }} />
                </div>
                {closingStatement && (
                  <p style={{ marginTop: 20, fontSize: 13, color: '#4b5563', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{closingStatement}</p>
                )}
                {footerAddress && (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', whiteSpace: 'pre-line' }}>{footerAddress}</div>
                )}
              </div>
            </section>
          )}

          {/* Test Email */}
          {settings && (
            <section className="settings__section" style={{ marginTop: 32 }}>
              <div className="settings__section-header">
                <h2 className="settings__section-title">Send a Test Email</h2>
                <p className="settings__section-subtitle">Preview exactly how your emails will look when sent to tenants.</p>
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Recipient Email</label>
                  <input
                    id="test-email-input"
                    className="form-input"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder={user?.email || 'your@email.com'}
                  />
                </div>
                <button
                  id="send-test-email"
                  className="btn btn--secondary"
                  onClick={() => sendTestMutation.mutate()}
                  disabled={sendTestMutation.isPending || !testEmail}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, height: 44, whiteSpace: 'nowrap' }}
                >
                  {sendTestMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send Test
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── CUSTOM DOMAIN ─── */}
      {activeSection === 'domain' && (
        <div>
          <section className="settings__section">
            <div className="settings__section-header">
              <h2 className="settings__section-title">Custom Sending Domain</h2>
              <p className="settings__section-subtitle">
                Send emails from your own domain instead of the platform default. Requires DNS access.
              </p>
            </div>

            {/* Status Banner */}
            {isVerified ? (
              <div style={{
                marginTop: 20, padding: '16px 20px', borderRadius: 16,
                background: 'rgba(22,101,52,0.06)', border: '1px solid rgba(22,101,52,0.2)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <CheckCircle2 size={20} style={{ color: 'var(--forest)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--forest)' }}>Domain Active</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{settings?.domain} is verified and sending is live.</p>
                </div>
              </div>
            ) : settings?.domain ? (
              <div style={{
                marginTop: 20, padding: '16px 20px', borderRadius: 16,
                background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.3)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <AlertCircle size={20} style={{ color: '#ca8a04', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>Pending Verification</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>DNS records for {settings.domain} have not propagated yet.</p>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 28 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={14} /> Your Domain
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    id="custom-domain-input"
                    className="form-input"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="mail.yourcompany.com"
                    style={{ flex: 1 }}
                    disabled={isVerified}
                  />
                  {!isVerified && (
                    <button
                      id="register-domain-btn"
                      className="btn btn--primary"
                      onClick={() => createDomainMutation.mutate()}
                      disabled={createDomainMutation.isPending || !domainInput.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, whiteSpace: 'nowrap' }}
                    >
                      {createDomainMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                      Register Domain
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Use a subdomain like <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>mail.yourcompany.com</code> — not your root domain.
                </p>
              </div>
            </div>

            {/* DNS Records Table */}
            {dnsRecords.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={16} style={{ color: 'var(--forest)' }} /> DNS Records
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Add these records to your DNS provider, then click Verify.
                    </p>
                  </div>
                  <button
                    id="verify-domain-btn"
                    className="btn btn--secondary"
                    onClick={() => verifyDomainMutation.mutate()}
                    disabled={verifyDomainMutation.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, fontSize: 13 }}
                  >
                    {verifyDomainMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Check & Verify
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dnsRecords.map((rec, i) => (
                    <div
                      key={i}
                      className="glass"
                      style={{
                        padding: '16px 20px', borderRadius: 16,
                        border: `1px solid ${rec.status ? 'rgba(22,101,52,0.25)' : 'var(--border)'}`,
                        background: rec.status ? 'rgba(22,101,52,0.04)' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                            letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 6,
                            background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)'
                          }}>
                            {rec.record_type}
                          </span>
                          {rec.status
                            ? <CheckCircle2 size={14} style={{ color: 'var(--forest)' }} />
                            : <XCircle size={14} style={{ color: '#ef4444' }} />
                          }
                        </div>
                        <button
                          onClick={() => copyToClipboard(rec.value, `${i}-value`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        >
                          <Copy size={12} /> {copiedRecord === `${i}-value` ? 'Copied!' : 'Copy value'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Host:</span>
                        <code style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, fontSize: 11, wordBreak: 'break-all' as const }}>{rec.name}</code>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Value:</span>
                        <code style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, fontSize: 11, wordBreak: 'break-all' as const }}>{rec.value}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pre-existing domain records reload */}
            {settings?.domain && dnsRecords.length === 0 && !isVerified && (
              <div style={{ marginTop: 24 }}>
                <button
                  className="btn btn--secondary"
                  onClick={() => createDomainMutation.mutate()}
                  disabled={createDomainMutation.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, fontSize: 13 }}
                >
                  {createDomainMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Reload DNS Records
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      <style jsx>{`
        .hidden { display: none; }
      `}</style>
    </div>
  )
}
