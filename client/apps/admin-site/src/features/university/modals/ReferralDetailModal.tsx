import React from 'react'
import {
  Gift,
  DollarSign,
  Users,
  GraduationCap,
  Sparkles,
  Phone,
} from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { UniversityReferralRecord } from '../types'

interface ReferralDetailModalProps {
  isOpen: boolean
  referral: UniversityReferralRecord | null
  onClose: () => void
  onOpenEdit: (referral: UniversityReferralRecord) => void
}

export const ReferralDetailModal: React.FC<ReferralDetailModalProps> = ({
  isOpen,
  referral,
  onClose,
  onOpenEdit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Friend Referral & 10% Reward Details"
      description={
        referral ? (
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
              background: referral.status === 'INELIGIBLE' ? '#fee2e2' : '#f0fdf4',
              color: referral.status === 'INELIGIBLE' ? '#b91c1c' : '#15803d',
            }}
          >
            {referral.status === 'INELIGIBLE' ? 'Ineligible Lead' : 'Verified Eligible Lead'} •{' '}
            {new Date(referral.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ) : undefined
      }
      icon={<Gift size={20} color="#8A4A2A" />}
      maxWidth="600px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {referral && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenEdit(referral)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#8A4A2A',
                color: '#fff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <DollarSign size={15} />
              Update / Settle 10% Payout
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {referral && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Referrer Section */}
          <div style={{ background: '#fdfbf9', border: '1px solid #f2e8e1', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Users size={16} color="#8A4A2A" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#8A4A2A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Referrer (Earns 10% Fee)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Name:</span>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {referral.referrerName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Phone / WhatsApp:</span>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                  <a
                    href={`https://wa.me/${referral.referrerPhone.replace(/[^0-9+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Phone size={12} /> {referral.referrerPhone}
                  </a>
                </div>
              </div>
              {referral.referrerEmail && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Email:</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{referral.referrerEmail}</div>
                </div>
              )}
            </div>
          </div>

          {/* Friend Section */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <GraduationCap size={16} color="#0f172a" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recommended Friend
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Friend's Name:</span>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {referral.referredName || 'Not specified'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Friend's Phone:</span>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                  {referral.referredPhone ? (
                    <a
                      href={`https://wa.me/${referral.referredPhone.replace(/[^0-9+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Phone size={12} /> {referral.referredPhone}
                    </a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Friend's Email:</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {referral.referredEmail || '—'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Automated Invite Email:</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: referral.emailSent ? '#15803d' : '#64748b' }}>
                  {referral.emailSent ? '✓ Sent to friend' : 'Pending or no email'}
                </div>
              </div>
            </div>
          </div>

          {/* Financial & Reward Summary Card */}
          <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Sparkles size={16} color="#7e22ce" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                10% Referral Commission Breakdown
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: '#7e22ce' }}>Tuition Fee Paid:</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#581c87' }}>
                  {referral.programFeePaid ? `₦${referral.programFeePaid.toLocaleString()}` : '₦0 (Pending)'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: '#7e22ce' }}>Reward Rate:</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#581c87' }}>
                  {referral.rewardPercentage || 10}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: '#7e22ce' }}>10% Reward Due:</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
                  {referral.rewardAmount ? `₦${referral.rewardAmount.toLocaleString()}` : '₦0 (Pending)'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f3e8ff' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Payout Status:</span>
                <div style={{ marginTop: '3px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background:
                        referral.rewardStatus === 'PAID'
                          ? '#dcfce7'
                          : referral.rewardStatus === 'APPROVED'
                          ? '#e0e7ff'
                          : '#fef3c7',
                      color:
                        referral.rewardStatus === 'PAID'
                          ? '#15803d'
                          : referral.rewardStatus === 'APPROVED'
                          ? '#4338ca'
                          : '#b45309',
                    }}
                  >
                    {referral.rewardStatus === 'PAID'
                      ? '✓ Paid Out'
                      : referral.rewardStatus === 'APPROVED'
                      ? 'Approved'
                      : 'Pending Review'}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Payment Reference:</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {referral.paymentRef || 'None'}
                </div>
              </div>
            </div>

            {referral.notes && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3e8ff' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Admin Notes:</span>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {referral.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
