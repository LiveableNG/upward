'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  CheckCircle2,
  Building2,
  UserPlus,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api'

export interface SelectedPmData {
  id?: number
  name: string
  businessName?: string
  email?: string
  phone?: string
  pmType?: string
  companyName?: string
  isInvited?: boolean
}

interface PmSearchSelectProps {
  value: {
    pmEmail: string
    pmName: string
    pmType: string
    companyName: string
    pmInviteEmail: string
    pmFound: boolean
    pmDetails: { id?: number; name?: string; businessName?: string } | null
  }
  onChange: (patch: {
    pmEmail: string
    pmName: string
    pmType: string
    companyName: string
    pmInviteEmail: string
    pmFound: boolean
    pmDetails: { id?: number; name?: string; businessName?: string } | null
    landlordSkipped?: boolean
  }) => void
  disabled?: boolean
  isManaged?: boolean
  managerLabel?: string
}

export function PmSearchSelect({
  value,
  onChange,
  disabled = false,
  isManaged = false,
  managerLabel,
}: PmSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isInviteMode, setIsInviteMode] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Initialize selected view if PM already linked
  const isSelected = Boolean(value.pmFound && value.pmDetails)

  // Real-time live search query
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/user/pm-connection/search?q=${encodeURIComponent(trimmed)}`)
        const results = (res as any)?.data || []
        setSearchResults(results)
        setHasSearched(true)
      } catch {
        setSearchResults([])
        setHasSearched(true)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchQuery])

  const handleSelectPm = (pm: any) => {
    onChange({
      pmEmail: pm.email || '',
      pmName: pm.name || `${pm.firstName} ${pm.lastName}`.trim(),
      pmType: pm.pmType || 'Property Manager',
      companyName: pm.businessName || '',
      pmInviteEmail: '',
      pmFound: true,
      pmDetails: {
        id: pm.id,
        name: pm.name || `${pm.firstName} ${pm.lastName}`.trim(),
        businessName: pm.businessName || `${pm.firstName} ${pm.lastName}`.trim(),
      },
      landlordSkipped: false,
    })
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setIsInviteMode(false)
  }

  const handleStartInvite = (prefillName?: string) => {
    const query = (prefillName || searchQuery).trim()
    const isEmail = query.includes('@')
    const isPhone = /^\+?\d{8,}$/.test(query)

    onChange({
      pmEmail: isEmail || isPhone ? query : '',
      pmName: !isEmail && !isPhone ? query : value.pmName,
      pmType: value.pmType || 'Property Manager',
      companyName: value.companyName,
      pmInviteEmail: isEmail ? query : value.pmInviteEmail,
      pmFound: false,
      pmDetails: null,
      landlordSkipped: false,
    })
    setIsInviteMode(true)
  }

  const handleReset = () => {
    onChange({
      pmEmail: '',
      pmName: '',
      pmType: 'Property Manager',
      companyName: '',
      pmInviteEmail: '',
      pmFound: false,
      pmDetails: null,
    })
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setIsInviteMode(false)
  }

  if (isManaged) {
    return (
      <div className="setup-page__pm-card">
        <div className="setup-page__pm-card-inner">
          <CheckCircle2 size={24} className="setup-page__pm-check" aria-hidden />
          <div className="setup-page__pm-details">
            <strong className="setup-page__pm-name">{managerLabel || 'Verified Property Manager'}</strong>
            <span className="setup-page__pm-meta">Verified & Managed on Upward</span>
          </div>
        </div>
      </div>
    )
  }

  if (isSelected) {
    return (
      <div className="setup-page__pm-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ fontSize: 14.5, color: '#0f172a' }}>{value.pmDetails?.name}</strong>
              <ShieldCheck size={16} color="#0284c7" />
            </div>
            {value.pmDetails?.businessName && value.pmDetails.businessName !== value.pmDetails.name ? (
              <span style={{ fontSize: 12.5, color: '#64748b', display: 'block' }}>{value.pmDetails.businessName}</span>
            ) : null}
            {value.pmEmail ? (
              <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{value.pmEmail}</span>
            ) : null}
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            className="setup-page__change-contact"
            onClick={handleReset}
            style={{ padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: '#c2501f', background: 'none', border: '1px solid #fed7aa', borderRadius: 8, cursor: 'pointer' }}
          >
            Change
          </button>
        )}
      </div>
    )
  }

  if (isInviteMode) {
    return (
      <div className="setup-page__invite-form" style={{ background: '#fcfaf7', border: '1px solid #eae2d7', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <strong style={{ fontSize: 14, color: '#1a1714', display: 'block' }}>
              Invite Landlord or Manager
            </strong>
            <span style={{ fontSize: 12, color: '#7a7268' }}>
              Enter their contact details to send a connection invite.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{ fontSize: 12, color: '#c2501f', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Back to search
          </button>
        </div>

        <div className="setup-page__field-row" style={{ marginBottom: 12 }}>
          <div className="setup-page__field">
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#5c544b', marginBottom: 5, display: 'block' }}>Role</label>
            <select
              className="setup-page__input"
              value={value.pmType}
              onChange={(e) => onChange({ ...value, pmType: e.target.value })}
            >
              <option value="Property Manager">Property Manager</option>
              <option value="Landlord">Landlord</option>
              <option value="Lawyer">Lawyer / Agent</option>
            </select>
          </div>

          <div className="setup-page__field">
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#5c544b', marginBottom: 5, display: 'block' }}>Full name</label>
            <input
              className="setup-page__input"
              type="text"
              placeholder="e.g. Chief Adeleke"
              value={value.pmName}
              onChange={(e) => onChange({ ...value, pmName: e.target.value })}
            />
          </div>
        </div>

        <div className="setup-page__field-row">
          <div className="setup-page__field">
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#5c544b', marginBottom: 5, display: 'block' }}>Email address (for invite)</label>
            <input
              className="setup-page__input"
              type="email"
              placeholder="manager@example.com"
              value={value.pmInviteEmail || value.pmEmail}
              onChange={(e) =>
                onChange({ ...value, pmInviteEmail: e.target.value, pmEmail: e.target.value })
              }
            />
          </div>

          <div className="setup-page__field">
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#5c544b', marginBottom: 5, display: 'block' }}>Company / Estate name (optional)</label>
            <input
              className="setup-page__input"
              type="text"
              placeholder="e.g. Haven Properties"
              value={value.companyName}
              onChange={(e) => onChange({ ...value, companyName: e.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="setup-page__input"
          type="text"
          placeholder="Search by manager name, company, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 40, paddingRight: isSearching || searchQuery ? 40 : 14 }}
        />
        <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
          <Search size={18} />
        </div>

        {isSearching && (
          <div style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: '#c2501f' }}>
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!isSearching && searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSearchResults([])
              setHasSearched(false)
            }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Real-time Search Dropdown */}
      {searchQuery.trim().length >= 2 && (
        <div
          style={{
            marginTop: 8,
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 14,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {searchResults.length > 0 ? (
            <div>
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Matching Managers on Upward
              </div>
              {searchResults.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => handleSelectPm(pm)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {pm.businessName ? <Building2 size={18} /> : <User size={18} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{pm.name}</strong>
                        {pm.isVerified && <ShieldCheck size={14} color="#0284c7" />}
                      </div>
                      {pm.businessName && pm.businessName !== pm.name ? (
                        <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>{pm.businessName}</span>
                      ) : null}
                      <div style={{ fontSize: 11.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        {pm.email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={11} /> {pm.email}</span>}
                        {pm.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={11} /> {pm.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 600, color: '#c2501f', padding: '4px 8px', borderRadius: 6, background: '#fff7ed', border: '1px solid #ffedd5' }}>
                    Connect
                  </span>
                </button>
              ))}

              <div style={{ padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Not listed above?</span>
                <button
                  type="button"
                  onClick={() => handleStartInvite()}
                  style={{ background: 'none', border: 'none', color: '#c2501f', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <UserPlus size={14} />
                  Invite &quot;{searchQuery}&quot;
                </button>
              </div>
            </div>
          ) : hasSearched && !isSearching ? (
            <div style={{ padding: '18px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                No registered manager found for &quot;{searchQuery}&quot;
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>
                You can send an invitation to connect with this manager.
              </p>
              <button
                type="button"
                onClick={() => handleStartInvite()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: 'var(--skin-primary, #c2501f)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={15} />
                Invite as new Landlord / PM
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Direct Invite fallback option when not searching */}
      {searchQuery.trim().length === 0 && (
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => handleStartInvite()}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a7268',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            <UserPlus size={14} />
            Enter details manually or send invite
          </button>
        </div>
      )}
    </div>
  )
}
