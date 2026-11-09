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
  Landmark,
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
  isExternal?: boolean
  companyUuid?: string
  managerUuid?: string
}

interface PmSearchSelectProps {
  value: {
    pmEmail: string
    pmName: string
    pmType: string
    companyName: string
    pmInviteEmail: string
    pmFound: boolean
    pmDetails: {
      id?: number
      name?: string
      businessName?: string
      isExternal?: boolean
      companyUuid?: string
      managerUuid?: string
      defaultSettlementAccount?: {
        bankName: string
        accountNumber: string
        accountName: string
        bankCode?: string | null
      } | null
    } | null
  }
  onChange: (patch: {
    pmEmail: string
    pmName: string
    pmType: string
    companyName: string
    pmInviteEmail: string
    pmFound: boolean
    pmDetails: {
      id?: number
      name?: string
      businessName?: string
      isExternal?: boolean
      companyUuid?: string
      managerUuid?: string
      defaultSettlementAccount?: {
        bankName: string
        accountNumber: string
        accountName: string
        bankCode?: string | null
      } | null
    } | null
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
      pmType: pm.pmType || (pm.isExternal ? 'External Property Manager' : 'Property Manager'),
      companyName: pm.companyName || pm.businessName || '',
      pmInviteEmail: '',
      pmFound: true,
      pmDetails: {
        id: pm.id,
        name: pm.name || `${pm.firstName} ${pm.lastName}`.trim(),
        businessName: pm.companyName || pm.businessName || `${pm.firstName} ${pm.lastName}`.trim(),
        isExternal: !!pm.isExternal,
        companyUuid: pm.companyUuid,
        managerUuid: pm.managerUuid,
        defaultSettlementAccount: pm.defaultSettlementAccount || null,
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
            <strong className="setup-page__pm-name">
              {managerLabel || 'Verified Property Manager'}
            </strong>
            <span className="setup-page__pm-meta">Verified & Managed on Upward</span>
          </div>
        </div>
      </div>
    )
  }

  if (isSelected) {
    const defaultAcc = value.pmDetails?.defaultSettlementAccount
    return (
      <div
        className="setup-page__pm-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '14px 16px',
          background: '#faf8f5',
          border: '1.5px solid #eae2d7',
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            width: '100%',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Building2 size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <strong
                  style={{
                    fontSize: 14.5,
                    color: '#1a1714',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {value.pmDetails?.name}
                </strong>
                <ShieldCheck size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                {value.pmDetails?.isExternal ? (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      flexShrink: 0,
                    }}
                  >
                    External Platform
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      flexShrink: 0,
                    }}
                  >
                    Upward PM
                  </span>
                )}
              </div>
              {value.pmDetails?.businessName &&
              value.pmDetails.businessName !== value.pmDetails.name ? (
                <span
                  style={{
                    fontSize: 12.5,
                    color: '#5c544b',
                    display: 'block',
                    marginTop: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {value.pmDetails.businessName}
                </span>
              ) : null}
              {value.pmEmail ? (
                <span
                  style={{
                    fontSize: 11.5,
                    color: '#7a7268',
                    display: 'block',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {value.pmEmail}
                </span>
              ) : null}
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              className="setup-page__change-contact"
              onClick={handleReset}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--skin-primary, #c2501f)',
                background: '#fff',
                border: '1px solid #fed7aa',
                borderRadius: 8,
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              Change
            </button>
          )}
        </div>

        {defaultAcc && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              background: '#fff',
              border: '1px solid #eae2d7',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <Landmark size={15} color="var(--skin-primary, #c2501f)" style={{ flexShrink: 0 }} />
              <div
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7a7268',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Payout:
                </span>{' '}
                <strong style={{ fontSize: 12.5, color: '#1a1714' }}>
                  {defaultAcc.bankName} •••• {defaultAcc.accountNumber.slice(-4)}
                </strong>
                {defaultAcc.accountName && (
                  <span style={{ fontSize: 11.5, color: '#7a7268', marginLeft: 6 }}>
                    ({defaultAcc.accountName})
                  </span>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                padding: '2px 7px',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={11} /> Verified
            </span>
          </div>
        )}
      </div>
    )
  }

  if (isInviteMode) {
    return (
      <div
        className="setup-page__invite-form"
        style={{
          background: '#fcfaf7',
          border: '1px solid #eae2d7',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
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
            style={{
              fontSize: 12,
              color: '#c2501f',
              background: 'none',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Back to search
          </button>
        </div>

        <div className="setup-page__field-row" style={{ marginBottom: 12 }}>
          <div className="setup-page__field">
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#5c544b',
                marginBottom: 5,
                display: 'block',
              }}
            >
              Role
            </label>
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
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#5c544b',
                marginBottom: 5,
                display: 'block',
              }}
            >
              Full name
            </label>
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
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#5c544b',
                marginBottom: 5,
                display: 'block',
              }}
            >
              Email address (for invite)
            </label>
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
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#5c544b',
                marginBottom: 5,
                display: 'block',
              }}
            >
              Company / Estate name (optional)
            </label>
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
        <div
          style={{
            position: 'absolute',
            left: 13,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
            pointerEvents: 'none',
          }}
        >
          <Search size={18} />
        </div>

        {isSearching && (
          <div
            style={{
              position: 'absolute',
              right: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#c2501f',
            }}
          >
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
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: 4,
            }}
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
              <div
                style={{
                  padding: '8px 14px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                }}
              >
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
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#faf8f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#fef3c7',
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {pm.businessName ? <Building2 size={18} /> : <User size={18} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header: Name + Badges + Connect Pill */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          minWidth: 0,
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13.5,
                            color: '#1a1714',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pm.name}
                        </strong>
                        {pm.isVerified && (
                          <ShieldCheck size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                        )}
                        {pm.isExternal ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 999,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              flexShrink: 0,
                            }}
                          >
                            External Platform
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 999,
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              flexShrink: 0,
                            }}
                          >
                            Upward PM
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--skin-primary, #c2501f)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#fff7ed',
                          border: '1px solid #ffedd5',
                          flexShrink: 0,
                        }}
                      >
                        Connect
                      </span>
                    </div>

                    {/* Company / Estate Name */}
                    {pm.businessName && pm.businessName !== pm.name ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#5c544b',
                          marginBottom: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pm.businessName}
                      </div>
                    ) : null}

                    {/* Contact Details (Email & Phone) */}
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#7a7268',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px 10px',
                        marginTop: 2,
                      }}
                    >
                      {pm.email && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Mail size={11} style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pm.email}
                          </span>
                        </span>
                      )}
                      {pm.phone && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <Phone size={11} style={{ flexShrink: 0 }} />
                          <span>{pm.phone}</span>
                        </span>
                      )}
                    </div>

                    {/* Settlement Account Preview */}
                    {pm.defaultSettlementAccount && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#0369a1',
                          background: '#f0f9ff',
                          border: '1px solid #e0f2fe',
                          borderRadius: 6,
                          padding: '3px 7px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 6,
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Landmark size={11} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Payout: {pm.defaultSettlementAccount.bankName} (••••{' '}
                          {pm.defaultSettlementAccount.accountNumber.slice(-4)})
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}

              <div
                style={{
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 12, color: '#64748b' }}>Not listed above?</span>
                <button
                  type="button"
                  onClick={() => handleStartInvite()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c2501f',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
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
