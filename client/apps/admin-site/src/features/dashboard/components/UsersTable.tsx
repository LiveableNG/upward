import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Users,
  Mail,
  UserPlus,
} from 'lucide-react'
import { Square, CheckSquare } from './Checkbox'

export interface UnifiedUserRecord {
  id: string
  uuid: string
  firstName: string
  lastName: string
  email: string
  phone: string
  createdAt: string
  joinedAt?: string | null
  origin: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE'
  hasPassword: boolean
  isExWaitlist: boolean
  pms?: Array<{ uuid: string; name: string; propertyAddress?: string }>
  totalPaid: number
  rentExpiryDate?: string
  rawRecord: any
}

type SortKey = 'name' | 'email' | 'origin' | 'pmName' | 'totalPaid' | 'createdAt' | 'joinedAt' | 'rentExpiry'
type SortDir = 'asc' | 'desc'

interface UsersTableProps {
  isSuperadmin: boolean
  paginatedItems: UnifiedUserRecord[]
  selectedUserIds: Set<string>
  toggleSelectAllUsers: () => void
  toggleSelectUser: (id: string, e: React.MouseEvent) => void
  onPreview?: (item: UnifiedUserRecord) => void
  onDeleteSelected?: () => void
}

const SortIcon: React.FC<{ col: SortKey; active: SortKey; dir: SortDir }> = ({ col, active, dir }) =>
  active === col
    ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    : <ChevronDown size={12} style={{ opacity: 0.25 }} />

