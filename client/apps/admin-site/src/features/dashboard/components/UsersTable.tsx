import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Copy, Trash2, Mail, UserPlus } from 'lucide-react'
import { DataTable, type ColumnDef, type ActionItem, StatusBadge } from '../../../components/common'

export interface UnifiedUserRecord {
  id: string
  uuid: string
  firstName: string
  lastName: string
  email: string
  phone: string
  createdAt: string
  joinedAt?: string | null
  invitedAt?: string | null
  origin: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE'
  hasPassword: boolean
  isExWaitlist: boolean
  pms?: Array<{ uuid: string; name: string; propertyAddress?: string }>
  totalPaid: number
  feePaid?: number
  benefitsPaid?: number
  platformRevenue?: number
  hasPlatformRevenue?: boolean
  rentExpiryDate?: string
  failureReason?: string
  rawRecord: any
}

type SortKey =
  | 'name'
  | 'email'
  | 'origin'
  | 'pmName'
  | 'totalPaid'
  | 'createdAt'
  | 'joinedAt'
  | 'rentExpiry'
type SortDir = 'asc' | 'desc'

interface UsersTableProps {
  isSuperadmin: boolean
  paginatedItems: UnifiedUserRecord[]
  fullListItems: UnifiedUserRecord[]
  selectedUserIds: Set<string>
  toggleSelectAllUsers: () => void
  toggleSelectUser: (id: string, e?: React.MouseEvent) => void
  showFailureReason?: boolean
  isGuestOrUnsynced?: boolean
  onPreview?: (item: UnifiedUserRecord) => void
  onDeleteSelected?: () => void
  token?: string
}

