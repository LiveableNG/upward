'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  ChevronRight,
  ChevronLeft,
  Shield,
  Info,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Editor } from '@hugerte/hugerte-react'

interface DnsRecord {
  name: string
  record_type: string
  value: string
  status: boolean
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
  provider: string | null
  office365Config: any | null
  office365SecretExpiresAt: string | null
  gmailOauthConfig: any | null
  zohoConfig: any | null
  smtpEmail: string | null
  emailSignature: string | null
  useEmailSignature: boolean
  defaultFontFamily: string | null
  defaultFontSize: string | null
  defaultLineHeight: string | null
  enableMailbox: boolean
  enableReplyTo: boolean
}

const PROVIDER_OPTIONS = [
  { id: 'mailgun', name: 'Mailgun (Default)', desc: 'Enterprise-grade custom domain delivery' },
  { id: 'office365', name: 'Office365 (Microsoft Graph)', desc: 'Integrate directly with your Outlook/Office 365 business email' },
  { id: 'gmail', name: 'Gmail (App Password)', desc: 'Send from a personal or workspace Gmail account using SMTP' },
  { id: 'gmail-oauth', name: 'Gmail OAuth', desc: 'Secure OAuth-based authentication for Gmail account' },
  { id: 'zoho-smtp', name: 'Zoho SMTP (App Password)', desc: 'Send via your Zoho mail account SMTP interface' },
  { id: 'yahoo-smtp', name: 'Yahoo Mail (App Password)', desc: 'Send via Yahoo Mail SMTP interface' },
]

const STEPS = [
  'Terms & Conditions',
  'Choose Provider',
  'Configure Provider',
  'Sender & Branding',
  'Send Test Email',
]

