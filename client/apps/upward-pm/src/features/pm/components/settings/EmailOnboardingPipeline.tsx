'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/common/Toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
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
  { id: 'platform-sender', name: 'Upward (Platform sender)', desc: "Use Upward's default secure server. No custom DNS setup required." },
  { id: 'mailgun', name: 'Mailgun (Custom Domain)', desc: 'Configure your own custom domain using Mailgun DNS entries.' },
  { id: 'office365', name: 'Office365 (Microsoft Graph)', desc: 'Integrate directly with your Outlook/Office 365 business email.' },
  { id: 'gmail', name: 'Gmail (App Password)', desc: 'Send from a personal or workspace Gmail account using SMTP.' },
  { id: 'gmail-oauth', name: 'Gmail OAuth', desc: 'Secure OAuth-based authentication for Gmail account.' },
  { id: 'zoho-smtp', name: 'Zoho SMTP (App Password)', desc: 'Send via your Zoho mail account SMTP interface.' },
  { id: 'yahoo-smtp', name: 'Yahoo Mail (App Password)', desc: 'Send via Yahoo Mail SMTP interface.' },
]

const getTextAreaRows = (val: string) => {
  const emailCount = val.split(/[\n,;]/).filter(e => e.trim()).length
  return Math.max(1, Math.min(5, emailCount))
}

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
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [hasReadTerms, setHasReadTerms] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('platform-sender')

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
  const [testEmailMsg, setTestEmailMsg] = useState<string | null>(null)

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
      setSelectedProvider(settings.provider || 'platform-sender')
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

  useEffect(() => {
    if (selectedProvider === 'platform-sender') {
      setSenderEmail('replyupward@goodtenants.io')
    }
  }, [selectedProvider])

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
        provider: selectedProvider,
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
    onSuccess: () => {
      success(`Test email sent to ${testEmail}`)
      setTestEmailMsg('success')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to send test email')
      setTestEmailMsg('failed')
    },
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
    if (selectedProvider === 'platform-sender') return true
    if (selectedProvider === 'mailgun') return mailgunVerified
    if (selectedProvider === 'office365') return officeVerified
    if (['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(selectedProvider)) return smtpVerified
    if (['gmail-oauth', 'zoho-oauth'].includes(selectedProvider)) return oauthVerified
    return false
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--forest)' }} />
      </div>
    )
  }

  const hasConfigured = settings && settings.provider
  if (hasConfigured && !isEditing) {
    return (
      <div className="branding-defaults__section animate-fade-in" style={{ padding: '24px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Email Outbound Status</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0 0' }}>Your outbound custom mail server is active and verified.</p>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => setIsEditing(true)}
            style={{ padding: '8px 20px', borderRadius: 20, fontSize: 13 }}
          >
            Reconfigure Settings
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left Block: Connection details */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Outbound Provider</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#13B26B' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {PROVIDER_OPTIONS.find(p => p.id === settings.provider)?.name || settings.provider}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              All transactional and automated messages will be delivered using this provider credential.
            </div>
          </div>

          {/* Right Block: Identity details */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Sender Identity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div><strong>Name:</strong> {settings.senderName || 'Not Set'}</div>
              <div><strong>Email:</strong> {settings.senderEmail || 'Not Set'}</div>
              {settings.cc && <div><strong>CC:</strong> {settings.cc}</div>}
              {settings.bcc && <div><strong>BCC:</strong> {settings.bcc}</div>}
            </div>
          </div>
        </div>

        {/* Branding & signature block */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Active Signature / Footer</h3>
          {settings.useEmailSignature ? (
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Rich Signature Template:</span>
              <div
                dangerouslySetInnerHTML={{ __html: settings.emailSignature || '<em>No signature content</em>' }}
                style={{
                  padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                  fontSize: 13, color: 'var(--text)'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Physical Footer Address:</span>
                <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}>
                  {settings.footerAddress || 'Not Set'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Closing Statement:</span>
                <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}>
                  {settings.closingStatement || 'Not Set'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="branding-defaults__section animate-fade-in" style={{ padding: '24px', background: '#fff', position: 'relative' }}>
      
      {/* Compact Stepper Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            Step {step} of 5 — {STEPS[step - 1]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {Math.round((step / 5) * 100)}% Complete
          </span>
        </div>
        <div style={{ height: 4, width: '100%', background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(step / 5) * 100}%`, background: 'var(--forest)', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ paddingBottom: 64 }}>
        {/* ─── STAGE 1: TERMS AND CONDITIONS ─── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Email Configuration Terms &amp; Conditions</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Please review the permissions and terms for configuring outbound email servers on your Upward account.
            </p>

            <div
              onScroll={(e) => {
                const target = e.currentTarget
                // Allow a small 10px threshold to trigger easily
                const isBottom = Math.ceil(target.scrollHeight - target.scrollTop) <= target.clientHeight + 10
                if (isBottom) {
                  setHasReadTerms(true)
                }
              }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16, maxHeight: 240, overflowY: 'auto',
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16
              }}
            >
              <p style={{ marginBottom: 10 }}>
                <strong>General:</strong><br />
                By configuring your email settings through this app, you grant Upward permission to send emails on your behalf using your selected provider and domain. You are responsible for ensuring that you have the right to use the chosen provider and domain for email sending.
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>Supported Providers:</strong><br />
                This application supports multiple email providers, including <b>Upward Platform sender</b>, <b>Office365</b>, <b>Mailgun</b>, <b>Gmail</b>, and <b>Zoho</b>. Each provider has unique requirements and limitations. Please review your provider's documentation for specific compliance and integration details.
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>Provider-Specific Notes:</strong>
                <ul style={{ paddingLeft: 16, listStyleType: 'disc', margin: '4px 0' }}>
                  <li><b>Office365:</b> You may be required to provide application/client IDs, tenant IDs, and secret keys. Ensure these credentials are kept secure. Microsoft's terms and privacy policies apply.</li>
                  <li><b>Mailgun:</b> You may be required to verify your sending domain and add DNS records. Mailgun's terms and privacy policies apply.</li>
                  <li><b>Gmail:</b> Requires 2-Step Verification and App Password generation. Google's terms and privacy policies apply.</li>
                  <li><b>Zoho SMTP:</b> Requires App Password generation from Zoho Mail Admin Console. Zoho's terms and privacy policies apply.</li>
                </ul>
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>Data Privacy:</strong><br />
                The app collects necessary information such as sender email, domain details, and DNS records solely for the purpose of configuring and sending emails as instructed by you. Your credentials are stored securely and are never shared with third parties except as required to facilitate email sending.
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>Security:</strong><br />
                You are responsible for maintaining the confidentiality and security of your provider credentials. Do not share sensitive keys or passwords.
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>Deliverability:</strong><br />
                While Upward assists in configuring email settings, it does not guarantee email deliverability. Deliverability is influenced by external factors like recipient server spam filters, SPF/DKIM DNS configuration, and IP reputation.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="accept-terms"
                checked={termsAccepted}
                disabled={!hasReadTerms}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ width: 16, height: 16, cursor: hasReadTerms ? 'pointer' : 'not-allowed', marginTop: 2 }}
              />
              <label htmlFor="accept-terms" style={{ fontSize: 13, color: hasReadTerms ? 'var(--text)' : 'var(--text-muted)', cursor: hasReadTerms ? 'pointer' : 'not-allowed', fontWeight: 600, lineHeight: 1.4 }}>
                {hasReadTerms
                  ? 'By using this application, you grant permission for the app to send emails on your behalf.'
                  : 'Please scroll to the bottom of the terms container to enable acceptance.'}
              </label>
            </div>
          </div>
        )}

        {/* ─── STAGE 2: SELECT PROVIDER ─── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Select Email Provider</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Choose the delivery method that best matches your corporate infrastructure.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {PROVIDER_OPTIONS.map((opt) => {
                const isSelected = selectedProvider === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedProvider(opt.id)}
                    style={{
                      padding: '16px', borderRadius: 12, border: `2.5px solid ${isSelected ? 'var(--forest)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--forest-faint)' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      display: 'flex', flexDirection: 'column', gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{opt.name}</span>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--border)',
                        background: isSelected ? 'var(--forest)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{opt.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── STAGE 3: CONFIGURATION AND VERIFICATION ─── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Configure Outbound Settings</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Provide the required credentials to verify and activate {PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}.
            </p>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              
              {/* PLATFORM SENDER */}
              {selectedProvider === 'platform-sender' && (
                <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <CheckCircle2 size={36} style={{ color: 'var(--forest)', margin: '0 auto 8px' }} />
                  <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 14 }}>Upward Platform Sender Selected</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
                    Emails will be dispatched using Upward's secure, pre-verified platform servers. No custom domain or SMTP settings are required.
                  </p>
                </div>
              )}

              {/* MAILGUN FORM */}
              {selectedProvider === 'mailgun' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        disabled={registerMailgunMutation.isPending}
                        onClick={() => {
                          if (!mailgunDomain.trim()) {
                            toastError('Please enter a custom sending subdomain first.')
                            return
                          }
                          registerMailgunMutation.mutate()
                        }}
                      >
                        {registerMailgunMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Register'}
                      </button>
                    </div>
                    <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Note: We recommend utilizing a dedicated subdomain such as <code>mail.company.com</code>.
                    </small>
                  </div>

                  {mailgunRecords.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700 }}>DNS Records to Configure</h4>
                        <button
                          className="btn btn--secondary"
                          onClick={() => verifyMailgunMutation.mutate()}
                          disabled={verifyMailgunMutation.isPending}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 'auto', padding: '6px 12px', fontSize: 12 }}
                        >
                          {verifyMailgunMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Verify DNS'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {mailgunRecords.map((rec, i) => (
                          <div key={i} style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                              <span style={{ fontWeight: 700 }}>{rec.record_type}</span>
                              <span style={{ color: rec.status ? 'var(--forest)' : 'var(--clay)', fontWeight: 600 }}>
                                {rec.status ? 'Verified' : 'Pending'}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              <div><strong>Host:</strong> {rec.name}</div>
                              <div style={{ marginTop: 2 }}><strong>Value:</strong> {rec.value}</div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Secret Expiration Date</label>
                      <input className="form-input" type="date" value={officeSecretExpires} onChange={(e) => setOfficeSecretExpires(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">User Object ID</label>
                      <input className="form-input" value={officeUserObjectId} onChange={(e) => setOfficeUserObjectId(e.target.value)} />
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
                  }}>
                    <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to configure Office365 App Registration:</h4>
                    <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}>
                      <li>Log in to the <strong>Microsoft Entra admin center</strong> (Azure Portal).</li>
                      <li>Go to <strong>App registrations</strong> and click <strong>New registration</strong>.</li>
                      <li>Register the app and note down the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong>.</li>
                      <li>Go to <strong>Certificates & secrets</strong>, generate a new client secret, and copy the <strong>Secret Value</strong> (not ID).</li>
                      <li>Go to <strong>API permissions</strong> and grant Microsoft Graph application permissions: <code>Mail.Send</code>.</li>
                      <li>Under <strong>Users</strong>, find the target sending user account and copy their <strong>Object ID</strong>.</li>
                    </ol>
                  </div>

                  <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" id="enable-mailbox" checked={officeEnableMailbox} onChange={(e) => setOfficeEnableMailbox(e.target.checked)} />
                      <label htmlFor="enable-mailbox" style={{ fontSize: 12, color: 'var(--text)' }}>Enable Mailbox Syncing</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" id="enable-replyto" checked={officeEnableReplyTo} onChange={(e) => setOfficeEnableReplyTo(e.target.checked)} />
                      <label htmlFor="enable-replyto" style={{ fontSize: 12, color: 'var(--text)' }}>Enable custom Reply-To Routing</label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                    <button
                      className="btn btn--primary"
                      disabled={verifyOffice365Mutation.isPending}
                      onClick={() => {
                        if (!officeClientId.trim() || !officeTenantId.trim() || !officeClientSecret.trim() || !officeSecretExpires || !officeUserObjectId.trim()) {
                          toastError('Please fill in all directory, client secret, application ID, secret expiration, and user object ID fields.')
                          return
                        }
                        verifyOffice365Mutation.mutate()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 13 }}
                    >
                      {verifyOffice365Mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Verify Microsoft Graph Credentials
                    </button>
                  </div>
                </div>
              )}

              {/* GMAIL / ZOHO SMTP / YAHOO SMTP APP PASSWORD FORM */}
              {['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(selectedProvider) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" value={smtpEmail} onChange={(e) => setSmtpEmail(e.target.value)} placeholder="e.g. sender@gmail.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">App Password</label>
                    <input className="form-input" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
                  </div>

                  {/* Security Warning */}
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 10, padding: 12,
                    color: '#b45309', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
                    lineHeight: 1.4
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#d97706' }} />
                    <div>
                      <strong style={{ fontWeight: 700 }}>Security Warning:</strong> Use an App Password, not your regular password. Your regular account password will not work and may compromise your account security.
                    </div>
                  </div>

                  {/* How to generate guides */}
                  {selectedProvider === 'gmail' && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
                    }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to generate a Gmail App Password:</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}>
                        <li>Open Gmail and make sure you're signed in to the correct Google account.</li>
                        <li>In the top-right corner, click your profile picture.</li>
                        <li>Click <strong>Manage your Google Account</strong>.</li>
                        <li>Click on <strong>Security</strong> in the left sidebar.</li>
                        <li>Under <strong>Signing in to Google</strong>, click <strong>2-Step Verification</strong> (sign in again if prompted).</li>
                        <li>Scroll down and click <strong>App passwords</strong>.</li>
                        <li>In the App name field, type: <strong>Upward</strong></li>
                        <li>Click <strong>Create</strong> and copy the 16-character password.</li>
                      </ol>
                      <p style={{ marginTop: 8, fontSize: 11, fontStyle: 'italic', margin: '8px 0 0 0' }}>
                        * Note: You must have 2-Step Verification enabled to generate App passwords.
                      </p>
                    </div>
                  )}

                  {selectedProvider === 'zoho-smtp' && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
                    }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to generate a Zoho SMTP App Password:</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}>
                        <li>Log in to your Zoho Mail Account.</li>
                        <li>Go to <strong>My Account</strong> at the top right profile menu.</li>
                        <li>Select <strong>Security</strong> on the left panel, and choose <strong>App Passwords</strong>.</li>
                        <li>Click on <strong>Generate New Password</strong>.</li>
                        <li>Enter the App Name: <strong>Upward</strong></li>
                        <li>Click <strong>Generate</strong> and copy the app password.</li>
                      </ol>
                    </div>
                  )}

                  {selectedProvider === 'yahoo-smtp' && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
                    }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to generate a Yahoo SMTP App Password:</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}>
                        <li>Log in to your Yahoo Mail Account.</li>
                        <li>Click on your profile picture at the top right and go to <strong>Account Info</strong>.</li>
                        <li>Select <strong>Account Security</strong> from the left sidebar.</li>
                        <li>Scroll down and click on <strong>Generate app password</strong>.</li>
                        <li>Enter the App Name: <strong>Upward</strong></li>
                        <li>Click <strong>Generate</strong> and copy the 16-character app password.</li>
                      </ol>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                    <button
                      className="btn btn--primary"
                      disabled={verifySmtpMutation.isPending}
                      onClick={() => {
                        if (!smtpEmail.trim() || !smtpPassword.trim() || smtpPassword === '********') {
                          toastError('Please fill in both email and app password fields before testing.')
                          return
                        }
                        verifySmtpMutation.mutate()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 13 }}
                    >
                      {verifySmtpMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Test &amp; Save Connection
                    </button>
                  </div>
                </div>
              )}

              {/* OAUTH (GMAIL OAUTH & ZOHO OAUTH) FORM */}
              {['gmail-oauth', 'zoho-oauth'].includes(selectedProvider) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Client ID</label>
                    <input className="form-input" value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client Secret</label>
                    <input className="form-input" type="password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} />
                  </div>

                  {selectedProvider === 'gmail-oauth' && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
                    }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to get Gmail OAuth Credentials:</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}>
                        <li>Go to the <strong>Google Cloud Console</strong>.</li>
                        <li>Create or select a project, search for the <strong>Gmail API</strong> and enable it.</li>
                        <li>Configure the <strong>OAuth Consent Screen</strong> and add the scope: <code>https://www.googleapis.com/auth/gmail.send</code>.</li>
                        <li>Navigate to <strong>Credentials</strong>, click <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong> (Web application).</li>
                        <li>Add the Authorized Redirect URI: <code>{window.location.origin}/settings</code>.</li>
                        <li>Copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong>.</li>
                      </ol>
                    </div>
                  )}

                  {selectedProvider === 'zoho-oauth' && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
                    }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to get Zoho OAuth Credentials:</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}>
                        <li>Go to the <strong>Zoho Developer Console</strong>.</li>
                        <li>Click <strong>Add Client</strong> and choose <strong>Server-based Applications</strong>.</li>
                        <li>Enter a client name, homepage URL, and set the Authorized Redirect URI: <code>{window.location.origin}/settings</code>.</li>
                        <li>Click <strong>Create</strong> and copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong>.</li>
                      </ol>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => {
                        if (!oauthClientId.trim() || !oauthClientSecret.trim()) {
                          toastError('Please fill in both Client ID and Client Secret before authenticating.')
                          return
                        }
                        handleOAuthAuthenticate()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                    >
                      <ExternalLink size={14} /> Authenticate account
                    </button>
                    <input
                      className="form-input"
                      value={oauthCode}
                      onChange={(e) => setOauthCode(e.target.value)}
                      placeholder="Paste OAuth authorization code here..."
                      style={{ flex: 1 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                    <button
                      className="btn btn--primary"
                      disabled={verifyOauthMutation.isPending}
                      onClick={() => {
                        if (!oauthClientId.trim() || !oauthClientSecret.trim() || !oauthCode.trim()) {
                          toastError('Please fill in client ID, secret, and paste the returned OAuth code before verifying.')
                          return
                        }
                        verifyOauthMutation.mutate()
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 13 }}
                    >
                      {verifyOauthMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Verify OAuth Account Connection
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ─── STAGE 4: SENDER AND BRANDING IDENTITY ─── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Sender &amp; Branding Setup</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              Establish how messages look to your tenants and how your logo and signatures are configured.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Logo Section */}
              <div className="email-settings__logo-section">
                <h3 className="email-settings__logo-title" style={{ fontSize: 13, fontWeight: 700 }}>
                  <ImageIcon size={14} /> Company Logo
                </h3>
                <div className="email-settings__logo-row">
                  <div className="email-settings__logo-preview" style={{ height: 60, width: 100 }}>
                    {uploadingLogo && (
                      <div className="email-settings__logo-loader">
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--forest)' }} />
                      </div>
                    )}
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="email-settings__logo-img" />
                    ) : (
                      <ImageIcon size={20} style={{ color: 'var(--border)' }} />
                    )}
                  </div>
                  <div className="email-settings__logo-actions">
                    <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    <label htmlFor="logo-upload" className="btn btn--secondary email-settings__logo-upload-btn" style={{ padding: '6px 12px', fontSize: 12 }}>
                      <Upload size={12} /> {logoUrl ? 'Replace' : 'Upload'}
                    </label>
                    {logoUrl && (
                      <button onClick={() => setLogoUrl(null)} className="email-settings__logo-remove-btn" style={{ fontSize: 11 }}>
                        Remove
                      </button>
                    )}
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
                  <input
                    className="form-input"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    readOnly={selectedProvider === 'platform-sender'}
                    style={{
                      background: selectedProvider === 'platform-sender' ? 'var(--bg)' : undefined,
                      cursor: selectedProvider === 'platform-sender' ? 'not-allowed' : undefined
                    }}
                    placeholder="e.g. hello@yourdomain.com"
                  />
                </div>
              </div>

              <div className="email-settings__form-row">
                <div className="form-group">
                  <label className="form-label">CC Address (comma-separated)</label>
                  <textarea
                    className="form-input"
                    rows={getTextAreaRows(cc)}
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="e.g. cc1@domain.com, cc2@domain.com"
                    style={{ resize: 'none', transition: 'height 0.2s ease', padding: '10px 14px', minHeight: 40 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">BCC Address (comma-separated)</label>
                  <textarea
                    className="form-input"
                    rows={getTextAreaRows(bcc)}
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="e.g. bcc1@domain.com, bcc2@domain.com"
                    style={{ resize: 'none', transition: 'height 0.2s ease', padding: '10px 14px', minHeight: 40 }}
                  />
                </div>
              </div>

              {/* Font Preferences */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Document Font Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
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
              </div>

              {/* Email Signature Options Toggle */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Email Signature</h3>
                
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16
                }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Signature Method</h4>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="signatureMethod"
                        checked={useEmailSignature}
                        onChange={() => setUseEmailSignature(true)}
                        style={{ cursor: 'pointer' }}
                      />
                      Use Rich Email Signature Template
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="signatureMethod"
                        checked={!useEmailSignature}
                        onChange={() => setUseEmailSignature(false)}
                        style={{ cursor: 'pointer' }}
                      />
                      Use Footer &amp; Closing Statement
                    </label>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Choose between a rich, formatted email signature template or a traditional physical footer address with closing statement.
                  </span>
                </div>

                {useEmailSignature ? (
                  <div className="form-group">
                    <label className="form-label">Email Signature Template</label>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <Editor
                        init={{
                          height: 250,
                          menubar: false,
                          plugins: ['lists', 'link', 'image'],
                          toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | link image',
                          image_title: true,
                          automatic_uploads: true,
                          file_picker_types: 'image',
                          file_picker_callback: (cb, value, meta) => {
                            const input = document.createElement('input')
                            input.setAttribute('type', 'file')
                            input.setAttribute('accept', 'image/*')
                            input.onchange = async function () {
                              const file = (this as any).files?.[0]
                              if (!file) return
                              const reader = new FileReader()
                              reader.onload = async function () {
                                const base64Data = (reader.result as string).split(',')[1]
                                try {
                                  const { publicUrl } = await api.uploadLogo({ base64Data, contentType: file.type })
                                  cb(publicUrl, { title: file.name })
                                } catch (err: any) {
                                  alert('Image upload failed: ' + (err.message || 'Error'))
                                }
                              }
                              reader.readAsDataURL(file)
                            }
                            input.click()
                          }
                        }}
                        value={emailSignature}
                        onEditorChange={(content) => setEmailSignature(content)}
                      />
                    </div>
                    <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                      Create a professional email signature with formatting, colors, and styling. This will be automatically appended to all outgoing emails.
                    </small>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Footer Physical Address</label>
                      <textarea
                        className="form-input"
                        rows={4}
                        value={footerAddress}
                        onChange={(e) => setFooterAddress(e.target.value)}
                        placeholder="e.g. 15 Commercial Street, Lagos"
                        style={{ resize: 'none' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Closing Statement</label>
                      <textarea
                        className="form-input"
                        rows={4}
                        value={closingStatement}
                        onChange={(e) => setClosingStatement(e.target.value)}
                        placeholder="e.g. Warm regards, the team."
                        style={{ resize: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STAGE 5: SEND TEST EMAIL ─── */}
        {step === 5 && (
          <div>
            {testEmailMsg === 'success' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E6F9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <CheckCircle2 size={24} style={{ color: '#13B26B' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Email configuration complete!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Your test email was sent successfully. You can now send emails from the system.
                </p>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    success('Email setup has been completed successfully!')
                    queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
                    router.push('/dashboard')
                  }}
                  style={{ padding: '10px 32px', borderRadius: 24, fontSize: 13 }}
                >
                  Finish
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Send Test Email</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                  Verify that your outbound delivery setup compiles and sends correctly.
                </p>

                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
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
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {sendTestEmailMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send Test
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', background: '#fff', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10, borderRadius: '0 0 12px 12px'
      }}>
        {step > 1 ? (
          <button
            className="btn btn--secondary"
            onClick={() => setStep(step - 1)}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13 }}
          >
            <ChevronLeft size={14} /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            className="btn btn--primary"
            disabled={saveSenderBrandingMutation.isPending}
            onClick={() => {
              if (step === 1 && !termsAccepted) {
                toastError('Please read and accept the Email Configuration Terms & Conditions.')
                return
              }
              if (step === 3 && !isStep3Valid()) {
                if (selectedProvider === 'mailgun') {
                  toastError('Please register and verify your custom Mailgun domain.')
                } else if (selectedProvider === 'office365') {
                  toastError('Please verify your Microsoft Graph connection credentials.')
                } else if (['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(selectedProvider)) {
                  toastError('Please test and verify your SMTP app password credentials.')
                } else {
                  toastError('Please authenticate and verify your OAuth account connection.')
                }
                return
              }
              if (step === 4) {
                if (!senderName.trim()) {
                  toastError('Sender Name is required.')
                  return
                }
                if (!senderEmail.trim()) {
                  toastError('Sender Email Address is required.')
                  return
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim())) {
                  toastError('Please enter a valid Sender Email Address.')
                  return
                }

                // Validate CC addresses
                if (cc.trim()) {
                  const ccEmails = cc.split(/[,;\n]/).map(e => e.trim()).filter(Boolean)
                  for (const email of ccEmails) {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      toastError(`Invalid CC Email Address: ${email}`)
                      return
                    }
                  }
                }

                // Validate BCC addresses
                if (bcc.trim()) {
                  const bccEmails = bcc.split(/[,;\n]/).map(e => e.trim()).filter(Boolean)
                  for (const email of bccEmails) {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      toastError(`Invalid BCC Email Address: ${email}`)
                      return
                    }
                  }
                }

                // Validate signature block
                if (useEmailSignature) {
                  if (!emailSignature.trim() || emailSignature === '<p></p>') {
                    toastError('Please enter content for your Email Signature Template.')
                    return
                  }
                } else {
                  if (!footerAddress.trim()) {
                    toastError('Footer Physical Address is required.')
                    return
                  }
                  if (!closingStatement.trim()) {
                    toastError('Closing Statement is required.')
                    return
                  }
                }

                // Save configurations to DB and advance step on success
                saveSenderBrandingMutation.mutate()
                return
              }
              setStep(step + 1)
            }}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13 }}
          >
            {saveSenderBrandingMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Next'} <ChevronRight size={14} />
          </button>
        ) : (
          <button
            className="btn btn--primary"
            onClick={() => {
              success('Email setup has been completed successfully!')
              queryClient.invalidateQueries({ queryKey: ['emailSettings'] })
              router.push('/dashboard')
            }}
            style={{ padding: '8px 24px', borderRadius: 20, fontSize: 13 }}
          >
            Finish Setup
          </button>
        )}
      </div>

      <style jsx>{`
        .hidden { display: none; }
      `}</style>
    </div>
  )
}
