'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Calculator,
} from 'lucide-react'
import { useConvertAllianceReferral } from '../hooks/useAlliance'
import { AllianceReferral } from '../types/alliance.types'
import { useToast } from '@/components/common/Toast'

interface ConvertReferralModalProps {
  isOpen: boolean
  onClose: () => void
  referral: AllianceReferral
}

export function ConvertReferralModal({
  isOpen,
  onClose,
  referral,
}: ConvertReferralModalProps) {
  const toast = useToast()
  const convertMutation = useConvertAllianceReferral()

  const [mounted, setMounted] = useState(false)
  const [sourceAmount, setSourceAmount] = useState<string>(
    referral.listing?.price ? String(referral.listing.price) : '0',
  )
  const [commissionRate, setCommissionRate] = useState<string>('5.0')
  const [transactionReference, setTransactionReference] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const numAmount = parseFloat(sourceAmount) || 0
  const numRate = parseFloat(commissionRate) || 0
  const calculatedCommission = Math.round(numAmount * (numRate / 100) * 100) / 100

  const handleReset = () => {
    setFormError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (numAmount <= 0) {
      setFormError('Please enter a valid qualifying transaction amount greater than 0.')
      return
    }

    try {
      await convertMutation.mutateAsync({
        uuid: referral.uuid,
        payload: {
          sourceAmount: numAmount,
          commissionRate: numRate,
          transactionReference: transactionReference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      })
      toast.success('Referral successfully converted and commission earned!')
      handleReset()
    } catch (err: any) {
      const message = err.message || 'Failed to convert referral.'
      setFormError(message)
      toast.error(message)
    }
  }

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={handleReset}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(22, 101, 52, 0.12)',
                color: 'var(--forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Record Conversion & Earn Commission
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Confirm client lease/purchase on this Alliance listing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Listing & Client Context */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              {referral.listing?.title || 'Alliance Listing'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Client: <strong>{referral.clientName || referral.clientEmail || 'Client'}</strong>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--danger)',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {/* Source Transaction Amount & Commission Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                <DollarSign size={14} color="var(--text-muted)" />
                Total Transaction Amount (NGN)
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={sourceAmount}
                onChange={(e) => setSourceAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Commission Calculation Preview */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(22, 101, 52, 0.08)',
              border: '1px solid rgba(22, 101, 52, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} color="var(--forest)" />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Earned Commission ({numRate}%):
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--forest)' }}>
              {formatPrice(calculatedCommission, referral.listing?.currency || 'NGN')}
            </div>
          </div>

          {/* Optional Transaction Reference */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              <FileCheck size={14} color="var(--text-muted)" />
              Payment / Transaction Reference <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. TX_UPW_2026_0929"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 1-year lease signed and verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '13px',
                resize: 'vertical',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(22, 101, 52, 0.05)',
              border: '1px solid rgba(22, 101, 52, 0.15)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck size={16} color="var(--forest)" style={{ flexShrink: 0 }} />
            <span>
              Commission attribution is immutable and strictly allocated to the referring PM.
            </span>
          </div>

          {/* Form Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              className="btn btn--secondary"
              disabled={convertMutation.isPending}
              style={{ height: '38px', padding: '0 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={convertMutation.isPending}
              style={{
                height: '38px',
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{convertMutation.isPending ? 'Recording Conversion...' : 'Confirm & Earn Commission'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
