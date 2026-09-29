'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  Filter,
  Share2,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  FileText,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'
import { AllianceNavTabs } from '@/features/alliance/components/AllianceNavTabs'
import {
  useAllianceReferrals,
  useUpdateAllianceLeadStage,
  useCloseAllianceReferral,
} from '@/features/alliance/hooks/useAlliance'
import {
  AllianceReferral,
  AllianceLeadStage,
  AllianceReferralStatus,
} from '@/features/alliance/types/alliance.types'
import { useToast } from '@/components/common/Toast'

const STAGES: { value: AllianceLeadStage; label: string; color: string }[] = [
  { value: 'NEW', label: 'New Lead', color: '#3b82f6' },
  { value: 'CONTACTED', label: 'Contacted', color: '#8b5cf6' },
  { value: 'INTERESTED', label: 'Interested', color: '#06b6d4' },
  { value: 'VIEWING', label: 'Viewing Scheduled', color: '#f59e0b' },
  { value: 'APPLICATION', label: 'Application Submitted', color: '#ec4899' },
  { value: 'CONVERTED', label: 'Converted / Closed Deal', color: '#10b981' },
  { value: 'LOST', label: 'Lost / Disqualified', color: '#6b7280' },
]

export default function AllianceReferralsPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<AllianceReferralStatus | 'ALL'>('ALL')
  const [selectedStage, setSelectedStage] = useState<AllianceLeadStage | 'ALL'>('ALL')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useAllianceReferrals({
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    leadStage: selectedStage === 'ALL' ? undefined : selectedStage,
    search: search.trim() || undefined,
  })

  const updateStageMutation = useUpdateAllianceLeadStage()
  const closeReferralMutation = useCloseAllianceReferral()

  const handleCopyLink = async (referral: AllianceReferral) => {
    const url =
      referral.shareUrl ||
      `${window.location.origin}/alliance/referral/${referral.referralToken}`

    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(referral.referralToken)
      toast.success('Referral share link copied')
      setTimeout(() => setCopiedToken(null), 2500)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleStageChange = async (referralUuid: string, newStage: AllianceLeadStage) => {
    try {
      await updateStageMutation.mutateAsync({
        uuid: referralUuid,
        payload: { leadStage: newStage },
      })
      toast.success(`Lead stage updated to ${newStage}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead stage')
    }
  }

  const handleCloseReferral = async (referralUuid: string) => {
    if (!confirm('Are you sure you want to close this referral relationship?')) return

    try {
      await closeReferralMutation.mutateAsync({
        uuid: referralUuid,
        payload: { reason: 'Closed by referring PM' },
      })
      toast.success('Referral relationship marked as closed')
    } catch (err: any) {
      toast.error(err.message || 'Failed to close referral')
    }
  }

  const formatPrice = (amount?: number, currency: string = 'NGN') => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const referrals = data?.items || []

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Alliance Navigation Header */}
      <AllianceNavTabs activeTab="referrals" />

      {/* Page Title & Intro */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              My Referrals & Leads
            </h1>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '16px',
                background: 'rgba(22, 101, 52, 0.1)',
                color: 'var(--forest)',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {data?.meta?.total ?? 0} Total
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0', maxWidth: '650px' }}>
            Track and progress clients you have introduced to Alliance partner listings. You hold exclusive attribution for each active referral.
          </p>
        </div>

        <Link
          href="/alliance/discover"
          className="btn btn--primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '40px',
            padding: '0 16px',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          <Search size={16} />
          <span>Discover Network Listings</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: 'var(--dark)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by client, listing or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CONVERTED">Converted</option>
            <option value="CLOSED">Closed / Lost</option>
          </select>
        </div>

        {/* Stage Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Stage:</span>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '140px',
                background: 'var(--dark)',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          style={{
            padding: '32px',
            background: 'var(--dark)',
            borderRadius: '14px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center',
            color: 'var(--danger)',
          }}
        >
          <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load referrals</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {(error as any)?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && referrals.length === 0 && (
        <div
          style={{
            padding: '56px 24px',
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(22, 101, 52, 0.1)',
              color: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            No Referrals Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: 0 }}>
            {search || selectedStatus !== 'ALL' || selectedStage !== 'ALL'
              ? 'No referrals match your current filter criteria. Try clearing search filters.'
              : 'You have not referred any clients to Alliance listings yet. Browse partner listings on the network and create your first referral link.'}
          </p>
          <Link
            href="/alliance/discover"
            className="btn btn--primary"
            style={{ marginTop: '12px', height: '38px', textDecoration: 'none' }}
          >
            Discover Listings to Refer
          </Link>
        </div>
      )}

      {/* Referrals List */}
      {!isLoading && !isError && referrals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {referrals.map((referral) => {
            const currentStageObj = STAGES.find((s) => s.value === referral.leadStage) || STAGES[0]
            const isClosed = referral.status === 'CLOSED'
            const isConverted = referral.status === 'CONVERTED'

            return (
              <div
                key={referral.uuid}
                style={{
                  background: 'var(--dark)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Top Row: Client & Status Badges */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(22, 101, 52, 0.1)',
                        color: 'var(--forest)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {(referral.clientName || referral.clientEmail || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                          {referral.clientName || 'Unnamed Prospect'}
                        </h3>
                        {referral.matchedUser && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                            title="Matched to registered Upward user account"
                          >
                            <UserCheck size={12} />
                            Upward User
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginTop: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {referral.clientEmail && (
                          <a
                            href={`mailto:${referral.clientEmail}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}
                          >
                            <Mail size={13} color="var(--text-muted)" />
                            {referral.clientEmail}
                          </a>
                        )}
                        {referral.clientPhone && (
                          <a
                            href={`tel:${referral.clientPhone}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}
                          >
                            <Phone size={13} color="var(--text-muted)" />
                            {referral.clientPhone}
                          </a>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                          <Calendar size={13} />
                          Referred {new Date(referral.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage & Status Badge Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: `${currentStageObj.color}15`,
                        color: currentStageObj.color,
                        border: `1px solid ${currentStageObj.color}35`,
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: currentStageObj.color,
                        }}
                      />
                      {currentStageObj.label}
                    </span>

                    {isConverted && (
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        CONVERTED
                      </span>
                    )}

                    {isClosed && (
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: 'rgba(107, 114, 128, 0.1)',
                          color: '#9ca3af',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        CLOSED
                      </span>
                    )}
                  </div>
                </div>

                {/* Listing Snippet Card */}
                {referral.listing && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={16} color="var(--forest)" style={{ flexShrink: 0 }} />
                      <div>
                        <Link
                          href={`/alliance/discover/${referral.listing.uuid}`}
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {referral.listing.title}
                          <ArrowUpRight size={13} color="var(--text-muted)" />
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {[referral.listing.city, referral.listing.state].filter(Boolean).join(', ')} • Owner: {referral.listing.pm?.companyName || referral.listing.pm?.name || 'Partner PM'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--forest)' }}>
                      {formatPrice(referral.listing.price, referral.listing.currency)}
                    </div>
                  </div>
                )}

                {/* Client Notes (if any) */}
                {referral.clientNotes && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.15)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--border)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '6px' }}>
                      Private Note:
                    </span>
                    {referral.clientNotes}
                  </div>
                )}

                {/* Bottom Actions Row: Stage Dropdown & Share Link Button */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Progress Stage:
                    </span>
                    <select
                      value={referral.leadStage}
                      onChange={(e) => handleStageChange(referral.uuid, e.target.value as AllianceLeadStage)}
                      disabled={updateStageMutation.isPending || isClosed}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isClosed ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {STAGES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleCloseReferral(referral.uuid)}
                        disabled={closeReferralMutation.isPending}
                        className="btn btn--text"
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          padding: '4px 8px',
                          marginLeft: '4px',
                        }}
                      >
                        Close Lead
                      </button>
                    )}
                  </div>

                  {/* Share Link Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(referral)}
                    className="btn btn--secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '34px',
                      padding: '0 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {copiedToken === referral.referralToken ? (
                      <>
                        <Check size={14} color="var(--forest)" />
                        <span style={{ color: 'var(--forest)' }}>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Referral Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
