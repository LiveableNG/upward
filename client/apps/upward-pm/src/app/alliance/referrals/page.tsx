'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  Users,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  ArrowUpRight,
  DollarSign,
  Star,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  Share2,
  Sparkles,
  ExternalLink,
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

type LeadPotential = 'HIGH' | 'MEDIUM' | 'LOW'

const STAGES: { value: AllianceLeadStage; label: string; next?: AllianceLeadStage; nextLabel?: string }[] = [
  { value: 'NEW', label: 'New', next: 'CONTACTED', nextLabel: 'Mark as Contacted' },
  { value: 'CONTACTED', label: 'Contacted', next: 'INTERESTED', nextLabel: 'Mark as Interested' },
  { value: 'INTERESTED', label: 'Interested', next: 'VIEWING', nextLabel: 'Schedule Viewing' },
  { value: 'VIEWING', label: 'Viewing', next: 'APPLICATION', nextLabel: 'Mark as Application' },
  { value: 'APPLICATION', label: 'Application', next: 'CONVERTED', nextLabel: 'Record Converted Deal' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
]

/**
 * Portaled Lead Potential Selector
 */
function PotentialDropdown({
  potential,
  onSelect,
}: {
  potential: LeadPotential
  onSelect: (potential: LeadPotential) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 220
      setCoords({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        openUp,
      })
    }
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleScroll = () => setIsOpen(false)

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`alliance-potential-pill alliance-potential-pill--${potential.toLowerCase()}`}
        title="Click to adjust lead potential"
      >
        <span>●</span>
        <span>{potential}</span>
        <ChevronDown size={11} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.openUp ? 'auto' : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : 'auto',
              left: coords.left,
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.14)',
              padding: '8px',
              width: '230px',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#8a8a8a',
                padding: '4px 8px',
                textTransform: 'uppercase',
              }}
            >
              Lead Potential
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect('HIGH')
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 8px',
                borderRadius: '6px',
                background: potential === 'HIGH' ? 'rgba(22, 101, 52, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--forest)',
              }}
            >
              <div>● High Potential</div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: '#6b6b6b' }}>
                Strong buying intent & conversion likelihood.
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect('MEDIUM')
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 8px',
                borderRadius: '6px',
                background: potential === 'MEDIUM' ? 'rgba(217, 119, 6, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#b45309',
                marginTop: '2px',
              }}
            >
              <div>● Medium Potential</div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: '#6b6b6b' }}>
                Developing interest and ongoing discovery.
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect('LOW')
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 8px',
                borderRadius: '6px',
                background: potential === 'LOW' ? 'rgba(100, 116, 139, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#475569',
                marginTop: '2px',
              }}
            >
              <div>● Low Potential</div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: '#6b6b6b' }}>
                Early-stage or uncertain engagement.
              </div>
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}

/**
 * Portaled Lead Stage Selector
 */
