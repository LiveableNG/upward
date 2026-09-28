import React from 'react'
import { DollarSign, Check } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { UniversityReferralRecord, EditReferralFormData } from '../types'

interface ReferralEditModalProps {
  isOpen: boolean
  referral: UniversityReferralRecord | null
  formData: EditReferralFormData
  setFormData: React.Dispatch<React.SetStateAction<EditReferralFormData>>
  onSubmit: (e: React.FormEvent) => void
  updating: boolean
  onClose: () => void
}

export const ReferralEditModal: React.FC<ReferralEditModalProps> = ({
  isOpen,
  referral,
  formData,
  setFormData,
  onSubmit,
  updating,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !updating && onClose()}
      title="Update Referral & Settle 10% Payout"
      description={`Referrer: ${referral?.referrerName} • Friend: ${referral?.referredName || referral?.referredPhone || referral?.referredEmail || 'Lead'}`}
      icon={<DollarSign size={20} color="#8A4A2A" />}
      maxWidth="560px"
    >
      {referral && (
        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Enrollment Status */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Program Enrollment Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="PENDING">PENDING (Info Session / Lead)</option>
                <option value="JOINED">JOINED (Admitted / Enrolled in Cohort)</option>
                <option value="PAID">PAID (Tuition Paid in Full)</option>
                <option value="INELIGIBLE">INELIGIBLE (Duplicate / Self Referral)</option>
              </select>
            </div>

            {/* Fee and 10% Reward Calculation Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Tuition Fee Paid (₦)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 200000"
                  value={formData.programFeePaid}
                  onChange={(e) => {
                    const val = e.target.value
                    const num = Number(val) || 0
                    const calcReward = (num * (formData.rewardPercentage || 10)) / 100
                    setFormData({
                      ...formData,
                      programFeePaid: val,
                      rewardAmount: num > 0 ? calcReward : '',
                    })
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Amount student paid to join
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  10% Reward Due (₦)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 20000"
                  value={formData.rewardAmount}
                  onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #8A4A2A',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#8A4A2A',
                    background: '#fdfbf9',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#8A4A2A', marginTop: '2px', display: 'block', fontWeight: 600 }}>
                  Auto-calculated 10% referral fee
                </span>
              </div>
            </div>

            {/* Reward Payout Status */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Commission Payout Status *
              </label>
              <select
                value={formData.rewardStatus}
                onChange={(e) => setFormData({ ...formData, rewardStatus: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background:
                    formData.rewardStatus === 'PAID'
                      ? '#dcfce7'
                      : formData.rewardStatus === 'APPROVED'
                      ? '#e0e7ff'
                      : '#fff',
                  color:
                    formData.rewardStatus === 'PAID'
                      ? '#15803d'
                      : formData.rewardStatus === 'APPROVED'
                      ? '#4338ca'
                      : 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="PENDING">PENDING (Tuition pending or awaiting review)</option>
                <option value="APPROVED">APPROVED (Approved for bank transfer)</option>
                <option value="PAID">✓ PAID (10% reward transferred to referrer)</option>
              </select>
            </div>

            {/* Payment Reference */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Payout / Transfer Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Bank Ref / TXN-982319 / Paystack Ref"
                value={formData.paymentRef}
                onChange={(e) => setFormData({ ...formData, paymentRef: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Admin Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Paid out ₦20,000 to referrer GTBank account on Sep 28..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
            </div>

            {/* Submit buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#8A4A2A',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.7 : 1,
                }}
              >
                <Check size={16} />
                {updating ? 'Saving...' : 'Save & Update Payout'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
