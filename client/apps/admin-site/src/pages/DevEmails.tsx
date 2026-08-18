import React, { useState, useEffect } from 'react'
import {
  Mail,
  Search,
  Trash2,
  RefreshCcw,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileText,
  Paperclip,
  Download,
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface DevEmail {
  id: number
  uuid: string
  from?: string | null
  to: string
  cc?: string | null
  bcc?: string | null
  subject: string
  html: string
  text: string | null
  createdAt: string
  attachments?: Array<{ filename: string; url: string }>
}

interface DevEmailsProps {
  token: string
}

const DevEmails: React.FC<DevEmailsProps> = ({ token }) => {
  const [emails, setEmails] = useState<DevEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Filters
  const [search, setSearch] = useState('')

  // Selected Email for Detail View
  const [selectedEmail, setSelectedEmail] = useState<DevEmail | null>(null)
  const [viewMode, setViewMode] = useState<'HTML' | 'TEXT'>('HTML')

  const fetchEmailDetails = async (uuid: string) => {
    try {
      const response = await apiService.get(`/admin/dev-emails/${uuid}`, token)
      if (response) {
        setSelectedEmail(response)
      }
    } catch (error) {
      console.error('Failed to fetch dev email details:', error)
    }
  }

  const fetchEmails = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/dev-emails?page=${pageNum}&limit=30`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setEmails(response.data)
        setTotalPages(response.meta.totalPages)

        // Select the first email if none selected yet
        if (response.data.length > 0 && !selectedEmail) {
          fetchEmailDetails(response.data[0].uuid)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dev emails:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmails(page)
  }, [page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEmails(1)
  }

  const handleRefresh = () => {
    fetchEmails(page)
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all dev preview emails?')) {
      return
    }
    try {
      await apiService.delete('/admin/dev-emails', token)
      setEmails([])
      setSelectedEmail(null)
      setTotalPages(1)
    } catch (error) {
      console.error('Failed to clear dev emails:', error)
    }
  }

  return (
    <div
      className="page-container"
      style={{
        height: isMobile ? 'auto' : 'calc(100vh - 120px)',
        minHeight: isMobile ? 'auto' : '650px',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: isMobile ? '40px' : '0',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: '20px',
          gap: isMobile ? '12px' : '0',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mail size={22} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0, fontSize: '20px' }}>
              Local Dev Email Sandbox
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
              Inspect and preview all outbound OTP, verification, and template emails in your local/dev environment.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <RefreshCcw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              color: 'var(--danger)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <Trash2 size={15} />
            Clear Sandbox
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : '350px 1fr',
          gap: '20px',
          flex: isMobile ? 'none' : 1,
          minHeight: 0, // critical for nested scrolling
        }}
      >
        {/* Left Pane - Email List */}
        <div
          className="card"
          style={{
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--white)',
            height: isMobile ? '380px' : '100%',
            minHeight: isMobile ? '380px' : '0',
          }}
        >
          {/* List Search */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search by recipient or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '13px',
                }}
              />
            </form>
          </div>

          {/* List Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && emails.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="loader" style={{ margin: '0 auto' }}></div>
              </div>
            ) : emails.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No emails captured. Send a verification code or reset password request in dev environment to test.
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.uuid === email.uuid
                
                // Extract name from "Name <email@domain.com>" or just use the email
                const rawFrom = email.from || 'System Default'
                let fromName = rawFrom
                if (rawFrom.includes('<')) {
                  fromName = rawFrom.split('<')[0].replace(/"/g, '').trim()
                }

                return (
                  <div
                    key={email.id}
                    onClick={() => {
                      fetchEmailDetails(email.uuid)
                      setViewMode('HTML')
                    }}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-faint)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--accent)' : '4px solid transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}>
                        {fromName}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {email.subject}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      To: {email.to}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* List Pagination Footer */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface)',
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', minWidth: 'auto' }}
              >
                <ArrowLeft size={14} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', minWidth: 'auto' }}
              >
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Right Pane - Sandbox Preview Canvas */}
        <div
          className="card"
          style={{
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--white)',
            height: isMobile ? '600px' : '100%',
            minHeight: isMobile ? '600px' : '0',
          }}
        >
          {selectedEmail ? (
            <>
              {/* Preview Header Metadata (Gmail Style) */}
              <div
                style={{
                  padding: '24px 32px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--white)',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: isMobile ? '16px' : '0',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                  {/* Sender Avatar */}
                  {(() => {
                    const rawFrom = selectedEmail.from || 'System Default'
                    let initial = 'S'
                    if (rawFrom.includes('<')) {
                      const namePart = rawFrom.split('<')[0].replace(/"/g, '').trim()
                      initial = namePart ? namePart.charAt(0).toUpperCase() : 'S'
                    } else {
                      initial = rawFrom.charAt(0).toUpperCase()
                    }
                    
                    // Simple hash for consistent colors
                    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6']
                    const colorIndex = initial.charCodeAt(0) % colors.length
                    const bgColor = colors[colorIndex]

                    return (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: bgColor,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}>
                        {initial}
                      </div>
                    )
                  })()}

                  {/* Header Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: 'var(--text-dark)', lineHeight: 1.2 }}>
                        {selectedEmail.subject}
                      </h2>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '16px' }}>
                        {new Date(selectedEmail.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: 500, marginBottom: '2px' }}>
                      {selectedEmail.from || 'System Default'}
                    </div>
                    
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div><span style={{ fontWeight: 500 }}>To:</span> {selectedEmail.to}</div>
                      {selectedEmail.cc && <div><span style={{ fontWeight: 500 }}>CC:</span> {selectedEmail.cc}</div>}
                      {selectedEmail.bcc && <div><span style={{ fontWeight: 500 }}>BCC:</span> {selectedEmail.bcc}</div>}
                    </div>

                    {/* Attachments */}
                    {selectedEmail.attachments && Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: '16px',
                        }}
                      >
                        {selectedEmail.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            download={att.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '20px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              color: 'var(--accent)',
                              fontWeight: 600,
                              textDecoration: 'none',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Paperclip size={14} />
                            <span>{att.filename}</span>
                            <Download size={12} style={{ marginLeft: '4px', opacity: 0.7 }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '3px',
                    alignSelf: isMobile ? 'flex-start' : 'center',
                  }}
                >
                  <button
                    onClick={() => setViewMode('HTML')}
                    style={{
                      border: 'none',
                      background: viewMode === 'HTML' ? 'var(--accent)' : 'transparent',
                      color: viewMode === 'HTML' ? 'var(--white)' : 'var(--text-muted)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Eye size={13} />
                    HTML Live View
                  </button>
                  <button
                    onClick={() => setViewMode('TEXT')}
                    style={{
                      border: 'none',
                      background: viewMode === 'TEXT' ? 'var(--accent)' : 'transparent',
                      color: viewMode === 'TEXT' ? 'var(--white)' : 'var(--text-muted)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FileText size={13} />
                    Plain Text
                  </button>
                </div>
              </div>

              {/* Preview Body Area */}
              <div style={{ flex: 1, padding: '24px', background: '#f5f5f5', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {viewMode === 'HTML' ? (
                  <iframe
                    title="email-preview-frame"
                    srcDoc={selectedEmail.html}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '12px',
                      background: '#ffffff',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <textarea
                    readOnly
                    value={selectedEmail.text || 'No plain text content.'}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      background: '#ffffff',
                      color: '#333333',
                      resize: 'none',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '40px',
                color: 'var(--text-muted)',
                gap: '12px',
              }}
            >
              <Mail size={48} style={{ opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No Email Selected</p>
              <p style={{ margin: 0, fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                Select an email from the list to preview its rendered HTML output or text body.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DevEmails
