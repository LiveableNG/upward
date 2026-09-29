'use client'

import React, { useState } from 'react'
import {
  X,
  Share2,
  CheckCircle2,
  Copy,
  Check,
  User,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { useCreateAllianceReferral } from '../hooks/useAlliance'
import { AllianceReferral } from '../types/alliance.types'
import { useToast } from '@/components/common/Toast'
import Link from 'next/link'

interface ShareReferralModalProps {
  isOpen: boolean
  onClose: () => void
  listingUuid: string
  listingTitle: string
  listingPrice?: number
  listingCurrency?: string
  listingLocation?: string
}

export function ShareReferralModal({
  isOpen,
  onClose,
  listingUuid,
  listingTitle,
  listingPrice,
  listingCurrency = 'NGN',
  listingLocation,
}: ShareReferralModalProps) {
  const toast = useToast()
  const createReferralMutation = useCreateAllianceReferral()

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [createdReferral, setCreatedReferral] = useState<AllianceReferral | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleReset = () => {
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setClientNotes('')
    setCreatedReferral(null)
    setFormError(null)
    setIsCopied(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmedEmail = clientEmail.trim()
    const trimmedPhone = clientPhone.trim()

    if (!trimmedEmail && !trimmedPhone) {
      setFormError('Please provide at least a client email or phone number.')
      return
    }

    try {
      const res = await createReferralMutation.mutateAsync({
        listingUuid,
        payload: {
          clientName: clientName.trim() || undefined,
          clientEmail: trimmedEmail || undefined,
          clientPhone: trimmedPhone || undefined,
          clientNotes: clientNotes.trim() || undefined,
        },
      })
      setCreatedReferral(res)
      toast.success('Referral created successfully!')
    } catch (err: any) {
      const message = err.message || 'Failed to create referral.'
      setFormError(message)
      toast.error(message)
    }
  }

  const handleCopyLink = async () => {
    if (!createdReferral?.shareUrl && !createdReferral?.referralToken) return
    const url =
      createdReferral.shareUrl ||
      `${window.location.origin}/alliance/referral/${createdReferral.referralToken}`

    try {
      await navigator.clipboard.writeText(url)
      setIsCopied(true)
      toast.success('Referral link copied to clipboard')
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      toast.error('Failed to copy link to clipboard')
    }
  }

  const formatPrice = (amount?: number, currency: string = 'NGN') => {
    if (!amount) return ''
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
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
          background: 'var(--dark)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
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
              <Share2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                {createdReferral ? 'Referral Link Ready' : 'Refer Client / Share Listing'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                {createdReferral
                  ? 'Share this unique link with your prospective client'
                  : 'You own the referral relationship and future commission attribution'}
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

        {/* Listing Snippet */}
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
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '12px' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{listingTitle}</div>
            {listingLocation && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{listingLocation}</div>
            )}
          </div>
          {listingPrice !== undefined && (
            <div style={{ fontWeight: 700, color: 'var(--forest)', whiteSpace: 'nowrap' }}>
              {formatPrice(listingPrice, listingCurrency)}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px' }}>
          {createdReferral ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(22, 101, 52, 0.08)',
                  border: '1px solid rgba(22, 101, 52, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <CheckCircle2 size={22} color="var(--forest)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--forest)' }}>
                    Referral Active & Attributed
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    {createdReferral.matchedUser ? (
                      <span>
                        Client was matched to registered Upward user{' '}
                        <strong>{createdReferral.matchedUser.firstName || createdReferral.matchedUser.email}</strong>.
                      </span>
                    ) : (
                      <span>Client recorded as an external prospect. Exclusivity secured for this listing.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Share URL Box */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Client Referral Link
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={
                      createdReferral.shareUrl ||
                      `${window.location.origin}/alliance/referral/${createdReferral.referralToken}`
                    }
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn btn--primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      height: '40px',
                    }}
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <Link
                  href="/alliance/referrals"
                  className="btn btn--secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                  onClick={handleReset}
                >
                  <ExternalLink size={14} />
                  <span>View in Lead Pipeline</span>
                </Link>
                <button type="button" onClick={handleReset} className="btn btn--primary" style={{ height: '36px' }}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  <User size={14} color="var(--text-muted)" />
                  Client / Prospect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Okon"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                    <Mail size={14} color="var(--text-muted)" />
                    Client Email
                  </label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
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
                    <Phone size={14} color="var(--text-muted)" />
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="08012345678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
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

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  <FileText size={14} color="var(--text-muted)" />
                  Private Client Notes <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(visible only to you)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Relocating next month, budget is flexible"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
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
                  By creating this referral, you secure exclusivity for this client on this listing. The listing owner does not receive your client's contact info.
                </span>
              </div>

              {/* Form Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn--secondary"
                  disabled={createReferralMutation.isPending}
                  style={{ height: '38px', padding: '0 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={createReferralMutation.isPending}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Share2 size={16} />
                  <span>{createReferralMutation.isPending ? 'Generating Referral...' : 'Create Referral Link'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
