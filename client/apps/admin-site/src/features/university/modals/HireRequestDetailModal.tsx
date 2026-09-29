import { useState } from 'react'
import {
  Briefcase,
  MapPin,
  Phone,
  Calendar,
  Users,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { UniversityHireRequestRecord } from '../types'

interface HireRequestDetailModalProps {
  isOpen: boolean
  hireRequest: UniversityHireRequestRecord | null
  onClose: () => void
  onUpdateStatus: (id: string, updates: { status?: string; notes?: string }) => void
  onDelete?: (hireRequest: UniversityHireRequestRecord) => void
  isDeveloper: boolean
}

export const HireRequestDetailModal = ({
  isOpen,
  hireRequest,
  onClose,
  onUpdateStatus,
  onDelete,
  isDeveloper,
}: HireRequestDetailModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState<string>('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Sync state when hireRequest opens
  const cleanPhone = (hireRequest?.phone || '').replace(/[^0-9+]/g, '')
  const currentStatus = selectedStatus || hireRequest?.status || 'PENDING'
  const currentNotes = adminNotes !== '' ? adminNotes : (hireRequest?.notes || '')

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
    if (hireRequest) {
      onUpdateStatus(hireRequest.id, { status: newStatus, notes: currentNotes || undefined })
    }
  }

  const handleSaveNotes = () => {
    if (!hireRequest) return
    setSavingNotes(true)
    onUpdateStatus(hireRequest.id, { status: currentStatus, notes: currentNotes || undefined })
    setTimeout(() => setSavingNotes(false), 500)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hireRequest?.companyName || 'Company Hiring Request'}
      description={
        hireRequest ? (
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
              background: '#fdfbf9',
              color: '#8A4A2A',
              border: '1px solid #e7dcd3',
            }}
          >
            {hireRequest.industry} • Submitted {new Date(hireRequest.createdAt).toLocaleDateString()}
          </span>
        ) : undefined
      }
      icon={<Briefcase size={20} color="#8A4A2A" />}
      maxWidth="640px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {hireRequest && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Company & Contact Card */}
          <div
            style={{
              background: '#fdfbf9',
              border: '1px solid #f2e8e1',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Briefcase size={16} color="#8A4A2A" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#8A4A2A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Employer Contact Details
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Company Name:</span>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {hireRequest.companyName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Contact Person:</span>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  {hireRequest.contactName} {hireRequest.contactRole ? `(${hireRequest.contactRole})` : ''}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Phone / WhatsApp:</span>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>
                  {hireRequest.phone ? (
                    <a
                      href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Phone size={12} /> {hireRequest.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Email Address:</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {hireRequest.email}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>City / Location:</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="var(--accent)" /> {hireRequest.city}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Industry:</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {hireRequest.industry}
                </div>
              </div>
            </div>
          </div>

          {/* Hiring Needs Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Users size={16} color="#0f172a" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Talent Requirements & Placement
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Placement Type:</span>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1d4ed8' }}>
                  {(hireRequest.placementType || 'Full Time').replace(/_/g, ' ')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Openings Count:</span>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  {hireRequest.openingsCount}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Compensation:</span>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#15803d' }}>
                  {hireRequest.compensationType ? hireRequest.compensationType.replace(/_/g, ' ') : 'Negotiable'}
                </div>
              </div>
            </div>

            {hireRequest.startDate && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Calendar size={12} /> Desired Start Date:
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {hireRequest.startDate}
                </div>
              </div>
            )}

            {/* Roles Needed Badges */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Roles Required:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(Array.isArray(hireRequest.rolesNeeded) && hireRequest.rolesNeeded.length > 0) ? (
                  hireRequest.rolesNeeded.map((role: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Open to all graduates
                  </span>
                )}
              </div>
            </div>

            {hireRequest.jobDescription && (
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Job Description / Role Details:
                </span>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5',
                  }}
                >
                  {hireRequest.jobDescription}
                </div>
              </div>
            )}
          </div>

          {/* Admin Status & Audit Management Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: 'var(--text-primary)' }}>
              Pipeline Status & Internal Match Notes
            </h4>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                Hiring Inquiry Status
              </label>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background:
                    currentStatus === 'MATCHED'
                      ? '#dcfce7'
                      : currentStatus === 'CONTACTED'
                      ? '#dbeafe'
                      : '#fff',
                  color:
                    currentStatus === 'MATCHED'
                      ? '#15803d'
                      : currentStatus === 'CONTACTED'
                      ? '#1d4ed8'
                      : 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="PENDING">PENDING (New Inquiry - Needs Review)</option>
                <option value="CONTACTED">CONTACTED (Spoke with Hiring Manager)</option>
                <option value="MATCHED">MATCHED (Candidate Recommended / Placed)</option>
                <option value="CLOSED">CLOSED (Fulfilled or Inactive)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                Internal Match Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Recommended student John Doe (Cohort 2026). Interview scheduled on Friday..."
                value={currentNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '12px',
                    padding: '6px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={13} color="#15803d" />
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>

            {isDeveloper && onDelete && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => onDelete(hireRequest)}
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
                  <Trash2 size={14} />
                  Delete Hiring Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
