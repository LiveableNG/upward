'use client'

import React from 'react'
import { CheckCircle2, Download, Award, ArrowRight, ShieldCheck, Share2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SettlementSuccessModalProps {
  data: {
    settlement_reference: string
    nip_session_id: string
    amount_paid_to_landlord_kobo: number
    surplus_to_wallet_kobo?: number
    cashback_credited_kobo: number
    settlement_status: string
    receipt_download_url: string
    upward_score_delta: string
  }
  landlordName: string
  onClose: () => void
  onRestartVault: () => void
}

export function SettlementSuccessModal({
  data,
  landlordName,
  onClose,
  onRestartVault,
}: SettlementSuccessModalProps) {
  const amountPaidNaira = data.amount_paid_to_landlord_kobo / 100
  const cashbackNaira = data.cashback_credited_kobo / 100
  const surplusNaira = (data.surplus_to_wallet_kobo || 0) / 100

  const handleDownloadReceipt = () => {
    // In production, triggers the PDF receipt download
    window.open(data.receipt_download_url, '_blank')
  }

  return (
    <div className="vault-modal-overlay">
      <div className="vault-modal-card" style={{ maxWidth: 520, textAlign: 'center' }}>
        {/* Animated Success Badge */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.12)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text)' }}>
            Rent Paid Successfully!
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Disbursed via NIP Instant Settlement to {landlordName}
          </p>
        </div>

        {/* NIP Session ID & Settlement Details */}
        <div className="vault-fee-breakdown" style={{ textAlign: 'left' }}>
          <div className="vault-fee-breakdown__row">
            <span>Amount Paid to Landlord</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {formatCurrency(amountPaidNaira, 'NGN')}
            </span>
          </div>
          {surplusNaira > 0 && (
            <div className="vault-fee-breakdown__row">
              <span>Surplus Interest Sent to Wallet</span>
              <span style={{ color: 'var(--clay)', fontWeight: 600 }}>
                +{formatCurrency(surplusNaira, 'NGN')}
              </span>
            </div>
          )}
          <div className="vault-fee-breakdown__row">
            <span>NIP Session ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {data.nip_session_id}
            </span>
          </div>
          <div className="vault-fee-breakdown__row">
            <span>Reference</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {data.settlement_reference}
            </span>
          </div>
          <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
            <span>Status</span>
            <span style={{ color: 'var(--success)' }}>Confirmed (Direct NIP Credit)</span>
          </div>
        </div>

        {/* Cashback & Discipline Gamification Banner */}
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(217, 119, 87, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1px solid rgba(217, 119, 87, 0.25)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Award size={24} color="var(--clay)" />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                Cashback Earned: +{formatCurrency(cashbackNaira, 'NGN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Includes 1.2x early-bird bonus for prompt settlement
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              background: 'var(--clay)',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: 8,
            }}
          >
            {data.upward_score_delta}
          </span>
        </div>

        {/* Legal Tenancy Receipt Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className="vault-btn-primary"
            style={{ background: 'var(--dark)' }}
            onClick={handleDownloadReceipt}
          >
            <Download size={18} />
            <span>Download Official PDF Rent Receipt</span>
          </button>

          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Compliant with Lagos State Tenancy Law 2011 (Section 5 proof of consideration).
          </p>

          <button
            type="button"
            className="vault-btn-primary"
            onClick={onRestartVault}
            style={{ marginTop: 6 }}
          >
            <span>Start Next Year&apos;s Rent Vault</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
