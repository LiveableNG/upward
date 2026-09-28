import React from 'react'
import {
  GraduationCap,
  Calendar,
  Award,
  Video,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { UniversityApplicationRecord } from '../types'

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
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
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
                background: application.feeStatus === 'PAID' ? '#dcfce7' : '#fef9c3',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${application.feeStatus === 'PAID' ? '#bbf7d0' : '#fef08a'}`,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: application.feeStatus === 'PAID' ? '#15803d' : '#a16207',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Fee Payment Status
              </div>
              <div
                style={{
                  fontWeight: 700,
                  marginTop: '2px',
                  color: application.feeStatus === 'PAID' ? '#15803d' : '#a16207',
                }}
              >
                {application.feeStatus === 'PAID' ? '✓ PAID (₦5,000)' : 'PENDING'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#8A4A2A' }}>
              Application Questionnaire Responses
            </h4>

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

            {application.sessionTime && (
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
                  <Calendar size={15} />
                  {application.sessionTime}
                </div>
              </div>
            )}

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
                    <Award size={13} />
                    Program Scholarship Candidate
                  </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                  This applicant applied for a Program Scholarship and submitted a 1–2 minute video link.
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
                  Application Fee Status (₦5,000)
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
