import React, { useState } from 'react'
import {
  GraduationCap,
  Award,
  Video,
  MapPin,
  ExternalLink,
  Trash2,
  Compass,
  CreditCard,
  Copy,
  CheckCircle2,
  Link2,
} from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { UniversityApplicationRecord } from '../types'
import { getTrackBadgeMeta, parseSessionAndTrack, getPaymentAndBalanceMeta } from '../sessionExportUtils'

interface ApplicationDetailModalProps {
  isOpen: boolean
  application: UniversityApplicationRecord | null
  onClose: () => void
  onUpdateStatus: (
    id: string,
    updates: { status?: string; feeStatus?: string; notes?: string }
  ) => void
  onDelete?: (application: UniversityApplicationRecord) => void
  isDeveloper: boolean
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  isOpen,
  application,
  onClose,
  onUpdateStatus,
  onDelete,
  isDeveloper,
}) => {
  const rawTrack =
    application?.track ||
    application?.notes?.match(/\[Track:\s*([^\]]+)\]/i)?.[1] ||
    application?.experienceLevel?.match(/\[(Track\s*[A-D12][^\]]*)\]/i)?.[1] ||
    application?.goals?.match(/Track:\s*([^\n,]+)/i)?.[1] ||
    ''

  const parsedTrack = parseSessionAndTrack({
    track: rawTrack,
    experienceLevel: application?.experienceLevel,
    interest: application?.notes,
  })
  const badgeMeta = getTrackBadgeMeta(parsedTrack.trackCode)
  const trackLabel = parsedTrack.track !== 'Not Specified' ? parsedTrack.track : (rawTrack || 'Not Specified')

  const [copiedLink, setCopiedLink] = useState(false)
  const paymentMeta = application ? getPaymentAndBalanceMeta(application) : null

  const balancePaymentUrl = application
    ? `https://upward.goodtenants.io/academy/apply?action=balance&ref=${encodeURIComponent(application.paymentRef || application.email || '')}`
    : ''

  const handleCopyBalanceLink = () => {
    if (!balancePaymentUrl) return
    navigator.clipboard.writeText(balancePaymentUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleMarkBalancePaid = () => {
    if (!application) return
    const confirmed = window.confirm(
      `Mark remaining ₦125,000 balance as PAID for ${application.name}?\n\nThis confirms the applicant has paid their balance (e.g. via direct bank transfer) and will update their tuition status to FULLY CLEARED.`
    )
    if (!confirmed) return
    const currentNotes = application.notes || ''
    const updatedNotes = `${currentNotes} [Balance Paid: ₦125,000 (Manual Transfer)] [Tuition Status: FULLY CLEARED]`.trim()
    onUpdateStatus(application.id, { feeStatus: 'PAID', notes: updatedNotes })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={application?.name || 'Full Cohort Application'}
      description={
        application ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#fff7ed',
              color: '#c2410c',
            }}
          >
            2026 Cohort • Applied {new Date(application.createdAt).toLocaleDateString()}
          </span>
        ) : undefined
      }
      icon={<GraduationCap size={20} />}
      maxWidth="640px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {application && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                WhatsApp Contact
              </div>
              <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                {application.whatsapp}
              </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Email Address
              </div>
              <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {application.email}
              </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                City & Age
              </div>
              <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                {application.city} ({application.ageBracket})
              </div>
            </div>
            <div
              style={{
                background: badgeMeta.background,
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${badgeMeta.border}`,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: badgeMeta.color,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Selected Track
              </div>
              <div
                style={{
                  fontWeight: 700,
                  marginTop: '2px',
                  color: badgeMeta.color,
                  fontSize: '13px',
                }}
              >
                {badgeMeta.label}
              </div>
            </div>
            <div
              style={{
                background: paymentMeta?.background || (application.feeStatus === 'PAID' ? '#dcfce7' : '#fef9c3'),
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${paymentMeta?.border || (application.feeStatus === 'PAID' ? '#bbf7d0' : '#fef08a')}`,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: paymentMeta?.color || (application.feeStatus === 'PAID' ? '#15803d' : '#a16207'),
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Payment &amp; Balance Status
              </div>
              <div
                style={{
                  fontWeight: 700,
                  marginTop: '2px',
                  color: paymentMeta?.color || (application.feeStatus === 'PAID' ? '#15803d' : '#a16207'),
                  fontSize: '12.5px',
                }}
              >
                {paymentMeta?.badgeLabel || (application.feeStatus === 'PAID' ? '✓ PAID' : 'PENDING')}
              </div>
              {paymentMeta?.detailText && (
                <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', lineHeight: 1.35 }}>
                  {paymentMeta.detailText}
                </div>
              )}
            </div>
          </div>

          {/* DEDICATED TRACK C LOCK-IN DEPOSIT & BALANCE CARD */}
          {paymentMeta?.isDeposit && (
            <div
              style={{
                background: paymentMeta.isFullyCleared ? '#f0fdf4' : '#fffbeb',
                border: `1.5px solid ${paymentMeta.isFullyCleared ? '#bbf7d0' : '#fde68a'}`,
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: paymentMeta.isFullyCleared ? '#15803d' : '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} />
                  {paymentMeta.isFullyCleared ? 'TRACK C TUITION FULLY CLEARED' : 'TRACK C DEPOSIT · BALANCE OUTSTANDING'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: paymentMeta.isFullyCleared ? '#dcfce7' : '#fef3c7',
                    color: paymentMeta.isFullyCleared ? '#15803d' : '#92400e',
                  }}
                >
                  {paymentMeta.isFullyCleared ? 'Fully Paid' : '₦125,000 Balance Due'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '10px 0', fontSize: '12px' }}>
                <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Total Tuition</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>₦150,000 (Saved ₦50k)</div>
                </div>
                <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Deposit Paid</div>
                  <div style={{ fontWeight: 700, color: '#15803d', marginTop: '2px' }}>₦25,000 ✓</div>
                </div>
                <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Balance Due</div>
                  <div style={{ fontWeight: 700, color: paymentMeta.isFullyCleared ? '#15803d' : '#b45309', marginTop: '2px' }}>
                    {paymentMeta.isFullyCleared ? '₦0.00 (Cleared)' : '₦125,000'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleCopyBalanceLink}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 600,
                  }}
                >
                  {copiedLink ? <CheckCircle2 size={13} color="#15803d" /> : <Copy size={13} />}
                  {copiedLink ? 'Balance Link Copied!' : 'Copy Balance Payment Link'}
                </button>

                {!paymentMeta.isFullyCleared && (
                  <button
                    type="button"
                    onClick={handleMarkBalancePaid}
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#15803d',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Mark Balance Paid (Manual/Bank Transfer)
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#8A4A2A' }}>
              Application Questionnaire Responses
            </h4>

            {/* Selected Track Questionnaire Row */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Selected Track:
              </span>
              <div
                style={{
                  background: badgeMeta.background,
                  color: badgeMeta.color,
                  border: `1.5px solid ${badgeMeta.border}`,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginTop: '4px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Compass size={16} color={badgeMeta.color} />
                <span>{trackLabel}</span>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Occupation:
              </span>
              <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                {application.occupation || 'Not specified'}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Real Estate Experience:
              </span>
              <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                {application.experienceLevel || 'Beginner'}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Goals / Desired Outcomes:
              </span>
              <div
                style={{
                  background: '#fafafa',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginTop: '4px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                }}
              >
                {application.goals || 'N/A'}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Can commit 6–8 hours/week?
              </span>
              <div
                style={{
                  background: '#fafafa',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginTop: '4px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                }}
              >
                {application.commitment}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Why Upward Academy?
              </span>
              <div
                style={{
                  background: '#fafafa',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginTop: '4px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                }}
              >
                {application.why}
              </div>
            </div>

            {application.timing && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Why is now the right time?
                </span>
                <div
                  style={{
                    background: '#fafafa',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginTop: '4px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                  }}
                >
                  {application.timing}
                </div>
              </div>
            )}

            {application.sessionTime && (() => {
              const parsed = parseSessionAndTrack({ sessionTime: application.sessionTime })
              return (
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Information & Q&A Session Choice:
                  </span>
                  <div
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {parsed.attendanceMode === 'Online' ? <Video size={15} /> : <MapPin size={15} />}
                    <span>{parsed.sessionBadgeText}</span>
                  </div>
                </div>
              )
            })()}


            {/* Program Scholarship & Video Link Card */}
            {(application.isScholarship || application.scholarshipVideoUrl) && (
              <div
                style={{
                  background: '#fffbf5',
                  border: '1.5px solid #fde68a',
                  borderRadius: '12px',
                  padding: '16px',
                  margin: '16px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#b45309',
                      background: '#fef3c7',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {application.isScholarship ? <Award size={13} /> : <Video size={13} />}
                    {application.isScholarship ? 'Program Scholarship Candidate' : 'Applicant Intro Video'}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                  {application.isScholarship
                    ? 'This applicant applied for a Program Scholarship and submitted a 1–2 minute video link.'
                    : 'Intro video submitted by applicant (name, brief intro, and interest in Upward Academy).'}
                </p>

                {application.scholarshipVideoUrl ? (
                  <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Submitted Video URL:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', wordBreak: 'break-all', flex: 1 }}>
                        {application.scholarshipVideoUrl}
                      </span>
                      <a
                        href={
                          application.scholarshipVideoUrl.startsWith('http')
                            ? application.scholarshipVideoUrl
                            : `https://${application.scholarshipVideoUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12.5px',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: '#8A4A2A',
                          color: '#fff',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        <Video size={14} />
                        Watch Video <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12.5px', color: '#b45309', fontStyle: 'italic' }}>
                    No video link provided.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Audit & Status Controls */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
              Admin Audit & Status Management
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  Track Fee &amp; Payment Status
                </label>
                <select
                  value={application.feeStatus || 'PENDING'}
                  onChange={(e) => onUpdateStatus(application.id, { feeStatus: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: application.feeStatus === 'PAID' ? '#dcfce7' : '#fff',
                    color: application.feeStatus === 'PAID' ? '#15803d' : '#0f172a',
                  }}
                >
                  <option value="PENDING">PENDING (Unpaid)</option>
                  <option value="PAID">✓ PAID (Offline/Bank/Manual/Paystack)</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  Cohort Admission Status
                </label>
                <select
                  value={application.status || 'SUBMITTED'}
                  onChange={(e) => onUpdateStatus(application.id, { status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    background:
                      application.status === 'ADMITTED'
                        ? '#f0f7f2'
                        : application.status === 'REJECTED'
                        ? '#fef2f2'
                        : '#fff',
                    color:
                      application.status === 'ADMITTED'
                        ? '#166534'
                        : application.status === 'REJECTED'
                        ? '#991b1b'
                        : '#0f172a',
                  }}
                >
                  <option value="SUBMITTED">SUBMITTED (Under Review)</option>
                  <option value="REVIEWED">REVIEWED</option>
                  <option value="ADMITTED">✓ ADMITTED</option>
                  <option value="REJECTED">✗ REJECTED</option>
                </select>
              </div>
            </div>

            {isDeveloper && onDelete && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => onDelete(application)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                  Delete Application Record
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
