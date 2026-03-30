import React, { useState, useEffect, useCallback } from 'react'
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Play,
  ToggleLeft,
  ToggleRight,
  Users,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface Campaign {
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

interface AudiencePreview {
  weekNumber: number
  userCount: number
  hasCampaign: boolean
  campaignLabel: string | null
  campaignSubject: string | null
  isActive: boolean
}

interface TriggerResult {
  processed: number
  sent: number
  failed: number
  skipped: number
  details: { weekNumber: number; userCount: number; sent: number; failed: number; status: string }[]
}

interface WaitlistCampaignsProps {
  token: string
}

const DEFAULT_WEEK1_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background-color:#F9FAFB;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;border:1px solid #E5E7EB;">
        <tr><td style="height:4px;background-color:#d97757;"></td></tr>
        <tr><td style="padding:40px;">
          <div style="margin-bottom:32px;">
            <span style="color:#d97757;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
            <div style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
          </div>
          <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 20px 0;">Welcome to Upward, {{firstName}}!</h1>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
            You're officially on the Upward waitlist — and we couldn't be more excited to have you here.
          </p>
          <p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Upward is building a pathway to better rental terms, financial services, and eventually homeownership — with a community of people building the same future.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="background-color:#FFF7ED;border:1px solid #FFEDD5;border-radius:12px;padding:24px;">
                <div style="color:#9A3412;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">What to expect</div>
                <p style="color:#431407;font-size:15px;margin:0;line-height:1.5;">Every week we'll send you updates, housing insights, and tips to help you prepare for early access to Upward.</p>
              </td>
            </tr>
          </table>
          <p style="color:#6B7280;font-size:15px;margin:0;">Stay tuned — exciting things are coming.</p>
          <p style="color:#d97757;font-size:16px;margin-top:12px;font-weight:600;">The Upward Team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const WaitlistCampaigns: React.FC<WaitlistCampaignsProps> = ({ token }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [audience, setAudience] = useState<AudiencePreview[]>([])
  const [loading, setLoading] = useState(true)
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showAudience, setShowAudience] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  // Form state
  const [form, setForm] = useState({
    weekNumber: 1,
    subject: '',
    label: '',
    htmlContent: DEFAULT_WEEK1_HTML,
    textContent: '',
    isActive: true,
  })

  const fetchCampaigns = useCallback(async () => {
    try {
      const result = await apiService.get('/admin/campaigns', token)
      setCampaigns(result.data)
    } catch {
      showToast('Failed to load campaigns', true)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchAudience = useCallback(async () => {
    setAudienceLoading(true)
    try {
      const result = await apiService.get('/admin/campaigns/preview', token)
      setAudience(result.data)
    } catch {
      showToast('Failed to load audience preview', true)
    } finally {
      setAudienceLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const openCreateEditor = () => {
    const nextWeek = campaigns.length > 0 ? Math.max(...campaigns.map((c) => c.weekNumber)) + 1 : 1
    setEditingCampaign(null)
    setForm({
      weekNumber: nextWeek,
      subject:
        nextWeek === 1
          ? "Welcome to Upward — You're officially on the waitlist"
          : `Week ${nextWeek}: Updates from Upward`,
      label: nextWeek === 1 ? 'Welcome to Upward' : `Week ${nextWeek} Update`,
      htmlContent: DEFAULT_WEEK1_HTML,
      textContent: '',
      isActive: true,
    })
    setShowEditor(true)
  }

  const openEditEditor = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setForm({
      weekNumber: campaign.weekNumber,
      subject: campaign.subject,
      label: campaign.label ?? '',
      htmlContent: campaign.htmlContent,
      textContent: campaign.textContent ?? '',
      isActive: campaign.isActive,
    })
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!form.subject || !form.htmlContent) {
      showToast('Subject and HTML content are required', true)
      return
    }
    try {
      await apiService.post('/admin/campaigns', { ...form }, token)
      showToast(
        editingCampaign
          ? `Week ${form.weekNumber} updated ✓`
          : `Week ${form.weekNumber} campaign created ✓`,
      )
      setShowEditor(false)
      fetchCampaigns()
    } catch {
      showToast('Failed to save campaign', true)
    }
  }

  const handleToggle = async (campaign: Campaign) => {
    try {
      await apiService.patch(
        `/admin/campaigns/${campaign.weekNumber}/toggle`,
        { isActive: !campaign.isActive },
        token,
      )
      showToast(`Week ${campaign.weekNumber} ${!campaign.isActive ? 'activated' : 'deactivated'} ✓`)
      fetchCampaigns()
    } catch {
      showToast('Failed to toggle campaign', true)
    }
  }

  const handleDelete = async (weekNumber: number) => {
    try {
      await apiService.delete(`/admin/campaigns/${weekNumber}`, token)
      showToast(`Week ${weekNumber} campaign deleted ✓`)
      setDeleteConfirm(null)
      fetchCampaigns()
    } catch {
      showToast('Failed to delete campaign', true)
    }
  }

  const handleTrigger = async () => {
    setTriggering(true)
    setTriggerResult(null)
    try {
      const result = await apiService.post('/admin/campaigns/trigger', {}, token)
      setTriggerResult(result.data)
      showToast(`Campaign sent! ${result.data.sent} emails dispatched ✓`)
    } catch {
      showToast('Failed to trigger campaign', true)
    } finally {
      setTriggering(false)
    }
  }

  const handleShowAudience = () => {
    setShowAudience(true)
    fetchAudience()
  }

  // Determine which weeks have no campaign (coverage gaps)
  const campaignWeekSet = new Set(campaigns.map((c) => c.weekNumber))

  return (
    <div className="page-container fade-in">
      {/* ── Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #d97757, #c2622e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarClock size={20} color="#fff" />
              </div>
              <h2 className="section-title" style={{ margin: 0 }}>
                Tuesday Drip Campaigns
              </h2>
            </div>
            <p
              style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, maxWidth: '560px' }}
            >
              Auto-sends every <strong>Tuesday at 08:00 WAT</strong>. Each waitlist user receives
              the content matching their week number — calculated from when they joined the drip.
              Current users default to <strong>Week 1</strong> until next Tuesday.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              id="btn-preview-audience"
              onClick={handleShowAudience}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--white)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <Eye size={16} /> Preview Audience
            </button>
            <button
              id="btn-trigger-campaign"
              onClick={handleTrigger}
              disabled={triggering || campaigns.filter((c) => c.isActive).length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                background: triggering
                  ? 'var(--accent-muted)'
                  : 'linear-gradient(135deg, #d97757, #c2622e)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: triggering ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)',
                opacity: campaigns.filter((c) => c.isActive).length === 0 ? 0.5 : 1,
              }}
            >
              {triggering ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Running…
                </>
              ) : (
                <>
                  <Play size={16} /> Run Now (Test)
                </>
              )}
            </button>
            <button
              id="btn-add-week"
              onClick={openCreateEditor}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--text)',
                color: 'var(--white)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <Plus size={16} /> Add Week
            </button>
          </div>
        </div>
      </div>

      {/* ── How It Works Banner ── */}
      <div
        style={{
          marginBottom: '28px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(217,119,87,0.08), rgba(217,119,87,0.04))',
          border: '1px solid rgba(217,119,87,0.2)',
          borderRadius: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
        }}
        className="grid-mobile-1"
      >
        {[
          {
            icon: '📅',
            title: 'Every Tuesday 08:00 WAT',
            desc: 'Cron job runs automatically — no manual action needed.',
          },
          {
            icon: '🗓️',
            title: 'Week-based targeting',
            desc: 'Users in their 1st week get Week 1 content. 2nd week users get Week 2, etc.',
          },
          {
            icon: '🆕',
            title: 'Current users → Week 1',
            desc: 'All existing waitlist users are treated as enrolled "this week" until next Tuesday.',
          },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Trigger Result ── */}
      {triggerResult && (
        <div
          style={{
            marginBottom: '24px',
            padding: '20px 24px',
            borderRadius: '16px',
            background: triggerResult.failed > 0 ? '#fff7ed' : '#f0fdf4',
            border: `1px solid ${triggerResult.failed > 0 ? '#fed7aa' : '#bbf7d0'}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              {triggerResult.failed > 0 ? (
                <AlertTriangle size={18} color="#d97757" />
              ) : (
                <CheckCircle2 size={18} color="#16a34a" />
              )}
              Campaign Run Complete
            </div>
            <button
              onClick={() => setTriggerResult(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '14px' }}>
            {[
              { label: 'Processed', value: triggerResult.processed, color: '#111827' },
              { label: 'Sent', value: triggerResult.sent, color: '#16a34a' },
              { label: 'Failed', value: triggerResult.failed, color: '#dc2626' },
              { label: 'Skipped', value: triggerResult.skipped, color: '#9a3412' },
            ].map((s) => (
              <div key={s.label}>
                <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>{s.label}:</span>
                <strong style={{ color: s.color }}>{s.value}</strong>
              </div>
            ))}
          </div>
          {triggerResult.details.length > 0 && (
            <div
              style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              {triggerResult.details.map((d) => (
                <div key={d.weekNumber} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Week {d.weekNumber}: {d.userCount} user{d.userCount !== 1 ? 's' : ''} — {d.status}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Campaign Cards ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2
            size={32}
            style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}
          />
          <p>Loading campaigns…</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '60px', border: '2px dashed var(--border)' }}
        >
          <CalendarClock size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>No campaigns yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
            Create your first week's email content to start the drip sequence.
          </p>
          <button
            id="btn-create-first-campaign"
            onClick={openCreateEditor}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Create Week 1
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="card"
              style={{
                borderLeft: `4px solid ${campaign.isActive ? 'var(--accent)' : 'var(--border)'}`,
                padding: '0',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  {/* Week badge */}
                  <div
                    style={{
                      minWidth: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: campaign.isActive
                        ? 'linear-gradient(135deg, #d97757, #c2622e)'
                        : 'var(--surface)',
                      border: campaign.isActive ? 'none' : '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: campaign.isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      WK
                    </span>
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: campaign.isActive ? '#fff' : 'var(--text-muted)',
                        lineHeight: 1,
                      }}
                    >
                      {campaign.weekNumber}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {campaign.label && (
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '3px',
                        }}
                      >
                        {campaign.label}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {campaign.subject}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Updated{' '}
                      {new Date(campaign.updatedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {!campaign.isActive && (
                        <span style={{ marginLeft: '10px', color: '#9ca3af', fontStyle: 'italic' }}>
                          — Paused
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Toggle */}
                  <button
                    id={`btn-toggle-week-${campaign.weekNumber}`}
                    onClick={() => handleToggle(campaign)}
                    title={campaign.isActive ? 'Deactivate' : 'Activate'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: campaign.isActive ? 'var(--accent)' : 'var(--text-muted)',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {campaign.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>

                  {/* Edit */}
                  <button
                    id={`btn-edit-week-${campaign.weekNumber}`}
                    onClick={() => openEditEditor(campaign)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    <Pencil size={14} /> Edit
                  </button>

                  {/* Delete */}
                  {deleteConfirm === campaign.weekNumber ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleDelete(campaign.weekNumber)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`btn-delete-week-${campaign.weekNumber}`}
                      onClick={() => setDeleteConfirm(campaign.weekNumber)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '8px',
                        cursor: 'pointer',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {/* Expand preview toggle */}
                  <button
                    id={`btn-expand-week-${campaign.weekNumber}`}
                    onClick={() =>
                      setExpandedWeek(
                        expandedWeek === campaign.weekNumber ? null : campaign.weekNumber,
                      )
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '6px',
                    }}
                  >
                    {expandedWeek === campaign.weekNumber ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded HTML preview */}
              {expandedWeek === campaign.weekNumber && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '0' }}>
                  <div
                    style={{
                      padding: '8px 24px',
                      background: 'var(--surface)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    HTML Preview
                  </div>
                  <iframe
                    srcDoc={campaign.htmlContent}
                    title={`Week ${campaign.weekNumber} preview`}
                    style={{ width: '100%', minHeight: '400px', border: 'none', display: 'block' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Editor Modal ── */}
      {showEditor && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowEditor(false)}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            }}
          >
            {/* Modal header */}
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
              <button
                onClick={() => setShowEditor(false)}
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

            {/* Modal body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Row 1: Week # + Label */}
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
                    onChange={(e) =>
                      setForm({ ...form, weekNumber: parseInt(e.target.value) || 1 })
                    }
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

              {/* Subject */}
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

              {/* HTML Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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
                  <div
                    style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}
                  >
                    Use <code>{'{{firstName}}'}</code>, <code>{'{{email}}'}</code> for
                    personalisation
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

              {/* Plain text fallback */}
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

              {/* Active toggle */}
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

            {/* Modal footer */}
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
                onClick={() => setShowEditor(false)}
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
                onClick={handleSave}
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
      )}

      {/* ── Audience Preview Modal ── */}
      {showAudience && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAudience(false)}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
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
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Users size={20} color="var(--accent)" /> Audience Preview
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Users grouped by which campaign week they'd currently receive.
                </p>
              </div>
              <button
                onClick={() => setShowAudience(false)}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {audienceLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : audience.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                  No opted-in users yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {audience.map((row) => (
                    <div
                      key={row.weekNumber}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        border: `1px solid ${row.hasCampaign && row.isActive ? 'rgba(217,119,87,0.25)' : 'var(--border)'}`,
                        background:
                          row.hasCampaign && row.isActive
                            ? 'rgba(217,119,87,0.04)'
                            : 'var(--surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background:
                              row.hasCampaign && row.isActive
                                ? 'linear-gradient(135deg, #d97757, #c2622e)'
                                : 'var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color:
                                row.hasCampaign && row.isActive ? 'rgba(255,255,255,0.8)' : '#999',
                              textTransform: 'uppercase',
                            }}
                          >
                            WK
                          </span>
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: row.hasCampaign && row.isActive ? '#fff' : '#999',
                              lineHeight: 1,
                            }}
                          >
                            {row.weekNumber}
                          </span>
                        </div>
                        <div>
                          {row.campaignLabel && (
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--accent)',
                                textTransform: 'uppercase',
                                marginBottom: '2px',
                              }}
                            >
                              {row.campaignLabel}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: row.hasCampaign ? 'var(--text)' : 'var(--text-muted)',
                            }}
                          >
                            {row.hasCampaign
                              ? row.campaignSubject
                              : '⚠ No campaign — will be skipped'}
                          </div>
                          {row.hasCampaign && !row.isActive && (
                            <div
                              style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}
                            >
                              Paused
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: '22px',
                            fontWeight: 800,
                            color:
                              row.hasCampaign && row.isActive
                                ? 'var(--accent)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {row.userCount}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          user{row.userCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Users with no matching campaign */}
                  {audience.filter((r) => !campaignWeekSet.has(r.weekNumber)).length > 0 && (
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        fontSize: '13px',
                        color: '#9a3412',
                      }}
                    >
                      <strong>Note:</strong> Some weeks have users but no campaign content — those
                      users will be skipped on campaign day.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .section-title { font-size: 22px; font-weight: 800; color: var(--text); }
      `}</style>
    </div>
  )
}

export default WaitlistCampaigns