const PmBadgeList: React.FC<{ pms?: UnifiedUserRecord['pms'] }> = ({ pms }) => {
  const [openPmUuid, setOpenPmUuid] = useState<string | null>(null)
  
  const uniquePms = React.useMemo(() => {
    if (!pms) return []
    const map = new Map<string, { uuid: string; name: string; propertyAddresses: string[] }>()
    pms.forEach(pm => {
      if (!map.has(pm.name)) {
        map.set(pm.name, { uuid: pm.uuid, name: pm.name, propertyAddresses: pm.propertyAddress ? [pm.propertyAddress] : [] })
      } else {
        const existing = map.get(pm.name)!
        if (pm.propertyAddress && !existing.propertyAddresses.includes(pm.propertyAddress)) {
          existing.propertyAddresses.push(pm.propertyAddress)
        }
      }
    })
    return Array.from(map.values())
  }, [pms])

  if (!uniquePms || uniquePms.length === 0) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>— <span style={{ fontSize: '11px', opacity: 0.6 }}>(Direct)</span></span>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {uniquePms.map((pm) => (
        <div key={pm.uuid} style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenPmUuid(openPmUuid === pm.uuid ? null : pm.uuid)
            }}
            onBlur={() => setOpenPmUuid(null)}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--surface)',
              border: '1px solid var(--border-solid)',
              padding: '2px 8px',
              borderRadius: '100px',
              color: 'var(--text-secondary)',
              cursor: pm.propertyAddresses.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
            className={pm.propertyAddresses.length > 0 ? "pm-badge-hover" : ""}
          >
            {pm.name}
          </button>
          
          {openPmUuid === pm.uuid && pm.propertyAddresses.length > 0 && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border-solid)',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 500,
                zIndex: 50,
                width: 'max-content',
                maxWidth: '240px',
                lineHeight: 1.4,
                whiteSpace: 'normal',
                animation: 'popupFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseDown={(e) => e.stopPropagation()} // Prevent blur when clicking inside
            >
              {pm.propertyAddresses.map((addr, idx) => (
                <div key={idx} style={{ marginBottom: idx < pm.propertyAddresses.length - 1 ? '4px' : 0 }}>
                  {addr}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <style>{`
        .pm-badge-hover:hover {
          border-color: var(--clay);
          background: var(--clay-faint);
          color: var(--clay);
        }
        @keyframes popupFadeIn {
          from { opacity: 0; transform: translate(-50%, -5px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}

export const UsersTable: React.FC<UsersTableProps> = ({
  isSuperadmin,
  paginatedItems,
  selectedUserIds,
  toggleSelectAllUsers,
  toggleSelectUser,
  onPreview,
  onDeleteSelected,
}) => {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openJoinedId, setOpenJoinedId] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...paginatedItems].sort((a, b) => {
    let va: string | number = '', vb: string | number = ''
    if (sortKey === 'name') {
      va = `${a.firstName} ${a.lastName}`.toLowerCase()
      vb = `${b.firstName} ${b.lastName}`.toLowerCase()
    } else if (sortKey === 'email') {
      va = a.email.toLowerCase()
      vb = b.email.toLowerCase()
    } else if (sortKey === 'origin') {
      va = a.origin
      vb = b.origin
    } else if (sortKey === 'pmName') {
      va = (a.pms?.[0]?.name || '').toLowerCase()
      vb = (b.pms?.[0]?.name || '').toLowerCase()
    } else if (sortKey === 'totalPaid') {
      va = a.totalPaid
      vb = b.totalPaid
    } else if (sortKey === 'createdAt') {
      va = a.createdAt
      vb = b.createdAt
    } else if (sortKey === 'joinedAt') {
      if (!a.joinedAt && b.joinedAt) return sortDir === 'asc' ? 1 : -1
      if (a.joinedAt && !b.joinedAt) return sortDir === 'asc' ? -1 : 1
      va = a.joinedAt || ''
      vb = b.joinedAt || ''
    } else if (sortKey === 'rentExpiry') {
      // Put empty rent expiries at the end
      if (!a.rentExpiryDate && b.rentExpiryDate) return sortDir === 'asc' ? 1 : -1
      if (a.rentExpiryDate && !b.rentExpiryDate) return sortDir === 'asc' ? -1 : 1
      va = a.rentExpiryDate || ''
      vb = b.rentExpiryDate || ''
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const thStyle: React.CSSProperties = {
    padding: '13px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  const allSelected = paginatedItems.length > 0 && selectedUserIds.size === paginatedItems.length

  const getOriginBadge = (origin: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE') => {
    switch (origin) {
      case 'WAITLIST':
        return (
          <span className="badge" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
            Waitlist
          </span>
        )
      case 'SELF_REGISTERED':
        return (
          <span className="badge" style={{ background: 'var(--success-faint)', color: 'var(--success)' }}>
            Self Signed Up
          </span>
        )
      case 'INVITED_EMAIL':
        return (
          <span className="badge" style={{ background: 'var(--accent-faint)', color: 'var(--accent)' }}>
            Invited (Email)
          </span>
        )
      case 'INVITED_PHONE':
        return (
          <span className="badge" style={{ background: 'var(--accent-faint)', color: 'var(--accent)' }}>
            Invited (Phone)
          </span>
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedUserIds.size > 0 && isSuperadmin && (
        <div style={{
          background: 'var(--accent-faint)',
          border: '1px solid var(--accent-muted)',
          borderRadius: '10px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px',
          fontSize: '13px',
        }}>
          <strong style={{ color: 'var(--accent)' }}>{selectedUserIds.size} selected</strong>
          <button
            onClick={() => {
              const selectedUsers = paginatedItems.filter((u) => selectedUserIds.has(u.uuid))
              navigate('/emails', { state: { selectedUsers } })
            }}
            className="btn"
            style={{
              height: '30px',
              padding: '0 12px',
              background: 'var(--accent)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Mail size={13} /> Send Email
          </button>
          {onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              className="btn"
              style={{
                height: '30px',
                padding: '0 12px',
                background: 'var(--danger-faint)',
                color: 'var(--danger)',
                border: '1px solid transparent',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={13} /> Delete Selected
            </button>
          )}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
            {isSuperadmin && (
              <th style={{ padding: '13px 8px 13px 20px', width: '44px' }}>
                <button onClick={toggleSelectAllUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  {allSelected ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
                </button>
              </th>
            )}
            <th style={thStyle} onClick={() => handleSort('name')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Name <SortIcon col="name" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('email')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Contact <SortIcon col="email" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('origin')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Origin <SortIcon col="origin" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('pmName')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Manager / Platform <SortIcon col="pmName" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('totalPaid')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Paid <SortIcon col="totalPaid" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('joinedAt')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Joined <SortIcon col="joinedAt" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('rentExpiry')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Rent Expiry <SortIcon col="rentExpiry" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={{ ...thStyle, width: '44px', cursor: 'default' }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.id}
              style={{
                borderBottom: '1px solid var(--border)',
                background: selectedUserIds.has(item.uuid) ? 'rgba(217,119,87,0.04)' : 'transparent',
                transition: 'background 0.15s',
              }}
              className="table-row-hover"
            >
              {isSuperadmin && (
                <td style={{ padding: '14px 8px 14px 20px' }} onClick={(e) => toggleSelectUser(item.uuid, e)}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    {selectedUserIds.has(item.uuid) ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
                  </button>
                </td>
              )}
              <td style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.firstName} {item.lastName}</span>
                  {item.isExWaitlist && (
                    <span style={{
                      padding: '2px 6px',
                      fontSize: '9px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      background: 'rgba(217,119,87,0.1)',
                      color: 'var(--clay, #d97757)',
                    }}>
                      Waitlist
                    </span>
                  )}
                </div>
              </td>
              <td style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '13px' }}>{item.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.phone}</div>
              </td>
              <td style={{ padding: '14px 16px' }}>
                {getOriginBadge(item.origin)}
              </td>
              <td style={{ padding: '14px 16px' }}>
                <PmBadgeList pms={item.pms} />
              </td>
              <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '13px' }}>
                {item.totalPaid > 0 ? `₦${item.totalPaid.toLocaleString()}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)', position: 'relative' }}>
                {item.joinedAt ? (
                  <>
                    <span 
                      style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border)', paddingBottom: '1px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenJoinedId(openJoinedId === item.id ? null : item.id)
                      }}
                    >
                      {new Date(item.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {openJoinedId === item.id && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginTop: '4px',
                          background: 'var(--bg)',
                          border: '1px solid var(--border-solid)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          color: 'var(--text)',
                          fontSize: '11px',
                          fontWeight: 500,
                          zIndex: 50,
                          width: 'max-content',
                          animation: 'popupFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>Invited / Created On:</span><br/>
                        {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ opacity: 0.5 }}>—</span>
                )}
              </td>
              <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {item.rentExpiryDate ? new Date(item.rentExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span style={{ opacity: 0.5 }}>—</span>}
              </td>
              {/* Actions */}
              <td style={{ padding: '14px 12px', position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '6px' }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {openMenuId === item.id && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100,
                    minWidth: '160px',
                    overflow: 'hidden',
                  }}>
                    {onPreview && (
                      <button
                        onClick={() => { setOpenMenuId(null); onPreview(item) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                        className="dropdown-item"
                      >
                        <Eye size={14} /> Quick Preview
                      </button>
                    )}
                    {item.hasPassword && (
                      <button
                        onClick={() => { setOpenMenuId(null); navigate(`/users/${item.uuid}`) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                        className="dropdown-item"
                      >
                        <Eye size={14} /> View Profile
                      </button>
                    )}
                    {item.rawRecord?.isSynced === false && (
                      <button
                        onClick={async () => {
                          setOpenMenuId(null)
                          try {
                            const { apiService } = await import('../../../services/api.service')
                            await apiService.post(`/admin/users/sync-tenant/${item.uuid}`, {}, localStorage.getItem('upward_token') || '')
                            window.location.reload()
                          } catch (err) {
                            alert('Failed to sync account')
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)' }}
                        className="dropdown-item"
                      >
                        <UserPlus size={14} /> Sync Account
                      </button>
                    )}
                    <button
                      onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(item.email) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                      className="dropdown-item"
                    >
                      <Copy size={14} /> Copy Email
                    </button>
                    <button
                      onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(item.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                      className="dropdown-item"
                    >
                      <Copy size={14} /> Copy ID
                    </button>
                    {isSuperadmin && (
                      <button
                        onClick={() => { setOpenMenuId(null) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--danger)' }}
                        className="dropdown-item"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}

          {/* Empty State */}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={isSuperadmin ? 9 : 8} style={{ padding: '64px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ opacity: 0.3 }} />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)' }}>No records found</span>
                  <span style={{ fontSize: '13px' }}>Try adjusting your search or filters.</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style>{`
        .dropdown-item:hover { background: var(--surface-hover) !important; }
        .table-row-hover:hover { background: var(--surface-hover) !important; }
      `}</style>
    </>
  )
}
