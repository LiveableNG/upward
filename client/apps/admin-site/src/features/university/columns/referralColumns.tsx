import {
  Users,
  Eye,
  Trash2,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
} from 'lucide-react'
import type { ColumnDef } from '../../../components/common/table/DataTable'
import type { UniversityReferralRecord } from '../types'

interface ReferralColumnsOptions {
  onSelect: (row: UniversityReferralRecord) => void
  onEditPayout: (row: UniversityReferralRecord) => void
  onDelete?: (row: UniversityReferralRecord) => void
  isDeveloper: boolean
}

export const getReferralColumns = ({
  onSelect,
  onEditPayout,
  onDelete,
  isDeveloper,
}: ReferralColumnsOptions): ColumnDef<UniversityReferralRecord>[] => [
  {
    key: 'referrer',
    label: 'Referrer (10% Earner)',
    render: (row) => {
      const cleanPhone = (row.referrerPhone || '').replace(/[^0-9+]/g, '')
      return (
        <div>
          <div
            style={{
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={14} color="#8A4A2A" />
            {row.referrerName}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {row.referrerPhone && (
              <a
                href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#16a34a',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Phone size={11} /> {row.referrerPhone}
              </a>
            )}
            {row.referrerEmail && <span>{row.referrerEmail}</span>}
          </div>
        </div>
      )
    },
  },
  {
    key: 'referred',
    label: 'Friend Recommended',
    render: (row) => {
      const cleanPhone = (row.referredPhone || '').replace(/[^0-9+]/g, '')
      return (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.referredName || (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Name not provided
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {row.referredPhone && (
              <a
                href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#16a34a',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontWeight: 600,
                }}
              >
                <Phone size={11} /> {row.referredPhone}
              </a>
            )}
            {row.referredEmail && <span>{row.referredEmail}</span>}
          </div>
        </div>
      )
    },
  },
  {
    key: 'eligibility',
    label: 'Eligibility Status',
    render: (row) => {
      const isEligible = row.status !== 'INELIGIBLE'
      return (
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              background: isEligible ? '#dcfce7' : '#fee2e2',
              color: isEligible ? '#15803d' : '#b91c1c',
              border: `1px solid ${isEligible ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {isEligible ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {isEligible ? 'Verified New Lead' : 'Ineligible'}
          </span>
          {row.ineligibleReason && (
            <div style={{ fontSize: '10.5px', color: '#b91c1c', marginTop: '3px', fontWeight: 500 }}>
              {row.ineligibleReason === 'ALREADY_IN_INFO_LIST'
                ? 'Already in information/lead list'
                : row.ineligibleReason === 'SELF_REFERRAL'
                ? 'Self-referral detected'
                : row.ineligibleReason}
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'programStatus',
    label: 'Enrollment Status',
    render: (row) => {
      let bg = '#fef3c7'
      let color = '#b45309'
      let border = '#fde68a'
      let label = 'Lead / Pending'

      if (row.status === 'JOINED') {
        bg = '#dbeafe'
        color = '#1d4ed8'
        border = '#bfdbfe'
        label = 'Joined Program'
      } else if (row.status === 'PAID') {
        bg = '#dcfce7'
        color = '#15803d'
        border = '#bbf7d0'
        label = 'Tuition Paid'
      } else if (row.status === 'INELIGIBLE') {
        bg = '#f3f4f6'
        color = '#6b7280'
        border = '#e5e7eb'
        label = 'Ineligible'
      }

      return (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: bg,
            color: color,
            border: `1px solid ${border}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
        </span>
      )
    },
  },
  {
    key: 'rewardRate',
    label: 'Tuition & 10% Fee',
    render: (row) => {
      const fee = row.programFeePaid
      const reward = row.rewardAmount
      return (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {reward ? (
              `₦${reward.toLocaleString()} (10%)`
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>10% of Tuition</span>
            )}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {fee ? `Tuition: ₦${fee.toLocaleString()}` : 'Tuition payment pending'}
          </div>
        </div>
      )
    },
  },
  {
    key: 'rewardStatus',
    label: 'Payout Status',
    render: (row) => {
      let bg = '#fef3c7'
      let color = '#b45309'
      let border = '#fde68a'
      let label = 'Pending'

      if (row.rewardStatus === 'APPROVED') {
        bg = '#e0e7ff'
        color = '#4338ca'
        border = '#c7d2fe'
        label = 'Approved'
      } else if (row.rewardStatus === 'PAID') {
        bg = '#dcfce7'
        color = '#15803d'
        border = '#bbf7d0'
        label = 'Paid Out'
      }

      return (
        <span
          style={{
            padding: '3px 9px',
            borderRadius: '12px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: bg,
            color: color,
            border: `1px solid ${border}`,
          }}
        >
          {label}
        </span>
      )
    },
  },
  {
    key: 'emailSent',
    label: 'Friend Email',
    render: (row) => (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11.5px',
          color: row.emailSent ? '#15803d' : 'var(--text-muted)',
          fontWeight: 600,
        }}
      >
        {row.emailSent ? <CheckCircle2 size={13} color="#15803d" /> : <Clock size={13} color="#94a3b8" />}
        {row.emailSent ? 'Delivered' : 'Pending/No Email'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    label: 'Date',
    render: (row) => (
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {new Date(row.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onSelect(row)}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="View Details"
        >
          <Eye size={13} />
          View
        </button>
        <button
          type="button"
          onClick={() => onEditPayout(row)}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #8A4A2A',
            background: '#fff',
            color: '#8A4A2A',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Update Status / Settle 10% Payout"
        >
          <DollarSign size={13} />
          Payout
        </button>
        {isDeveloper && onDelete && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onDelete(row)}
            style={{
              padding: '4px 8px',
              color: '#dc2626',
              borderColor: '#fecaca',
            }}
            title="Delete Referral (Developer Only)"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    ),
  },
]