const PmBadgeList: React.FC<{ pms?: UnifiedUserRecord['pms'] }> = ({ pms }) => {
  const [openPmUuid, setOpenPmUuid] = useState<string | null>(null)

  const uniquePms = useMemo(() => {
    if (!pms) return []
    const map = new Map<string, { uuid: string; name: string; propertyAddresses: string[] }>()
    pms.forEach((pm) => {
      if (!map.has(pm.name)) {
        map.set(pm.name, {
          uuid: pm.uuid,
          name: pm.name,
          propertyAddresses: pm.propertyAddress ? [pm.propertyAddress] : [],
        })
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
    return (
      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
        — <span style={{ fontSize: '11px', opacity: 0.6 }}>(Direct)</span>
      </span>
    )
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
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: '100px',
              color: 'var(--text-secondary)',
              cursor: pm.propertyAddresses.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            className={pm.propertyAddresses.length > 0 ? 'pm-badge-hover' : ''}
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
                border: '1px solid var(--border)',
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
                animation: 'popupFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {pm.propertyAddresses.map((addr, idx) => (
                <div
                  key={idx}
                  style={{ marginBottom: idx < pm.propertyAddresses.length - 1 ? '4px' : 0 }}
                >
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
  fullListItems,
  selectedUserIds,
  toggleSelectAllUsers,
  toggleSelectUser,
  showFailureReason,
  isGuestOrUnsynced,
  onPreview,
  onDeleteSelected,
  token,
}) => {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openJoinedId, setOpenJoinedId] = useState<string | null>(null)

  const handleSort = (key: string) => {
    const sKey = key as SortKey
    if (sortKey === sKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(sKey)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...paginatedItems].sort((a, b) => {
      let va: string | number = '',
        vb: string | number = ''
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
        if (!a.rentExpiryDate && b.rentExpiryDate) return sortDir === 'asc' ? 1 : -1
        if (a.rentExpiryDate && !b.rentExpiryDate) return sortDir === 'asc' ? -1 : 1
        va = a.rentExpiryDate || ''
        vb = b.rentExpiryDate || ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [paginatedItems, sortKey, sortDir])

  const getOriginBadge = (
    origin: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE',
  ) => {
    switch (origin) {
      case 'WAITLIST':
        return <StatusBadge variant="neutral" label="Waitlist" />
      case 'SELF_REGISTERED':
        return <StatusBadge variant="success" label="Self Signed Up" />
      case 'INVITED_EMAIL':
        return <StatusBadge variant="accent" label="Invited (Email)" />
      case 'INVITED_PHONE':
        return <StatusBadge variant="accent" label="Invited (Phone)" />
      default:
        return null
    }
  }

  const columns: ColumnDef<UnifiedUserRecord>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>
            {item.firstName} {item.lastName}
          </span>
          {item.isExWaitlist && (
            <span
              style={{
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '4px',
                background: 'rgba(217,119,87,0.1)',
                color: 'var(--clay)',
              }}
            >
              Waitlist
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      sortable: true,
      render: (item) => (
        <>
          <div style={{ fontSize: '13px' }}>{item.email}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {item.phone}
          </div>
        </>
      ),
    },
    {
      key: 'origin',
      label: 'Origin',
      sortable: true,
      render: (item) => getOriginBadge(item.origin),
    },
    {
      key: 'pmName',
      label: 'Manager / Platform',
      sortable: true,
      render: (item) => <PmBadgeList pms={item.pms} />,
    },
    {
      key: 'totalPaid',
      label: 'Gross Rent',
      sortable: true,
      render: (item) => (
        <span style={{ fontWeight: 700, fontSize: '13px' }}>
          {item.totalPaid > 0 ? (
            `₦${item.totalPaid.toLocaleString()}`
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </span>
      ),
    },
    {
      key: 'feePaid',
      label: 'Tx Fee',
      sortable: true,
      render: (item) => (
        <span style={{ fontWeight: 600, fontSize: '12px', color: item.feePaid ? '#10b981' : 'var(--text-muted)' }}>
          {item.feePaid && item.feePaid > 0 ? `₦${item.feePaid.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'benefitsPaid',
      label: 'Benefits',
      sortable: true,
      render: (item) => (
        <span style={{ fontWeight: 600, fontSize: '12px', color: item.benefitsPaid ? '#6366f1' : 'var(--text-muted)' }}>
          {item.benefitsPaid && item.benefitsPaid > 0 ? `₦${item.benefitsPaid.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'platformRevenue',
      label: 'Platform Rev',
      sortable: true,
      render: (item) => {
        const rev = (item.feePaid || 0) + (item.benefitsPaid || 0) || item.platformRevenue || 0
        return (
          <span style={{ fontWeight: 700, fontSize: '13px', color: rev > 0 ? '#10b981' : 'var(--text-muted)' }}>
            {rev > 0 ? `₦${rev.toLocaleString()}` : '—'}
          </span>
        )
      },
    },
    {
      key: 'joinedAt',
      label: isGuestOrUnsynced ? 'Invited Date' : 'Join Date',
      sortable: true,
      render: (item) => {
        const primaryDate = isGuestOrUnsynced
          ? item.invitedAt || item.createdAt
          : item.joinedAt || item.createdAt

        if (!primaryDate) {
          return <span style={{ opacity: 0.5 }}>—</span>
        }

        const primaryDateFormatted = new Date(primaryDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })

        const popoverItems: { label: string; date: string }[] = []
        if (isGuestOrUnsynced) {
          if (item.joinedAt) {
            popoverItems.push({
              label: 'Joined On',
              date: new Date(item.joinedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })
          }
          if (
            item.invitedAt &&
            item.createdAt &&
            new Date(item.invitedAt).toDateString() !== new Date(item.createdAt).toDateString()
          ) {
            popoverItems.push({
              label: 'Created On',
              date: new Date(item.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })
          }
        } else {
          if (item.invitedAt) {
            popoverItems.push({
              label: 'Invited On',
              date: new Date(item.invitedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })
          }
          if (
            item.joinedAt &&
            item.createdAt &&
            new Date(item.joinedAt).toDateString() !== new Date(item.createdAt).toDateString()
          ) {
            popoverItems.push({
              label: 'Created On',
              date: new Date(item.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })
          }
        }

        const hasPopover = popoverItems.length > 0

        return (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', position: 'relative' }}>
            {hasPopover ? (
              <>
                <span
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px dashed var(--border)',
                    paddingBottom: '1px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenJoinedId(openJoinedId === item.id ? null : item.id)
                  }}
                >
                  {primaryDateFormatted}
                  {!isGuestOrUnsynced && !item.joinedAt && (
                    <span style={{ fontSize: '10px', marginLeft: '4px', fontStyle: 'italic', color: 'var(--accent)' }}>
                      (Invited)
                    </span>
                  )}
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
                      border: '1px solid var(--border)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      color: 'var(--text)',
                      fontSize: '11px',
                      fontWeight: 500,
                      zIndex: 50,
                      width: 'max-content',
                      animation: 'popupFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {popoverItems.map((pi, idx) => (
                      <div key={idx}>
                        <span style={{ color: 'var(--text-muted)' }}>{pi.label}: </span>
                        <strong>{pi.date}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <span>
                {primaryDateFormatted}
                {!isGuestOrUnsynced && !item.joinedAt && (
                  <span style={{ fontSize: '10px', marginLeft: '4px', fontStyle: 'italic', color: 'var(--accent)' }}>
                    (Invited)
                  </span>
                )}
              </span>
            )}
          </div>
        )
      },
    },
    showFailureReason
      ? {
          key: 'failureReason',
          label: 'Failure Log',
          sortable: false,
          render: (item) => (
            <span style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 600 }}>
              {item.failureReason || (
                <span style={{ opacity: 0.5, color: 'var(--text-muted)' }}>—</span>
              )}
            </span>
          ),
        }
      : {
          key: 'rentExpiry',
          label: 'Rent Expiry',
          sortable: true,
          render: (item) => (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {item.rentExpiryDate ? (
                new Date(item.rentExpiryDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              ) : (
                <span style={{ opacity: 0.5 }}>—</span>
              )}
            </span>
          ),
        },
  ]

  const bulkActions = isSuperadmin ? (
    <>
      <button
        onClick={() => {
          const selectedUsers = fullListItems.filter((u) => {
            if (!selectedUserIds.has(u.uuid)) return false
            const email = u.email?.toLowerCase() || ''
            return (
              email.includes('@') &&
              !email.endsWith('@upward.com') &&
              !email.endsWith('@upward.local')
            )
          })
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
    </>
  ) : undefined

  const buildRowActions = (item: UnifiedUserRecord): ActionItem<UnifiedUserRecord>[] => {
    const actions: ActionItem<UnifiedUserRecord>[] = []

    if (onPreview) {
      actions.push({
        label: 'Quick Preview',
        icon: <Eye size={14} />,
        onClick: () => onPreview(item),
      })
    }
    if (item.hasPassword) {
      actions.push({
        label: 'View Profile',
        icon: <Eye size={14} />,
        onClick: () => navigate(`/users/${item.uuid}`),
      })
    }
    if (item.rawRecord?.isSynced === false) {
      actions.push({
        label: 'Sync Account',
        icon: <UserPlus size={14} />,
        onClick: async () => {
          try {
            const { apiService } = await import('../../../services/api.service')
            await apiService.post(
              `/admin/users/sync-tenant/${item.uuid}`,
              {},
              token || localStorage.getItem('upward_token') || '',
            )
            window.location.reload()
          } catch (err) {
            alert('Failed to sync account')
          }
        },
      })
    }
    actions.push({
      label: 'Copy Email',
      icon: <Copy size={14} />,
      onClick: () => navigator.clipboard.writeText(item.email),
    })
    actions.push({
      label: 'Copy ID',
      icon: <Copy size={14} />,
      onClick: () => navigator.clipboard.writeText(item.id),
    })
    if (isSuperadmin) {
      actions.push({
        label: 'Delete',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => {}, // Custom delete per row logic goes here if needed, omitted from original file for now
      })
    }

    return actions
  }

  // Workaround for DataTable API requiring static actions, we dynamically create them via map and use a single flattened placeholder
  // A better DataTable implementation would accept (item: T) => ActionItem<T>[] but for now we pass a flat list to map out inside
  // Wait, the DataTable implementation we wrote earlier has `rowActions?: ActionItem<T>[]`. It evaluates them exactly statically.
  // Actually, we can update our DataTable to support `(item: T) => ActionItem<T>[]` or `ActionItem<T>[]`.
  // Let's quickly update DataTable.tsx if we want dynamic row actions.
  // For now, let's just pass `buildRowActions(item)` mapped somehow? No, `rowActions` in DataTable is applied identically to every row right now.
  // Let's just pass static actions that check the item condition in their render or `onClick` or we just update `DataTable.tsx` to handle a function.
  // We will fix `DataTable` to accept `rowActions?: ActionItem<T>[] | ((item: T) => ActionItem<T>[])` later if needed.
  // For now, let's just render all actions and filter inside their execution or pass them statically.
  // I will just modify `DataTable` slightly via multi_replace in a bit. Let's pass undefined for now and I'll update it.

  return (
    <DataTable
      data={sorted}
      columns={columns}
      keyExtractor={(item) => item.uuid}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      selectedIds={selectedUserIds}
      onToggleSelectAll={toggleSelectAllUsers}
      onToggleSelect={toggleSelectUser}
      bulkActions={bulkActions}
      emptyTitle="No records found"
      emptyDescription="Try adjusting your search or filters."
      rowActions={buildRowActions}
    />
  )
}