function StageDropdown({
  currentStage,
  isClosed,
  onSelect,
  onAdvance,
}: {
  currentStage: AllianceLeadStage
  isClosed: boolean
  onSelect: (stage: AllianceLeadStage) => void
  onAdvance?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentStageObj = STAGES.find((s) => s.value === currentStage) || STAGES[0]

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 260
      setCoords({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        openUp,
      })
    }
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleScroll = () => setIsOpen(false)

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={isClosed}
        onClick={handleToggle}
        className="alliance-stage-selector"
        title="Change pipeline stage"
      >
        <span>{currentStageObj.label}</span>
        <ChevronDown size={12} color="#8a8a8a" />
      </button>

      {/* Fast Advance Stage Arrow */}
      {!isClosed && currentStageObj.next && onAdvance && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdvance()
          }}
          className="alliance-stage-advance-btn"
          title={`Advance to ${currentStageObj.nextLabel}`}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.openUp ? 'auto' : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : 'auto',
              left: coords.left,
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.14)',
              padding: '6px',
              width: '190px',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#8a8a8a',
                padding: '4px 8px',
                textTransform: 'uppercase',
              }}
            >
              Move Stage
            </div>
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  onSelect(s.value)
                  setIsOpen(false)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: currentStage === s.value ? 'rgba(22, 101, 52, 0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: currentStage === s.value ? 700 : 500,
                  color: currentStage === s.value ? 'var(--forest)' : '#171717',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{s.label}</span>
                {currentStage === s.value && <Check size={14} />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default function AllianceReferralsPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<AllianceReferralStatus | 'ALL'>('ALL')
  const [selectedStage, setSelectedStage] = useState<AllianceLeadStage | 'ALL'>('ALL')
  const [selectedPotentialFilter, setSelectedPotentialFilter] = useState<LeadPotential | 'ALL'>('ALL')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [convertReferral, setConvertReferral] = useState<AllianceReferral | null>(null)
  const [ratingReferral, setRatingReferral] = useState<AllianceReferral | null>(null)
  const [activeDrawerReferral, setActiveDrawerReferral] = useState<AllianceReferral | null>(null)
  const [mounted, setMounted] = useState(false)

  // Local storage map for lead potential temperature
  const [potentials, setPotentials] = useState<Record<string, LeadPotential>>({})

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem('upward_alliance_lead_potentials')
      if (stored) setPotentials(JSON.parse(stored))
    } catch {}
  }, [])

  const handleSetPotential = (uuid: string, potential: LeadPotential) => {
    const updated = { ...potentials, [uuid]: potential }
    setPotentials(updated)
    try {
      localStorage.setItem('upward_alliance_lead_potentials', JSON.stringify(updated))
    } catch {}
    toast.success(`Lead potential set to ${potential}`)
  }

  const getPotential = (referral: AllianceReferral): LeadPotential => {
    if (potentials[referral.uuid]) return potentials[referral.uuid]
    if (referral.matchedUser || (referral.clientEmail && referral.clientPhone)) return 'HIGH'
    if (referral.clientEmail || referral.clientPhone) return 'MEDIUM'
    return 'LOW'
  }

  const { data, isLoading, isError, error } = useAllianceReferrals({
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    stage: selectedStage === 'ALL' ? undefined : selectedStage,
    search: search.trim() || undefined,
  })

  const updateStageMutation = useUpdateAllianceLeadStage()
  const closeReferralMutation = useCloseAllianceReferral()

  const handleCopyLink = async (referral: AllianceReferral) => {
    const token = referral.shareToken || referral.referralToken || (referral as any).token || referral.uuid
    const url =
      referral.shareUrl ||
      (token ? `${window.location.origin}/alliance/referral/${token}` : '')

    if (!url) {
      toast.error('Referral share link not available')
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token || referral.uuid)
      toast.success('Referral share link copied')
      setTimeout(() => setCopiedToken(null), 2500)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleStageChange = async (referral: AllianceReferral, newStage: AllianceLeadStage) => {
    if (newStage === 'CONVERTED') {
      setConvertReferral(referral)
      return
    }
    if (newStage === 'LOST') {
      handleCloseReferral(referral.uuid)
      return
    }

    try {
      await updateStageMutation.mutateAsync({
        uuid: referral.uuid,
        payload: { stage: newStage },
      })
      toast.success(`Lead moved to ${newStage.charAt(0) + newStage.slice(1).toLowerCase()}`)
      if (activeDrawerReferral?.uuid === referral.uuid) {
        setActiveDrawerReferral({
          ...activeDrawerReferral,
          stage: newStage,
          leadStage: newStage,
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead stage')
    }
  }

  const handleAdvanceStage = (referral: AllianceReferral) => {
    const stage = referral.stage || referral.leadStage || 'NEW'
    const current = STAGES.find((s) => s.value === stage)
    if (!current?.next) return
    handleStageChange(referral, current.next)
  }

  const handleCloseReferral = async (referralUuid: string) => {
    if (!confirm('Are you sure you want to close this referral / mark as lost?')) return
    try {
      await closeReferralMutation.mutateAsync({
        uuid: referralUuid,
        payload: { reason: 'Closed by referring PM' },
      })
      toast.success('Lead marked as closed/lost')
      if (activeDrawerReferral?.uuid === referralUuid) {
        setActiveDrawerReferral({
          ...activeDrawerReferral,
          status: 'CLOSED',
          stage: 'LOST',
          leadStage: 'LOST',
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to close lead')
    }
  }

  const formatPrice = (amount?: number, currency: string = 'NGN') => {
    if (amount === undefined || amount === null) return 'N/A'
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const rawReferrals = data?.items || []

  // Filter by potential if selected
  const referrals = rawReferrals.filter((r) => {
    if (selectedPotentialFilter === 'ALL') return true
    return getPotential(r) === selectedPotentialFilter
  })

  // Stage count statistics for horizontal tabs
  const stageCounts: Record<string, number> = {
    ALL: rawReferrals.length,
    NEW: rawReferrals.filter((r) => (r.stage || r.leadStage || 'NEW') === 'NEW').length,
    CONTACTED: rawReferrals.filter((r) => (r.stage || r.leadStage) === 'CONTACTED').length,
    INTERESTED: rawReferrals.filter((r) => (r.stage || r.leadStage) === 'INTERESTED').length,
    VIEWING: rawReferrals.filter((r) => (r.stage || r.leadStage) === 'VIEWING').length,
    APPLICATION: rawReferrals.filter((r) => (r.stage || r.leadStage) === 'APPLICATION').length,
    CONVERTED: rawReferrals.filter((r) => (r.stage || r.leadStage) === 'CONVERTED').length,
    LOST: rawReferrals.filter((r) => (r.stage || r.leadStage) === 'LOST' || r.status === 'CLOSED').length,
  }

  return (
    <div className="alliance-pipeline-page">
      {/* Header */}
      <div className="alliance-pipeline-header">
        <div className="alliance-pipeline-title-group">
          <h1>
            Referrals & Leads
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--forest)',
                background: 'rgba(22, 101, 52, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(22, 101, 52, 0.15)',
              }}
            >
              Alliance Co-Brokerage
            </span>
          </h1>
          <p>Manage referred clients and track their property opportunities.</p>
        </div>

        <Link
          href="/alliance/discover"
          className="btn btn--primary"
          style={{
            height: '40px',
            padding: '0 16px',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <Share2 size={15} />
          <span>Discover & Refer</span>
        </Link>
      </div>

      {/* Pipeline Segmented Overview Bar */}
      <div className="alliance-pipeline-tabs">
        <button
          type="button"
          onClick={() => setSelectedStage('ALL')}
          className={`alliance-pipeline-tab ${selectedStage === 'ALL' ? 'alliance-pipeline-tab--active' : ''}`}
        >
          <span>All Leads</span>
          <span className="alliance-pipeline-tab__count">{stageCounts.ALL}</span>
        </button>

        {STAGES.map((st) => (
          <button
            key={st.value}
            type="button"
            onClick={() => setSelectedStage(st.value)}
            className={`alliance-pipeline-tab ${selectedStage === st.value ? 'alliance-pipeline-tab--active' : ''}`}
          >
            <span>{st.label}</span>
            <span className="alliance-pipeline-tab__count">{stageCounts[st.value] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search & Compact Filter Bar */}
      <ControlBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search client, property or contact..."
        />

        <FilterGroup>
          <FilterDropdown
            label="Potential"
            value={selectedPotentialFilter}
            icon={Sparkles}
            options={[
              { label: 'All Potential', value: 'ALL' },
              { label: 'High Potential', value: 'HIGH' },
              { label: 'Medium Potential', value: 'MEDIUM' },
              { label: 'Low Potential', value: 'LOW' },
            ]}
            onChange={(val) => setSelectedPotentialFilter(val as any)}
          />

          <FilterDropdown
            label="Stage"
            value={selectedStage}
            icon={Layers}
            options={[
              { label: 'All Stages', value: 'ALL' },
              ...STAGES.map((s) => ({ label: s.label, value: s.value })),
            ]}
            onChange={(val) => setSelectedStage(val as any)}
          />

          <FilterDropdown
            label="Status"
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
        </FilterGroup>
      </ControlBar>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="alliance-lead-card-container" style={{ padding: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: '56px',
                background: '#f3f4f6',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          className="alliance-lead-card-container"
          style={{
            padding: '36px',
            textAlign: 'center',
            color: 'var(--danger)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={28} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load leads</div>
          <p style={{ fontSize: '12.5px', color: '#6b6b6b', margin: 0 }}>
            {(error as any)?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && referrals.length === 0 && (
        <div
          className="alliance-lead-card-container"
          style={{
            padding: '64px 24px',
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
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#171717' }}>
            No referrals yet
          </h3>
          <p style={{ fontSize: '13.5px', color: '#6b6b6b', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
            {search || selectedStage !== 'ALL' || selectedPotentialFilter !== 'ALL'
              ? 'No referred clients match your active filters. Try clearing search filters.'
              : 'When you refer a client to an Alliance listing, their opportunity will appear here in your sales pipeline.'}
          </p>
          <Link
            href="/alliance/discover"
            className="btn btn--primary"
            style={{ marginTop: '8px', height: '40px', padding: '0 20px', textDecoration: 'none' }}
          >
            Discover Listings
          </Link>
        </div>
      )}

      {/* Lead Pipeline Table */}
      {!isLoading && !isError && referrals.length > 0 && (
        <div className="alliance-lead-card-container">
          <table className="alliance-lead-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Client</th>
                <th style={{ width: '30%' }}>Property</th>
                <th style={{ width: '14%' }}>Potential</th>
                <th style={{ width: '14%' }}>Stage</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => {
                const potential = getPotential(referral)
                const isClosed = referral.status === 'CLOSED' || (referral.stage || referral.leadStage) === 'LOST'
                const referralStage = referral.stage || referral.leadStage || 'NEW'
                const clientDisplayName = referral.clientName || referral.clientEmail || 'Unnamed Prospect'

                return (
                  <tr
                    key={referral.uuid}
                    className="alliance-lead-row"
                    onClick={() => setActiveDrawerReferral(referral)}
                  >
                    {/* Client Column */}
                    <td>
                      <div className="alliance-client-cell">
                        <div className="alliance-client-avatar">
                          {clientDisplayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="alliance-client-name">
                            <span>{clientDisplayName}</span>
                            {referral.matchedUser && (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  color: 'var(--forest)',
                                  background: 'rgba(22, 101, 52, 0.08)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                }}
                                title="Matched to registered Upward user"
                              >
                                Upward User
                              </span>
                            )}
                          </div>
                          <div className="alliance-client-contacts">
                            {referral.clientEmail && <span>{referral.clientEmail}</span>}
                            {referral.clientEmail && referral.clientPhone && <span>·</span>}
                            {referral.clientPhone && <span>{referral.clientPhone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Property Column */}
                    <td>
                      {referral.listing ? (
                        <div>
                          <Link
                            href={`/alliance/discover/${referral.listing.uuid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="alliance-lead-prop-title"
                          >
                            <span>{referral.listing.title}</span>
                            <ArrowUpRight size={13} color="#8a8a8a" />
                          </Link>
                          <div className="alliance-lead-prop-meta">
                            {[referral.listing.city, referral.listing.state].filter(Boolean).join(', ')}
                            {referral.listing.pm && (
                              <span> · {referral.listing.pm.companyName || referral.listing.pm.name}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--forest)', marginTop: '2px' }}>
                            {formatPrice(referral.listing.price, referral.listing.currency)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12.5px', color: '#8a8a8a' }}>No property attached</span>
                      )}
                    </td>

                    {/* Potential Temperature Column (Portaled Dropdown) */}
                    <td>
                      <PotentialDropdown
                        potential={potential}
                        onSelect={(p) => handleSetPotential(referral.uuid, p)}
                      />
                    </td>

                    {/* Pipeline Stage Column (Portaled Dropdown) */}
                    <td>
                      <StageDropdown
                        currentStage={referralStage}
                        isClosed={isClosed}
                        onSelect={(s) => handleStageChange(referral, s)}
                        onAdvance={() => handleAdvanceStage(referral)}
                      />
                    </td>

                    {/* Actions Column */}
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleCopyLink(referral)}
                          className="btn btn--secondary"
                          style={{
                            height: '32px',
                            padding: '0 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Copy client referral link"
                        >
                          {copiedToken === referral.referralToken ? (
                            <>
                              <Check size={13} color="var(--forest)" />
                              <span style={{ color: 'var(--forest)' }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Drawer (Slide-Over) */}
      {activeDrawerReferral &&
        mounted &&
        createPortal(
          <div
            className="alliance-drawer-overlay"
            onClick={() => setActiveDrawerReferral(null)}
          >
            <div className="alliance-drawer" onClick={(e) => e.stopPropagation()}>
              {/* Drawer Header */}
              <div className="alliance-drawer__header">
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#171717' }}>
                    {activeDrawerReferral.clientName || activeDrawerReferral.clientEmail || 'Client Opportunity'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span
                      className={`alliance-potential-pill alliance-potential-pill--${getPotential(
                        activeDrawerReferral,
                      ).toLowerCase()}`}
                    >
                      <span>●</span>
                      <span>{getPotential(activeDrawerReferral)} POTENTIAL</span>
                    </span>
                    <span style={{ fontSize: '12px', color: '#8a8a8a' }}>
                      Referred {new Date(activeDrawerReferral.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDrawerReferral(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8a8a8a',
                    padding: '6px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="alliance-drawer__body">
                {/* Next Action Shortcut */}
                {activeDrawerReferral.status !== 'CLOSED' && (() => {
                  const drawerStage = activeDrawerReferral.stage || activeDrawerReferral.leadStage || 'NEW'
                  return (
                    <div
                      style={{
                        background: 'rgba(22, 101, 52, 0.05)',
                        border: '1px solid rgba(22, 101, 52, 0.15)',
                        borderRadius: '12px',
                        padding: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'var(--forest)',
                          marginBottom: '4px',
                        }}
                      >
                        Suggested Next Action
                      </div>
                      <div style={{ fontSize: '13.5px', color: '#171717', fontWeight: 600, marginBottom: '12px' }}>
                        {drawerStage === 'NEW' &&
                          'Reach out to client to introduce property opportunities.'}
                        {drawerStage === 'CONTACTED' &&
                          'Follow up on client interest and questions.'}
                        {drawerStage === 'INTERESTED' &&
                          'Coordinate physical or virtual property viewing.'}
                        {drawerStage === 'VIEWING' &&
                          'Assist client with leasing/purchase application.'}
                        {drawerStage === 'APPLICATION' &&
                          'Record confirmed transaction and earn commission attribution.'}
                        {drawerStage === 'CONVERTED' &&
                          'Deal completed! Rate your co-brokerage partner.'}
                      </div>

                      {drawerStage !== 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStage(activeDrawerReferral)}
                          className="btn btn--primary"
                          style={{
                            width: '100%',
                            height: '40px',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>
                            {STAGES.find((s) => s.value === drawerStage)?.nextLabel ||
                              'Advance Stage'}
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      )}

                      {drawerStage === 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRatingReferral(activeDrawerReferral)
                            setActiveDrawerReferral(null)
                          }}
                          className="btn btn--secondary"
                          style={{ width: '100%', height: '38px', fontSize: '13px', fontWeight: 600, color: '#eab308' }}
                        >
                          <Star size={14} />
                          <span>Rate Co-Broker Experience</span>
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Client Information */}
                <div>
                  <div className="alliance-drawer-section-label">Client Details</div>
                  <div
                    style={{
                      background: '#fafaf9',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#171717' }}>
                      {activeDrawerReferral.clientName || 'Unnamed Client'}
                    </div>
                    {activeDrawerReferral.clientEmail && (
                      <a
                        href={`mailto:${activeDrawerReferral.clientEmail}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          color: '#171717',
                          textDecoration: 'none',
                        }}
                      >
                        <Mail size={14} color="#8a8a8a" />
                        <span>{activeDrawerReferral.clientEmail}</span>
                      </a>
                    )}
                    {activeDrawerReferral.clientPhone && (
                      <a
                        href={`tel:${activeDrawerReferral.clientPhone}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          color: '#171717',
                          textDecoration: 'none',
                        }}
                      >
                        <Phone size={14} color="#8a8a8a" />
                        <span>{activeDrawerReferral.clientPhone}</span>
                      </a>
                    )}
                    {activeDrawerReferral.clientNotes && (
                      <div
                        style={{
                          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                          paddingTop: '10px',
                          fontSize: '12.5px',
                          color: '#6b6b6b',
                        }}
                      >
                        <strong style={{ color: '#171717' }}>Private Notes:</strong>{' '}
                        {activeDrawerReferral.clientNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                {activeDrawerReferral.listing && (
                  <div>
                    <div className="alliance-drawer-section-label">Property Opportunity</div>
                    <div
                      style={{
                        background: '#fafaf9',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <Link
                        href={`/alliance/discover/${activeDrawerReferral.listing.uuid}`}
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#171717',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{activeDrawerReferral.listing.title}</span>
                        <ExternalLink size={13} color="#8a8a8a" />
                      </Link>
                      <div style={{ fontSize: '12px', color: '#6b6b6b' }}>
                        {[
                          activeDrawerReferral.listing.address,
                          activeDrawerReferral.listing.city,
                          activeDrawerReferral.listing.state,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--forest)' }}>
                        {formatPrice(
                          activeDrawerReferral.listing.price,
                          activeDrawerReferral.listing.currency,
                        )}
                      </div>
                      {activeDrawerReferral.listing.pm && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#8a8a8a',
                            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                            paddingTop: '6px',
                          }}
                        >
                          Listing Owner:{' '}
                          <strong>
                            {activeDrawerReferral.listing.pm.companyName ||
                              activeDrawerReferral.listing.pm.name}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Vertical Pipeline Timeline */}
                <div>
                  <div className="alliance-drawer-section-label">Pipeline History</div>
                  <div className="alliance-timeline">
                    {(() => {
                      const drawerStage = activeDrawerReferral.stage || activeDrawerReferral.leadStage || 'NEW'
                      const currentStageIndex = STAGES.findIndex((s) => s.value === drawerStage)

                      return STAGES.slice(0, 6).map((stage, idx) => {
                        const isCompleted = currentStageIndex > idx
                        const isCurrent = drawerStage === stage.value

                        return (
                          <div key={stage.value} className="alliance-timeline-node">
                            <div
                              className={`alliance-timeline-dot ${
                                isCurrent
                                  ? 'alliance-timeline-dot--active'
                                  : isCompleted
                                  ? 'alliance-timeline-dot--completed'
                                  : ''
                              }`}
                            >
                              {isCompleted && <Check size={10} />}
                            </div>
                            <div
                              className={`alliance-timeline-label ${
                                isCurrent ? 'alliance-timeline-label--active' : ''
                              }`}
                            >
                              {stage.label}
                            </div>
                            {isCurrent && (
                              <span style={{ fontSize: '11px', color: '#8a8a8a' }}>
                                Current active stage
                              </span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    paddingTop: '18px',
                    marginTop: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleCopyLink(activeDrawerReferral)}
                    className="btn btn--secondary"
                    style={{ width: '100%', height: '40px', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Copy size={14} />
                    <span>Copy Referral Share Link</span>
                  </button>

                  {activeDrawerReferral.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => handleCloseReferral(activeDrawerReferral.uuid)}
                      className="btn btn--text"
                      style={{ color: '#dc2626', fontSize: '12.5px', height: '32px' }}
                    >
                      Close Lead / Mark as Lost
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
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