export function EmailOnboardingPipeline() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('mailgun')

  // Office365 form state
  const [officeClientId, setOfficeClientId] = useState('')
  const [officeTenantId, setOfficeTenantId] = useState('')
  const [officeClientSecret, setOfficeClientSecret] = useState('')
  const [officeSecretExpires, setOfficeSecretExpires] = useState('')
  const [officeUserObjectId, setOfficeUserObjectId] = useState('')
  const [officeEnableMailbox, setOfficeEnableMailbox] = useState(false)
  const [officeEnableReplyTo, setOfficeEnableReplyTo] = useState(false)
  const [officeVerified, setOfficeVerified] = useState(false)

  // Mailgun config state
  const [mailgunDomain, setMailgunDomain] = useState('')
  const [mailgunRegion, setMailgunRegion] = useState('us')
  const [mailgunRecords, setMailgunRecords] = useState<DnsRecord[]>([])
  const [mailgunVerified, setMailgunVerified] = useState(false)

  // Gmail/Zoho/Yahoo SMTP app password form state
  const [smtpEmail, setSmtpEmail] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpVerified, setSmtpVerified] = useState(false)

  // Gmail OAuth / Zoho OAuth form state
  const [oauthClientId, setOauthClientId] = useState('')
  const [oauthClientSecret, setOauthClientSecret] = useState('')
  const [oauthCode, setOauthCode] = useState('')
  const [oauthVerified, setOauthVerified] = useState(false)

  // Step 4: Sender Info & Branding
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [closingStatement, setClosingStatement] = useState('')
  const [footerAddress, setFooterAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Custom font & signature properties
  const [useEmailSignature, setUseEmailSignature] = useState(true)
  const [emailSignature, setEmailSignature] = useState('')
  const [defaultFontFamily, setDefaultFontFamily] = useState('Arial, sans-serif')
  const [defaultFontSize, setDefaultFontSize] = useState('11pt')
  const [defaultLineHeight, setDefaultLineHeight] = useState('1.4')

  // Step 5: Test email
  const [testEmail, setTestEmail] = useState('')

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
      setSelectedProvider(settings.provider || 'mailgun')
      setTermsAccepted(!!settings.provider)
      setUseEmailSignature(settings.useEmailSignature !== false)
      setEmailSignature(settings.emailSignature || '')
      setDefaultFontFamily(settings.defaultFontFamily || 'Arial, sans-serif')
      setDefaultFontSize(settings.defaultFontSize || '11pt')
      setDefaultLineHeight(settings.defaultLineHeight || '1.4')

      if (settings.provider === 'mailgun') {
        setMailgunDomain(settings.domain || '')
        setMailgunVerified(settings.isVerified)
      } else if (settings.provider === 'office365') {
        const config = settings.office365Config || {}
        setOfficeClientId(config.applicationId || '')
        setOfficeTenantId(config.directoryId || '')
        setOfficeClientSecret(config.clientSecret || '')
        setOfficeUserObjectId(config.userObjectId || '')
        setOfficeSecretExpires(settings.office365SecretExpiresAt ? new Date(settings.office365SecretExpiresAt).toISOString().split('T')[0] : '')
        setOfficeEnableMailbox(settings.enableMailbox)
        setOfficeEnableReplyTo(settings.enableReplyTo)
        setOfficeVerified(settings.isVerified)
      } else if (['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(settings.provider || '')) {
        setSmtpEmail(settings.smtpEmail || '')
        setSmtpPassword('********')
        setSmtpVerified(settings.isVerified)
      } else if (['gmail-oauth', 'zoho-oauth'].includes(settings.provider || '')) {
        const config = settings.gmailOauthConfig || settings.zohoConfig || {}
        setOauthClientId(config.clientId || '')
        setOauthClientSecret(config.clientSecret || '')
        setOauthVerified(settings.isVerified)
      }
    }
  }, [settings])

  // Mutation: Verify Office 365
  const verifyOffice365Mutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/office365/verify-config', {
        clientId: officeClientId,
        clientSecret: officeClientSecret,
        secretChanged: officeClientSecret !== (settings?.office365Config?.clientSecret || ''),
        secretExpires: officeSecretExpires,
        tenantId: officeTenantId,
        userObjectId: officeUserObjectId,
      }),
    onSuccess: (res: any) => {
      if (res.verified) {
        setOfficeVerified(true)
        success(res.message || 'Office365 setup verified successfully!')
        queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
      }
    },
    onError: (err: any) => toastError(err.message || 'Office365 verification failed'),
  })

  // Mutation: Verify SMTP (Gmail/Zoho/Yahoo)
  const verifySmtpMutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/gmail/verify-config', {
        email: smtpEmail,
        password: smtpPassword,
        passwordChanged: smtpPassword !== '********',
        provider: selectedProvider,
      }),
    onSuccess: (res: any) => {
      if (res.verified) {
        setSmtpVerified(true)
        success(res.message || 'SMTP credentials verified!')
        queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
      }
    },
    onError: (err: any) => toastError(err.message || 'SMTP connection failed'),
  })

  // Mutation: Verify OAuth (Gmail/Zoho)
  const verifyOauthMutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/oauth/verify-config', {
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        secretChanged: oauthClientSecret !== '********',
        code: oauthCode,
        state: 'random_state',
        redirectUrl: `${window.location.origin}/settings`,
        provider: selectedProvider,
      }),
    onSuccess: (res: any) => {
      if (res.verified) {
        setOauthVerified(true)
        success('OAuth authentication verified successfully!')
        queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
      }
    },
    onError: (err: any) => toastError(err.message || 'OAuth verification failed'),
  })

  // Mutation: Register Mailgun Domain
  const registerMailgunMutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/domain', { domain: mailgunDomain }),
    onSuccess: (res: any) => {
      setMailgunRecords(res.sending_dns_records || [])
      success('Mailgun domain registered — please update your DNS records')
    },
    onError: (err: any) => toastError(err.message || 'Mailgun domain registration failed'),
  })

  // Mutation: Verify Mailgun Domain
  const verifyMailgunMutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/verify-domain', { domain: mailgunDomain }),
    onSuccess: (res: any) => {
      setMailgunRecords(res.sending_dns_records || [])
      if (res.state === 'active' || res.isVerified) {
        setMailgunVerified(true)
        success('Mailgun domain verified and active!')
        queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
      } else {
        toastError('DNS records not yet fully propagated.')
      }
    },
    onError: (err: any) => toastError(err.message || 'Verification check failed'),
  })

  // Mutation: Save Step 4 (Sender & Branding info)
  const saveSenderBrandingMutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/config', {
        senderName,
        senderEmail,
        logoUrl,
        footerAddress,
        cc,
        bcc,
        closingStatement,
        emailSignature,
        useEmailSignature,
        defaultFontFamily,
        defaultFontSize,
        defaultLineHeight,
      }),
    onSuccess: () => {
      success('Sender information and email branding saved')
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
      setStep(5)
    },
    onError: (err: any) => toastError(err.message || 'Failed to save branding settings'),
  })

  // Mutation: Send Test Email
  const sendTestEmailMutation = useMutation({
    mutationFn: () =>
      api.post('/pm/email-settings/send-test-email', { email: testEmail }),
    onSuccess: () => success(`Test email sent to ${testEmail}`),
    onError: (err: any) => toastError(err.message || 'Failed to send test email'),
  })

  // Logo upload
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
      success('Logo uploaded successfully')
    } catch (err: any) {
      toastError(err.message || 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle OAuth code request popup mock
  const handleOAuthAuthenticate = () => {
    // Generate auth URL
    let authUrl = ''
    if (selectedProvider === 'gmail-oauth') {
      const scope = 'https://www.googleapis.com/auth/gmail.send'
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${oauthClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/settings')}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`
    } else {
      const scope = 'ZohoMail.messages.CREATE'
      authUrl = `https://accounts.zoho.com/oauth/v2/auth?client_id=${oauthClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/settings')}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`
    }

    const popup = window.open(authUrl, 'oauth-login', 'width=600,height=700')
    if (!popup) {
      toastError('Popup blocker prevented authentication. Please enable popups.')
    }
  }

  const isStep3Valid = () => {
    if (selectedProvider === 'mailgun') return mailgunVerified
    if (selectedProvider === 'office365') return officeVerified
    if (['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(selectedProvider)) return smtpVerified
    if (['gmail-oauth', 'zoho-oauth'].includes(selectedProvider)) return oauthVerified
    return false
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--forest)' }} />
      </div>
    )
  }

  return (
    <div className="branding-defaults__section animate-fade-in" style={{ padding: '32px' }}>
      {/* 5-Stage Stepper Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1
          const isActive = step === stepNum
          const isCompleted = step > stepNum
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: stepNum < STEPS.length ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--forest)' : isCompleted ? 'rgba(22,101,52,0.1)' : 'var(--bg)',
                  border: `1.5px solid ${isActive ? 'var(--forest)' : isCompleted ? 'var(--forest)' : 'var(--border)'}`,
                  color: isActive ? '#fff' : isCompleted ? 'var(--forest)' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 13
                }}>
                  {isCompleted ? <CheckCircle2 size={16} /> : stepNum}
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}>
                  {label}
                </span>
              </div>
              {stepNum < STEPS.length && (
                <div style={{
                  height: 2, flex: 1, margin: '0 20px',
                  background: isCompleted ? 'var(--forest)' : 'var(--border)'
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ─── STAGE 1: TERMS AND CONDITIONS ─── */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Email Configuration Terms &amp; Conditions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Please review the permissions and terms for configuring outbound email servers on your Upward account.
          </p>

          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, maxHeight: 300, overflowY: 'auto',
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24
          }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>1. Permissions Grant</h4>
            <p style={{ marginBottom: 14 }}>
              By integrating an email service, you grant the platform explicit permission to trigger transactional and notification messages to your tenants on your behalf.
            </p>
            <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>2. Deliverability Responsibility</h4>
            <p style={{ marginBottom: 14 }}>
              Outbound deliverability depends heavily on the correctness of your domain registration, SPF/DKIM DNS entries, and SMTP status. The platform does not guarantee delivery rates for unverified configurations.
            </p>
            <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>3. Strict No-Spam Policy</h4>
            <p style={{ marginBottom: 14 }}>
              Sending bulk unsolicited emails, promotional materials, or violating regional anti-spam laws will result in immediate termination of email settings privileges.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <input
              type="checkbox"
              id="accept-terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label htmlFor="accept-terms" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
              I agree to the Email configuration terms and grant the necessary sending permissions.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn--primary"
              disabled={!termsAccepted}
              onClick={() => setStep(2)}
              style={{ padding: '12px 32px', borderRadius: 24 }}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STAGE 2: SELECT PROVIDER ─── */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Select Email Provider</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Choose the delivery method that best matches your corporate infrastructure.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
            {PROVIDER_OPTIONS.map((opt) => {
              const isSelected = selectedProvider === opt.id
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedProvider(opt.id)}
                  style={{
                    padding: 24, borderRadius: 16, border: `2px solid ${isSelected ? 'var(--forest)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--forest-faint)' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column', gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{opt.name}</span>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--border)',
                      background: isSelected ? 'var(--forest)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{opt.desc}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              className="btn btn--secondary"
              onClick={() => setStep(1)}
              style={{ padding: '12px 24px', borderRadius: 24 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              className="btn btn--primary"
              onClick={() => setStep(3)}
              style={{ padding: '12px 24px', borderRadius: 24 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STAGE 3: CONFIGURATION AND VERIFICATION ─── */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Configure Outbound Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Provide the required credentials to verify and activate {PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}.
          </p>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 32, marginBottom: 32 }}>
            
            {/* MAILGUN FORM */}
            {selectedProvider === 'mailgun' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Custom Sending Subdomain</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      className="form-input"
                      value={mailgunDomain}
                      onChange={(e) => setMailgunDomain(e.target.value)}
                      placeholder="e.g. mail.yourcompany.com"
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn--primary"
                      onClick={() => registerMailgunMutation.mutate()}
                      disabled={registerMailgunMutation.isPending || !mailgunDomain.trim()}
                    >
                      {registerMailgunMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Register'}
                    </button>
                  </div>
                  <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                    Note: We recommend utilizing a dedicated subdomain such as <code>mail.company.com</code>.
                  </small>
                </div>

                {mailgunRecords.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>DNS Records to Configure</h4>
                      <button
                        className="btn btn--secondary"
                        onClick={() => verifyMailgunMutation.mutate()}
                        disabled={verifyMailgunMutation.isPending}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        {verifyMailgunMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Verify DNS'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {mailgunRecords.map((rec, i) => (
                        <div key={i} style={{ padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                            <span style={{ fontWeight: 700 }}>{rec.record_type}</span>
                            <span style={{ color: rec.status ? 'var(--forest)' : 'var(--clay)', fontWeight: 600 }}>
                              {rec.status ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            <div><strong>Host:</strong> {rec.name}</div>
                            <div style={{ marginTop: 4 }}><strong>Value:</strong> {rec.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OFFICE 365 FORM */}
            {selectedProvider === 'office365' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Application (Client) ID</label>
                    <input className="form-input" value={officeClientId} onChange={(e) => setOfficeClientId(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Directory (Tenant) ID</label>
                    <input className="form-input" value={officeTenantId} onChange={(e) => setOfficeTenantId(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Client Secret Value</label>
                  <input className="form-input" type="password" value={officeClientSecret} onChange={(e) => setOfficeClientSecret(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Secret Expiration Date</label>
                    <input className="form-input" type="date" value={officeSecretExpires} onChange={(e) => setOfficeSecretExpires(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">User Object ID</label>
                    <input className="form-input" value={officeUserObjectId} onChange={(e) => setOfficeUserObjectId(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="enable-mailbox" checked={officeEnableMailbox} onChange={(e) => setOfficeEnableMailbox(e.target.checked)} />
                    <label htmlFor="enable-mailbox" style={{ fontSize: 13, color: 'var(--text)' }}>Enable Mailbox Syncing</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="enable-replyto" checked={officeEnableReplyTo} onChange={(e) => setOfficeEnableReplyTo(e.target.checked)} />
                    <label htmlFor="enable-replyto" style={{ fontSize: 13, color: 'var(--text)' }}>Enable custom Reply-To Routing</label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <button
                    className="btn btn--primary"
                    onClick={() => verifyOffice365Mutation.mutate()}
                    disabled={verifyOffice365Mutation.isPending || !officeClientId || !officeTenantId || !officeClientSecret}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px' }}
                  >
                    {verifyOffice365Mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Verify Microsoft Graph Credentials
                  </button>
                </div>
              </div>
            )}

            {/* GMAIL / ZOHO SMTP / YAHOO SMTP APP PASSWORD FORM */}
            {['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(selectedProvider) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" value={smtpEmail} onChange={(e) => setSmtpEmail(e.target.value)} placeholder="e.g. sender@gmail.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">App Password</label>
                  <input className="form-input" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
                  <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                    Note: Do not input your login password. Generate a 16-character App Password inside your provider security portal settings.
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <button
                    className="btn btn--primary"
                    onClick={() => verifySmtpMutation.mutate()}
                    disabled={verifySmtpMutation.isPending || !smtpEmail || !smtpPassword}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px' }}
                  >
                    {verifySmtpMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Test &amp; Save Connection
                  </button>
                </div>
              </div>
            )}

            {/* OAUTH (GMAIL OAUTH & ZOHO OAUTH) FORM */}
            {['gmail-oauth', 'zoho-oauth'].includes(selectedProvider) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Client ID</label>
                  <input className="form-input" value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Client Secret</label>
                  <input className="form-input" type="password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleOAuthAuthenticate}
                    disabled={!oauthClientId || !oauthClientSecret}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <ExternalLink size={16} /> Authenticate account
                  </button>
                  <input
                    className="form-input"
                    value={oauthCode}
                    onChange={(e) => setOauthCode(e.target.value)}
                    placeholder="Paste OAuth authorization code here..."
                    style={{ flex: 1 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <button
                    className="btn btn--primary"
                    onClick={() => verifyOauthMutation.mutate()}
                    disabled={verifyOauthMutation.isPending || !oauthClientId || !oauthClientSecret || !oauthCode}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px' }}
                  >
                    {verifyOauthMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Verify OAuth Account Connection
                  </button>
                </div>
              </div>
            )}

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              className="btn btn--secondary"
              onClick={() => setStep(2)}
              style={{ padding: '12px 24px', borderRadius: 24 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              className="btn btn--primary"
              disabled={!isStep3Valid()}
              onClick={() => setStep(4)}
              style={{ padding: '12px 24px', borderRadius: 24 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STAGE 4: SENDER AND BRANDING IDENTITY ─── */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sender &amp; Branding Setup</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Establish how messages look to your tenants and how your logo and signatures are configured.
          </p>

          <div style={{ display: 'grid', gap: 24 }}>
            {/* Logo Section */}
            <div className="email-settings__logo-section">
              <h3 className="email-settings__logo-title">
                <ImageIcon size={16} /> Company Logo
              </h3>
              <div className="email-settings__logo-row">
                <div className="email-settings__logo-preview">
                  {uploadingLogo && (
                    <div className="email-settings__logo-loader">
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--forest)' }} />
                    </div>
                  )}
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="email-settings__logo-img" />
                  ) : (
                    <ImageIcon size={24} style={{ color: 'var(--border)' }} />
                  )}
                </div>
                <div className="email-settings__logo-actions">
                  <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  <label htmlFor="logo-upload" className="btn btn--secondary email-settings__logo-upload-btn">
                    <Upload size={14} /> {logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </label>
                  {logoUrl && (
                    <button onClick={() => setLogoUrl(null)} className="email-settings__logo-remove-btn">
                      Remove logo
                    </button>
                  )}
                  <p className="email-settings__logo-tip">PNG or JPG · Max 5MB · Appended in the email header</p>
                </div>
              </div>
            </div>

            {/* Sender details */}
            <div className="email-settings__form-row">
              <div className="form-group">
                <label className="form-label">Sender Name *</label>
                <input className="form-input" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Greenfield Admin" />
              </div>
              <div className="form-group">
                <label className="form-label">Sender Email Address *</label>
                <input className="form-input" type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="e.g. hello@yourdomain.com" />
              </div>
            </div>

            <div className="email-settings__form-row">
              <div className="form-group">
                <label className="form-label">CC Address</label>
                <input className="form-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="e.g. archive@yourdomain.com" />
              </div>
              <div className="form-group">
                <label className="form-label">BCC Address</label>
                <input className="form-input" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="e.g. logs@yourdomain.com" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Closing Statement</label>
              <textarea className="form-input" rows={2} value={closingStatement} onChange={(e) => setClosingStatement(e.target.value)} placeholder="e.g. Warm regards, the team." />
            </div>

            <div className="form-group">
              <label className="form-label">Footer Physical Address</label>
              <textarea className="form-input" rows={2} value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} placeholder="e.g. 15 Commercial Street, Lagos" />
            </div>

            {/* Font Preferences & Signature Editor */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Font &amp; Signature Settings</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Font Family</label>
                  <select className="form-input" value={defaultFontFamily} onChange={(e) => setDefaultFontFamily(e.target.value)}>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Calibri, sans-serif">Calibri</option>
                    <option value="Segoe UI, sans-serif">Segoe UI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Font Size</label>
                  <select className="form-input" value={defaultFontSize} onChange={(e) => setDefaultFontSize(e.target.value)}>
                    <option value="9pt">9pt</option>
                    <option value="10pt">10pt</option>
                    <option value="11pt">11pt</option>
                    <option value="12pt">12pt</option>
                    <option value="14pt">14pt</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Line Height</label>
                  <select className="form-input" value={defaultLineHeight} onChange={(e) => setDefaultLineHeight(e.target.value)}>
                    <option value="1.0">1.0</option>
                    <option value="1.2">1.2</option>
                    <option value="1.4">1.4</option>
                    <option value="1.6">1.6</option>
                    <option value="1.8">1.8</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input type="checkbox" id="use-sig" checked={useEmailSignature} onChange={(e) => setUseEmailSignature(e.target.checked)} />
                <label htmlFor="use-sig" style={{ fontSize: 13, fontWeight: 600 }}>Enable Custom Signature Block</label>
              </div>

              {useEmailSignature && (
                <div className="form-group">
                  <label className="form-label">Signature Block Content</label>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <Editor
                      init={{
                        height: 250,
                        menubar: false,
                        plugins: ['lists', 'link', 'image'],
                        toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link image',
                      }}
                      value={emailSignature}
                      onEditorChange={(content) => setEmailSignature(content)}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <button
              className="btn btn--secondary"
              onClick={() => setStep(3)}
              style={{ padding: '12px 24px', borderRadius: 24 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              className="btn btn--primary"
              disabled={saveSenderBrandingMutation.isPending || !senderName || !senderEmail}
              onClick={() => saveSenderBrandingMutation.mutate()}
              style={{ padding: '12px 32px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saveSenderBrandingMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Save Sender Identity
            </button>
          </div>
        </div>
      )}

      {/* ─── STAGE 5: SEND TEST EMAIL ─── */}
      {step === 5 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Send Test Email</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Verify that your outbound delivery setup compiles and sends correctly.
          </p>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 32, marginBottom: 32 }}>
            <div className="form-group">
              <label className="form-label">Recipient Email Address</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  className="form-input"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g. test@example.com"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn--primary"
                  onClick={() => sendTestEmailMutation.mutate()}
                  disabled={sendTestEmailMutation.isPending || !testEmail.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {sendTestEmailMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send Test Email
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              className="btn btn--secondary"
              onClick={() => setStep(4)}
              style={{ padding: '12px 24px', borderRadius: 24 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                success('Onboarding process completed!')
                queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
              }}
              style={{ padding: '12px 32px', borderRadius: 24 }}
            >
              Finish Setup
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .hidden { display: none; }
      `}</style>
    </div>
  )
}
