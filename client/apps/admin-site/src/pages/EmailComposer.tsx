import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Search, Users, Monitor, EyeOff, Building2, Clock, Mail } from 'lucide-react'
import { Editor } from '@hugerte/hugerte-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import {
  EmailReviewModal,
  type EmailRecipient,
} from '../features/emails/components/EmailReviewModal'
import { EmailConfirmModal } from '../features/emails/components/EmailConfirmModal'

interface EmailComposerProps {
  token: string
  adminEmail?: string
}

const buildPreviewHtml = (content: string, _subject: string = 'Upward Update') => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media screen and (max-width: 600px) {
      .main-card { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .content-padding { padding: 32px 20px !important; }
      .footer-padding { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #F9FAFB;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="background-color: #F9FAFB; padding: 40px 0;" class="footer-padding">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="main-card">
          <tr>
            <td style="height: 4px; background-color: #d97757; border-radius: 16px 16px 0 0;"></td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 48px 40px; border-radius: 0 0 16px 16px; border: 1px solid #E5E7EB; border-top: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" class="content-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 40px;">
                <tr>
                  <td>
                    <span style="color: #d97757; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">Upward</span>
                    <div style="color: #6B7280; font-size: 12px; margin-top: 4px; font-weight: 500;">by GoodTenants</div>
                  </td>
                </tr>
              </table>
              <div style="color: #374151; font-size: 16px; line-height: 1.7; word-break: break-word;">
                ${content
                  .replace(/{{firstName}}/g, 'Alex')
                  .replace(/{{lastName}}/g, 'Smith')
                  .replace(/{{email}}/g, 'alex.smith@example.com')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; text-align: center;" class="footer-padding">
              <p style="margin: 0 0 12px 0; color: #9CA3AF; font-size: 12px; line-height: 1.6;">
                You're receiving this because you're part of the Upward community.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px;">
                <tr>
                  <td align="center">
                    <a href="https://upward.goodtenants.io" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Our Website</a>
                    <span style="color: #D1D5DB; padding: 0 12px;">&nbsp;&bull;&nbsp;</span>
                    <a href="mailto:hello@goodtenants.africa" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Contact Support</a>
                    <span style="color: #D1D5DB; padding: 0 12px;">&nbsp;&bull;&nbsp;</span>
                    <a href="#" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #D1D5DB; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
                © 2026 Upward by GoodTenants
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const EmailComposer: React.FC<EmailComposerProps> = ({ token, adminEmail }) => {
  const location = useLocation()

  // Recipients & Target State
  const [targetGroup, setTargetGroup] = useState<'TENANTS' | 'PMS' | 'WAITLIST' | 'RAW'>('TENANTS')
  const [recipients, setRecipients] = useState<EmailRecipient[]>([])

  // Form Fields
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  // Testing Fields
  const [testEmails, setTestEmails] = useState('')
  const [testSending, setTestSending] = useState(false)

  // Modals & Panels
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)

  // Search & Suggestions
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; email: string }[]>([])

  // Directory Caching
  const [directoryData, setDirectoryData] = useState<{
    tenants: any[]
    pms: any[]
    waitlist: any[]
  }>({ tenants: [], pms: [], waitlist: [] })
  const [loadingDirectory, setLoadingDirectory] = useState(false)

  const editorRef = useRef<any>(null)

  // Load selection from navigation state (Dashboard router redirects)
  useEffect(() => {
    const state = location.state
    if (state?.selectedUsers && Array.isArray(state.selectedUsers)) {
      const mapped = state.selectedUsers.map((u: any) => ({
        id: u.uuid || u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`.trim(),
        type: u.origin === 'WAITLIST' ? ('WAITLIST' as const) : ('TENANT' as const),
      }))
      setRecipients(mapped)
      // Deduce target group (Tenants vs Waitlist)
      const hasTenants = mapped.some((r: any) => r.type === 'TENANT')
      setTargetGroup(hasTenants ? 'TENANTS' : 'WAITLIST')
    } else if (state?.selectedPms && Array.isArray(state.selectedPms)) {
      const mapped = state.selectedPms.map((p: any) => ({
        id: p.uuid || p.id,
        email: p.email,
        name: p.businessName || `${p.firstName} ${p.lastName}`.trim(),
        type: 'PM' as const,
      }))
      setRecipients(mapped)
      setTargetGroup('PMS')
    }
  }, [location.state])

  // Cache database directory for local instant search
  useEffect(() => {
    const fetchDirectories = async () => {
      setLoadingDirectory(true)
      try {
        const res = await apiService.get('/admin/performance-metrics', token)

        const isValidEmail = (email: string) => {
          if (!email) return false
          const e = email.toLowerCase()
          return e.includes('@') && !e.endsWith('@upward.com') && !e.endsWith('@upward.local')
        }

        const allTenants = [
          ...(res.directories?.signedUp || []),
          ...(res.directories?.invited || []),
        ].filter((t) => isValidEmail(t.email) && t.hasPassword)

        setDirectoryData({
          tenants: allTenants,
          pms: res.directories?.pms || [],
          waitlist: res.directories?.waitlist || [],
        })
      } catch (err) {
        console.error('Failed to fetch directories', err)
      } finally {
        setLoadingDirectory(false)
      }
    }
    fetchDirectories()
  }, [token])

  // Get active directory array based on targetGroup
  const getActiveDirectory = () => {
    if (targetGroup === 'TENANTS') return directoryData.tenants
    if (targetGroup === 'PMS') return directoryData.pms
    return directoryData.waitlist
  }

  // Handle autocomplete search inputs locally
  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    if (!val.trim()) {
      setSuggestions([])
      return
    }

    const s = val.toLowerCase()
    const activeDir = getActiveDirectory()

    const matches = activeDir
      .filter((item: any) => {
        const email = item.email || ''
        const firstName = item.firstName || ''
        const lastName = item.lastName || ''
        const bizName = item.businessName || ''
        return (
          email.toLowerCase().includes(s) ||
          firstName.toLowerCase().includes(s) ||
          lastName.toLowerCase().includes(s) ||
          bizName.toLowerCase().includes(s)
        )
      })
      .slice(0, 10)
      .map((item: any) => {
        let name = ''
        if (targetGroup === 'PMS') {
          name = item.businessName || `${item.firstName} ${item.lastName}`.trim()
        } else {
          name = `${item.firstName} ${item.lastName}`.trim()
        }
        return {
          id: item.uuid || item.id,
          name: name || 'N/A',
          email: item.email || '',
        }
      })

    setSuggestions(matches)
  }

  const handleAddSelectedRecipient = (item: { id: string; name: string; email: string }) => {
    if (recipients.some((r) => r.id === item.id)) {
      showToast('Recipient already added', true)
      return
    }
    setRecipients((prev) => [
      ...prev,
      {
        id: item.id,
        email: item.email,
        name: item.name,
        type: targetGroup === 'TENANTS'
          ? 'TENANT'
          : targetGroup === 'PMS'
            ? 'PM'
            : targetGroup === 'WAITLIST'
              ? 'WAITLIST'
              : 'RAW',
      },
    ])
    setSearchTerm('')
    setSuggestions([])
  }

  const handleAddAllFromDirectory = () => {
    const activeDir = getActiveDirectory()
    if (activeDir.length === 0) return

    const formatted = activeDir.map((item: any) => {
      let name = ''
      if (targetGroup === 'PMS') {
        name = item.businessName || `${item.firstName} ${item.lastName}`.trim()
      } else {
        name = `${item.firstName} ${item.lastName}`.trim()
      }
      return {
        id: item.uuid || item.id,
        email: item.email,
        name: name || 'N/A',
        type:
          targetGroup === 'TENANTS'
            ? ('TENANT' as const)
            : targetGroup === 'PMS'
              ? ('PM' as const)
              : ('WAITLIST' as const),
      }
    })

    setRecipients((prev) => {
      const existingIds = new Set(prev.map((r) => r.id))
      const filtered = formatted.filter((f) => !existingIds.has(f.id))
      return [...prev, ...filtered]
    })

    showToast(`Added matching recipients to send list!`)
  }

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(`{{${variable}}}`)
    } else {
      setContent((prev) => prev + ` {{${variable}}}`)
    }
  }

  const handleSendTestToSelf = async () => {
    if (!adminEmail) return
    if (!subject.trim()) {
      showToast('Subject line is required before sending test email', true)
      return
    }
    if (!content.trim()) {
      showToast('Email body is required before sending test email', true)
      return
    }
    handleSendTest([adminEmail])
  }

  const handleSendTestToCustom = async () => {
    if (!subject.trim()) {
      showToast('Subject line is required before sending test email', true)
      return
    }
    if (!content.trim()) {
      showToast('Email body is required before sending test email', true)
      return
    }
    const emails = testEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'))

    if (emails.length === 0) {
      showToast('Please enter at least one valid test email address', true)
      return
    }
    handleSendTest(emails)
  }

  const handleSendTest = async (emails: string[]) => {
    if (!subject || !content) {
      showToast('Subject and email body are required for testing', true)
      return
    }

    setTestSending(true)
    try {
      const res = await apiService.post(
        '/admin/email/test-send',
        { emails, subject, content },
        token,
      )
      const failed = res.data?.filter((r: any) => r.status === 'FAILED') || []
      if (failed.length > 0) {
        const errMsgs = failed.map((f: any) => `${f.email}: ${f.error}`).join(', ')
        showToast(`Failed to dispatch test emails: ${errMsgs}`, true)
      } else {
        showToast(`Test email dispatched successfully! ✓`)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || 'Failed to send test emails', true)
    } finally {
      setTestSending(false)
    }
  }

  const handleInitiateBulkSend = () => {
    if (recipients.length === 0) {
      showToast('Please specify at least one recipient', true)
      return
    }
    if (!subject.trim()) {
      showToast('Subject line is required', true)
      return
    }
    if (!content.trim()) {
      showToast('Email body is required', true)
      return
    }
    setShowConfirmModal(true)
  }

  const handleConfirmedSend = async () => {
    setSending(true)
    try {
      await apiService.post(
        '/admin/email/bulk',
        {
          userIds: recipients.map((r) => r.id),
          subject,
          content,
          targetGroup: targetGroup,
        },
        token,
      )
      showToast(`Bulk email queue successfully triggered for ${recipients.length} recipients! ✓`)
      setSubject('')
      setContent('')
      setRecipients([])
      setShowConfirmModal(false)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || 'Failed to process bulk dispatch', true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '40px' }}>
      <div
        className="page-header flex-mobile-column"
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mail size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Ecosystem Campaign Emailer
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Draft beautiful rich-text HTML communications and send them to customized segments.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPreviewPanel(!showPreviewPanel)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: showPreviewPanel ? 'rgba(217,119,87,0.08)' : 'var(--white)',
            color: showPreviewPanel ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showPreviewPanel ? <EyeOff size={15} /> : <Monitor size={15} />}
          {showPreviewPanel ? 'Hide Live Preview' : 'Show Live Preview'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showPreviewPanel ? '1fr 400px' : '1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: EDITOR & RECIPIENTS */}
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}
        >
          {/* Recipient Segment Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Active Recipients</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--accent-faint)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {recipients.length} Recipient(s)
                </span>
                {recipients.length > 0 && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    style={{
                      fontSize: '12px',
                      color: 'var(--accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Review List
                  </button>
                )}
              </div>
            </div>

            {/* Target Group Selector (Only show if not navigated from dashboard selection state) */}
            {!location.state?.selectedUsers && !location.state?.selectedPms && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                {(['TENANTS', 'PMS', 'WAITLIST', 'RAW'] as const).map((group) => {
                  const label =
                    group === 'TENANTS'
                      ? 'Tenants'
                      : group === 'PMS'
                        ? 'Property Managers'
                        : group === 'WAITLIST'
                          ? 'Waitlist Contacts'
                          : 'Custom List (Raw)'
                  const Icon = group === 'TENANTS' ? Users : group === 'PMS' ? Building2 : group === 'WAITLIST' ? Clock : Mail
                  return (
                    <button
                      key={group}
                      onClick={() => {
                        setTargetGroup(group)
                        setRecipients([])
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: targetGroup === group ? 'var(--accent)' : 'var(--border)',
                        background: targetGroup === group ? 'var(--accent-faint)' : 'var(--white)',
                        color: targetGroup === group ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Local Search Input & Auto-suggestions */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={16}
                    color="var(--text-muted)"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder={targetGroup === 'RAW' ? "Enter or paste custom email addresses..." : `Search and add ${targetGroup === 'TENANTS' ? 'tenants' : targetGroup === 'PMS' ? 'property managers' : 'waitlist contacts'} by name or email...`}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const trimmed = searchTerm.trim().toLowerCase()
                        if (trimmed && trimmed.includes('@')) {
                          handleAddSelectedRecipient({
                            id: trimmed,
                            name: trimmed,
                            email: trimmed,
                          })
                        }
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('Text')
                      const potentialEmails = text
                        .split(/[\n,;\s]+/)
                        .map((t) => t.trim().toLowerCase())
                        .filter((t) => t.length > 0)
                      const validEmails = potentialEmails.filter((t) => t.includes('@'))

                      if (validEmails.length > 0) {
                        e.preventDefault()
                        if (targetGroup === 'RAW') {
                          setRecipients((prev) => {
                            const existingEmails = new Set(prev.map((r) => r.email.toLowerCase()))
                            const newRecipients = validEmails
                              .filter((email) => !existingEmails.has(email))
                              .map((email) => ({
                                id: email,
                                email: email,
                                name: email,
                                type: 'RAW' as const,
                              }))
                            return [...prev, ...newRecipients]
                          })
                          showToast(`Successfully added ${validEmails.length} custom email(s)!`)
                        } else {
                          const activeDir = getActiveDirectory()
                          const matchedUsers = activeDir.filter(
                            (item: any) =>
                              item.email && validEmails.includes(item.email.toLowerCase()),
                          )

                          if (matchedUsers.length > 0) {
                            setRecipients((prev) => {
                              const existingIds = new Set(prev.map((r) => r.id))
                              const newRecipients = matchedUsers
                                .filter((u: any) => !existingIds.has(u.uuid || u.id))
                                .map((item: any) => {
                                  let name = ''
                                  if (targetGroup === 'PMS') {
                                    name =
                                      item.businessName || `${item.firstName} ${item.lastName}`.trim()
                                  } else {
                                    name = `${item.firstName} ${item.lastName}`.trim()
                                  }
                                  return {
                                    id: item.uuid || item.id,
                                    email: item.email,
                                    name: name || 'N/A',
                                    type: (targetGroup === 'TENANTS'
                                      ? 'TENANT'
                                      : targetGroup === 'PMS'
                                        ? 'PM'
                                        : 'WAITLIST') as 'TENANT' | 'PM' | 'WAITLIST',
                                  }
                                })
                              return [...prev, ...newRecipients]
                            })
                            showToast(
                              `Successfully added ${matchedUsers.length} matching recipient(s)!`,
                            )
                          } else {
                            showToast(`No matching recipients found for the pasted emails`, true)
                          }
                        }
                        setSearchTerm('')
                        setSuggestions([])
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                {!location.state?.selectedUsers && !location.state?.selectedPms && (
                  <button
                    onClick={handleAddAllFromDirectory}
                    disabled={loadingDirectory || getActiveDirectory().length === 0}
                    style={{
                      padding: '10px 16px',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Add All Matching
                  </button>
                )}
              </div>

              {suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    marginTop: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddSelectedRecipient(item)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      className="dropdown-item"
                    >
                      <div>
                        <strong style={{ display: 'block' }}>{item.name}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {item.email}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                        + Add
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subject Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Subject Line</label>
            <input
              type="text"
              placeholder="Enter campaign subject line..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* HugeRTE Document Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Email Body Content</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['firstName', 'lastName', 'email'].map((variable) => (
                  <button
                    key={variable}
                    onClick={() => insertVariable(variable)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      background: 'var(--surface-hover)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    +{' '}
                    {variable === 'firstName'
                      ? 'First Name'
                      : variable === 'lastName'
                        ? 'Last Name'
                        : 'Email'}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <Editor
                value={content}
                onInit={(_evt, editor) => {
                  editorRef.current = editor
                }}
                onEditorChange={(newVal) => setContent(newVal)}
                init={{
                  height: 400,
                  menubar: false,
                  placeholder: 'Compose content here...',
                  plugins: [
                    'advlist',
                    'autolink',
                    'lists',
                    'link',
                    'image',
                    'charmap',
                    'searchreplace',
                    'visualblocks',
                    'code',
                    'fullscreen',
                    'table',
                    'help',
                    'wordcount',
                  ],
                  toolbar:
                    'undo redo | blocks fontfamily fontsize | ' +
                    'bold italic forecolor backcolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'link localimage table | removeformat code',
                  toolbar_mode: 'wrap',
                  setup: (editor: any) => {
                    editor.ui.registry.addButton('localimage', {
                      icon: 'image',
                      tooltip: 'Insert Image from Device',
                      onAction: () => {
                        const input = document.createElement('input')
                        input.setAttribute('type', 'file')
                        input.setAttribute('accept', 'image/*')
                        input.onchange = function () {
                          const file = (this as any).files[0]
                          if (!file) return

                          const reader = new FileReader()
                          reader.onload = async function () {
                            const base64Data = (reader.result as string).split(',')[1]
                            try {
                              showToast('Uploading image to storage...', false)
                              const res = await apiService.post(
                                '/admin/email/upload-image',
                                {
                                  base64Data,
                                  contentType: file.type,
                                  originalName: file.name,
                                },
                                token,
                              )
                              if (res && res.url) {
                                editor.insertContent(
                                  `<img src="${res.url}" alt="${file.name}" style="max-width: 100%; height: auto;" />`,
                                )
                                showToast('Image uploaded and inserted! ✓')
                              } else {
                                showToast('Failed to upload image', true)
                              }
                            } catch (err: any) {
                              console.error('Image upload failed:', err)
                              showToast(err.message || 'Image upload failed', true)
                            }
                          }
                          reader.readAsDataURL(file)
                        }
                        input.click()
                      },
                    })
                  },
                  content_style:
                    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #374151; padding: 16px; }',
                  branding: false,
                  promotion: false,
                  skin: 'oxide',
                  content_css: 'default',
                }}
              />
            </div>
          </div>

          {/* Call to action */}
          <button
            onClick={handleInitiateBulkSend}
            disabled={sending || recipients.length === 0}
            style={{
              padding: '14px',
              backgroundColor: 'var(--accent)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              transition: 'var(--transition)',
              opacity: sending || recipients.length === 0 ? 0.6 : 1,
              cursor: sending || recipients.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Mail size={16} />
            Send to {recipients.length} Recipient(s)
          </button>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW & TESTING */}
        {showPreviewPanel && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'sticky',
              top: '24px',
            }}
          >
            {/* Live Letterhead Preview */}
            <div
              className="card"
              style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div
                style={{
                  padding: '12px 20px',
                  background: 'var(--surface-hover)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
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
                  Live Letterhead Preview
                </span>
              </div>
              <div style={{ background: '#f3f4f6', height: '420px', position: 'relative' }}>
                {content.trim() || subject.trim() ? (
                  <iframe
                    srcDoc={buildPreviewHtml(content, subject)}
                    title="Real-time letterhead preview"
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
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
                      gap: '8px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Monitor size={32} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: '13px' }}>Type to preview rendering...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test Send Card */}
            <div className="card" style={{ padding: '20px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Send size={15} color="var(--accent)" /> Dispatch Test Copy
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adminEmail && (
                  <button
                    onClick={handleSendTestToSelf}
                    disabled={testSending}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'var(--accent-faint)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent-muted)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: testSending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      opacity: testSending ? 0.6 : 1,
                    }}
                  >
                    <Mail size={13} />
                    Send test to myself ({adminEmail})
                  </button>
                )}

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', margin: '4px 0' }}>
                  <div style={{ height: '1px', flex: 1, background: 'var(--border)' }}></div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    or custom emails
                  </span>
                  <div style={{ height: '1px', flex: 1, background: 'var(--border)' }}></div>
                </div>

                <input
                  type="text"
                  placeholder="Enter test email address..."
                  value={testEmails}
                  onChange={(e) => setTestEmails(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={handleSendTestToCustom}
                  disabled={testSending || !testEmails.trim()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--text)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: testSending || !testEmails.trim() ? 'not-allowed' : 'pointer',
                    opacity: testSending || !testEmails.trim() ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  Send Custom Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <EmailReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        recipients={recipients}
        onRemoveRecipient={(id) => setRecipients((prev) => prev.filter((r) => r.id !== id))}
        onClearAll={() => setRecipients([])}
      />

      <EmailConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSend}
        recipientsCount={recipients.length}
        targetGroup={targetGroup}
        subject={subject}
        content={content}
        sending={sending}
        buildPreviewHtml={buildPreviewHtml}
      />
    </div>
  )
}

export default EmailComposer
