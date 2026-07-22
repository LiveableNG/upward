import React, { useState, useEffect, useCallback } from 'react'
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { HowItWorksBanner } from '../features/campaigns/components/HowItWorksBanner'
import {
  TriggerResultBanner,
  type TriggerResult,
} from '../features/campaigns/components/TriggerResultBanner'
import {
  AudiencePreviewModal,
  type AudiencePreview,
} from '../features/campaigns/components/AudiencePreviewModal'
import {
  CampaignEditorModal,
  wrapInPreviewTemplate,
  type Campaign,
  type CampaignFormData,
} from '../features/campaigns/components/CampaignEditorModal'

interface WaitlistCampaignsProps {
  token: string
}

const DEFAULT_WEEK1_HTML = `<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 20px 0;">Welcome to Upward, {{firstName}}!</h1>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
  You're officially signed up on Upward — and we couldn't be more excited to have you here.
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
<p style="color:#6B7280;font-size:15px;margin:0;">Stay tuned — exciting things are coming.</p>`

const WaitlistCampaigns: React.FC<WaitlistCampaignsProps> = ({ token }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [audience, setAudience] = useState<AudiencePreview[]>([])
  const [loading, setLoading] = useState(true)
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null)

  // Modals state
  const [showEditor, setShowEditor] = useState(false)
  const [showAudience, setShowAudience] = useState(false)

  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  const [form, setForm] = useState<CampaignFormData>({
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
          ? "Welcome to Upward — You're officially signed up!"
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

  const handleShowAudience = () => {
    setShowAudience(true)
    fetchAudience()
  }

  const campaignWeekSet = new Set(campaigns.map((c) => c.weekNumber))

  return (
    <div className="page-container fade-in">
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
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
            <CalendarClock size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Tuesday Drip Campaigns
            </h1>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '14px',
                margin: '4px 0 0 0',
                maxWidth: '560px',
              }}
            >
              Auto-sends every <strong>Tuesday at 19:00 WAT</strong>. Each registered tenant
              receives the content matching their week number — calculated from when they signed up.
              Current users default to <strong>Week 1</strong> until next Tuesday.
            </p>
          </div>
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

      <HowItWorksBanner />

      {triggerResult && (
        <TriggerResultBanner triggerResult={triggerResult} onClose={() => setTriggerResult(null)} />
      )}

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    srcDoc={wrapInPreviewTemplate(campaign.htmlContent)}
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

      <CampaignEditorModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        editingCampaign={editingCampaign}
      />

      <AudiencePreviewModal
        isOpen={showAudience}
        onClose={() => setShowAudience(false)}
        loading={audienceLoading}
        audience={audience}
        campaignWeekSet={campaignWeekSet}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .section-title { font-size: 22px; font-weight: 800; color: var(--text); }
      `}</style>
    </div>
  )
}

export default WaitlistCampaigns
