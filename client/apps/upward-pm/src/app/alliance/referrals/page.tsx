'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  ArrowUpRight,
  DollarSign,
  Star,
  Activity,
  Layers,
} from 'lucide-react'
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
import { ConvertReferralModal } from '@/features/alliance/components/ConvertReferralModal'
import { RatingModal } from '@/features/alliance/components/RatingModal'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterGroup } from '@/components/ui/ControlBar/FilterGroup'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'

const STAGES: { value: AllianceLeadStage; label: string; color: string }[] = [
  { value: 'NEW', label: 'New Lead', color: '#3b82f6' },
  { value: 'CONTACTED', label: 'Contacted', color: '#8b5cf6' },
  { value: 'INTERESTED', label: 'Interested', color: '#06b6d4' },
  { value: 'VIEWING', label: 'Viewing Scheduled', color: '#f59e0b' },
  { value: 'APPLICATION', label: 'Application Submitted', color: '#ec4899' },
  { value: 'CONVERTED', label: 'Converted Deal', color: '#10b981' },
  { value: 'LOST', label: 'Lost / Closed', color: '#6b7280' },
]

export default function AllianceReferralsPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<AllianceReferralStatus | 'ALL'>('ALL')
  const [selectedStage, setSelectedStage] = useState<AllianceLeadStage | 'ALL'>('ALL')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [convertReferral, setConvertReferral] = useState<AllianceReferral | null>(null)
  const [ratingReferral, setRatingReferral] = useState<AllianceReferral | null>(null)

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
      toast.success('Referral relationship closed')
    } catch (err: any) {
      toast.error(err.message || 'Failed to close referral')
    }
  }

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const referrals = data?.items || []

  return (
    <div>
      {/* Filters Bar via ControlBar */}
      <div style={{ marginBottom: '20px' }}>
        <ControlBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by client name, email, or phone..."
          />

          <FilterGroup>
            <FilterDropdown
              label="Referral Status"
              value={selectedStatus}
              icon={Activity}
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Converted', value: 'CONVERTED' },
                { label: 'Closed / Lost', value: 'CLOSED' },
              ]}
              onChange={(val) => setSelectedStatus(val as any)}
            />

            <FilterDropdown
              label="Lead Stage"
              value={selectedStage}
              icon={Layers}
              options={[
                { label: 'All Stages', value: 'ALL' },
                ...STAGES.map((s) => ({ label: s.label, value: s.value })),
              ]}
              onChange={(val) => setSelectedStage(val as any)}
            />
          </FilterGroup>
        </ControlBar>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card animate-pulse"
              style={{ height: '140px', borderRadius: '16px' }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          className="card"
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--danger)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={28} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load referrals</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {(error as any)?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && referrals.length === 0 && (
        <div
          className="card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(22, 101, 52, 0.08)',
              color: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={26} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
            No Referrals Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
            {search || selectedStatus !== 'ALL' || selectedStage !== 'ALL'
              ? 'No referrals match your current filter criteria. Try adjusting your search query.'
              : 'You have not referred any clients to Alliance listings yet. Browse partner listings on the network and create your first referral link.'}
          </p>
          <Link
            href="/alliance/discover"
            className="btn btn--primary"
            style={{ marginTop: '8px', height: '38px', textDecoration: 'none' }}
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
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(22, 101, 52, 0.08)',
                        color: 'var(--forest)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      {(referral.clientName || referral.clientEmail || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
                          {referral.clientName || 'Unnamed Prospect'}
                        </h3>
                        {referral.matchedUser && (
                          <span
                            className="alliance-chip"
                            style={{ fontSize: '10.5px', padding: '1px 7px' }}
                            title="Matched to registered Upward user account"
                          >
                            <UserCheck size={11} />
                            Upward User
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginTop: '3px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {referral.clientEmail && (
                          <a
                            href={`mailto:${referral.clientEmail}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}
                          >
                            <Mail size={12} color="var(--text-muted)" />
                            {referral.clientEmail}
                          </a>
                        )}
                        {referral.clientPhone && (
                          <a
                            href={`tel:${referral.clientPhone}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}
                          >
                            <Phone size={12} color="var(--text-muted)" />
                            {referral.clientPhone}
                          </a>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          Referred {new Date(referral.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage & Status Badge Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        background: `${currentStageObj.color}15`,
                        color: currentStageObj.color,
                        border: `1px solid ${currentStageObj.color}35`,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
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
                          padding: '3px 8px',
                          borderRadius: '9999px',
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
                          padding: '3px 8px',
                          borderRadius: '9999px',
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--ivory-dim)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={15} color="var(--forest)" style={{ flexShrink: 0 }} />
                      <div>
                        <Link
                          href={`/alliance/discover/${referral.listing.uuid}`}
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {referral.listing.title}
                          <ArrowUpRight size={12} color="var(--text-muted)" />
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {[referral.listing.city, referral.listing.state].filter(Boolean).join(', ')} • Owner: {referral.listing.pm?.companyName || referral.listing.pm?.name || 'Partner PM'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--forest)' }}>
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
                      background: 'var(--ivory-dim)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--forest)',
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
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '10px',
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
                        padding: '5px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
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
                        }}
                      >
                        Close Lead
                      </button>
                    )}
                  </div>

                  {/* Action Buttons: Convert, Rate & Share Link */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {!isClosed && !isConverted && (
                      <button
                        type="button"
                        onClick={() => setConvertReferral(referral)}
                        className="btn btn--primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '32px',
                          padding: '0 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        <DollarSign size={13} />
                        <span>Record Deal & Commission</span>
                      </button>
                    )}

                    {isConverted && (
                      <button
                        type="button"
                        onClick={() => setRatingReferral(referral)}
                        className="btn btn--secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '32px',
                          padding: '0 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#eab308',
                        }}
                      >
                        <Star size={13} />
                        <span>Rate Experience</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyLink(referral)}
                      className="btn btn--secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '32px',
                        padding: '0 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {copiedToken === referral.referralToken ? (
                        <>
                          <Check size={13} color="var(--forest)" />
                          <span style={{ color: 'var(--forest)' }}>Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Convert Referral Modal */}
      {convertReferral && (
        <ConvertReferralModal
          isOpen={Boolean(convertReferral)}
          onClose={() => setConvertReferral(null)}
          referral={convertReferral}
        />
      )}

      {/* Rating Modal */}
      {ratingReferral && (
        <RatingModal
          isOpen={Boolean(ratingReferral)}
          onClose={() => setRatingReferral(null)}
          referral={ratingReferral}
        />
      )}
    </div>
  )
}
