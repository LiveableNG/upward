import React from 'react'
import {
  GraduationCap,
  Building,
  Calendar,
  Layers,
  Trash2,
  Compass,
} from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { EarlyAccessRecord } from '../types'

interface EarlyAccessDetailModalProps {
  isOpen: boolean
  record: EarlyAccessRecord | null
  onClose: () => void
  onDelete?: (record: EarlyAccessRecord) => void
  isDeveloper: boolean
}

export const EarlyAccessDetailModal: React.FC<EarlyAccessDetailModalProps> = ({
  isOpen,
  record,
  onClose,
  onDelete,
  isDeveloper,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={record?.name || 'Application Details'}
      description={
        record ? (
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
              background: record.type === 'STUDENT' ? '#fbf1ed' : '#f0f7f2',
              color: record.type === 'STUDENT' ? '#d97757' : '#166534',
            }}
          >
            {record.type === 'STUDENT' ? 'Student Early Access' : 'Landlord Programme'} •{' '}
            {new Date(record.createdAt).toLocaleDateString()}
          </span>
        ) : undefined
      }
      icon={
        record?.type === 'STUDENT' ? (
          <GraduationCap size={20} />
        ) : (
          <Building size={20} />
        )
      }
      maxWidth="560px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {record && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                WhatsApp Contact
              </div>
              <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                {record.whatsapp}
              </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Email Address
              </div>
              <div
                style={{
                  fontWeight: 600,
                  marginTop: '2px',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                }}
              >
                {record.email || 'None'}
              </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Target City
              </div>
              <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                {record.city}
              </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Submission ID
              </div>
              <div
                style={{
                  fontWeight: 600,
                  marginTop: '2px',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                }}
              >
                {record.id}
              </div>
            </div>
          </div>

          {record.type === 'STUDENT' ? (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#d97757' }}>
                Student Cohort Answers
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Age Bracket:
                  </span>
                  <div style={{ fontWeight: 600 }}>{record.ageBracket || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Experience / Stage:
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {record.experienceLevel || 'N/A'}
                  </div>
                </div>
              </div>

              {record.experienceLevel && record.experienceLevel.includes('Stage 1') && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1.5px solid #ffedd5',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    color: '#9a3412',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                  }}
                >
                  <Layers size={16} color="#c2410c" />
                  <div>
                    <strong>Funnel Status: Drop-off at Stage 1</strong>
                    <div style={{ fontSize: '11.5px', fontWeight: 400, color: '#c2410c' }}>
                      Applicant entered basic contact info but dropped off before completing motivation & payment steps.
                    </div>
                  </div>
                </div>
              )}
              {/* Selected Track if present */}
              {(() => {
                const trackMatch =
                  record.interest?.match(/\[Track:\s*([^\]]+)\]/i) ||
                  record.experienceLevel?.match(/\[(Track\s*[12][^\]]*)\]/i)
                if (!trackMatch) return null
                const trackStr = trackMatch[1].trim()
                const isTrack2 =
                  trackStr.toLowerCase().includes('2') || trackStr.toLowerCase().includes('started')
                return (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Selected Track:
                    </span>
                    <div
                      style={{
                        background: isTrack2 ? '#f0fdf4' : '#fff7ed',
                        color: isTrack2 ? '#166534' : '#9a3412',
                        border: `1px solid ${isTrack2 ? '#bbf7d0' : '#ffedd5'}`,
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
                      <Compass size={15} color={isTrack2 ? '#166534' : '#c2410c'} />
                      <span>{isTrack2 ? 'Track 2 — Already Started' : 'Track 1 — Starting From Zero'}</span>
                    </div>
                  </div>
                )
              })()}

              {record.interest && (
                <div style={{ marginTop: '12px' }}>
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
                    {record.interest
                      .replace(/\[Track:\s*[^\]]+\]\s*/gi, '')
                      .replace(/\[Session:\s*([^\]]+)\]/i, '$1')
                      .trim()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#166534' }}>
                Landlord Profile Answers
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Property Count:
                  </span>
                  <div style={{ fontWeight: 600 }}>{record.propertyCount || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
                  <div style={{ fontWeight: 600 }}>{record.landlordStatus || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Management:
                  </span>
                  <div style={{ fontWeight: 600 }}>
                    {record.managementStyle || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isDeveloper && onDelete && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => onDelete(record)}
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
                Delete Early Access Record
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
