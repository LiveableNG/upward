import { useState, useEffect } from 'react'
import { UserCog } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import SkeletonStyles from '../features/dashboard/components/Skeletons'

type InternalAccount = {
  uuid: string
  firstName?: string
  lastName?: string
  businessName?: string
  email?: string
  emailHash?: string
  isInternal: boolean
  hasRealPassword?: boolean
  inviteStatus?: string
  pmType?: string | null
  _type: 'user' | 'pm' | 'guest' | 'company' | 'waitlist'
}

export default function InternalAccounts({ token }: { token: string }) {
  const [data, setData] = useState<{
    users: InternalAccount[]
    pms: InternalAccount[]
    companies: InternalAccount[]
    guests: InternalAccount[]
    waitlist: InternalAccount[]
  }>({
    users: [],
    pms: [],
    companies: [],
    guests: [],
    waitlist: [],
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'pms' | 'guests'>('users')

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiService.get('/admin/internal-accounts', token)
      setData(res)
    } catch (error) {
      showToast('Failed to load accounts', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggle = async (type: string, uuid: string, currentStatus: boolean) => {
    try {
      await apiService.patch(
        `/admin/internal-accounts/${type}/${uuid}`,
        { isInternal: !currentStatus },
        token,
      )
      showToast('Status updated successfully')
      fetchData()
    } catch (error) {
      showToast('Failed to update status', true)
    }
  }

  // Filter lists to match the dashboard logic exactly

  // Registered Tenants = upward_user with a real password
  const registeredUsers = data.users
    .filter((u) => u.hasRealPassword)
    .map((u) => ({ ...u, _type: 'user' as const }))

  // Guests = upward_pm_tenant + upward_users who are shadows + upward_waitlist
  const shadowUsers = data.users
    .filter((u) => !u.hasRealPassword)
    .map((u) => ({ ...u, _type: 'user' as const }))
  const guests = [
    ...data.guests.map((g) => ({ ...g, _type: 'guest' as const })),
    ...data.waitlist.map((w) => ({ ...w, _type: 'waitlist' as const })),
    ...shadowUsers,
  ]

  // PMs = upward_property_manager + upward_company
  const pms = [
    ...data.pms.map((pm) => ({ ...pm, _type: 'pm' as const })),
    ...data.companies.map((c) => ({ ...c, _type: 'company' as const })),
  ]

  if (loading) {
    return (
      <div className="page-container fade-in" style={{ padding: '24px' }}>
        <div
          className="page-header flex-mobile-column"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="icon-container"
              style={{
                background: 'var(--accent-faint)',
                color: 'var(--accent)',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserCog size={24} />
            </div>
            <div>
              <h1 className="section-title" style={{ margin: 0 }}>
                Internal Accounts Management
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
                Loading accounts...
              </p>
            </div>
          </div>
        </div>
        <SkeletonStyles />
      </div>
    )
  }

  const renderTable = (list: InternalAccount[]) => (
    <div
      className="table-wrapper"
      style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ background: 'var(--surface-hover)' }}>
          <tr>
            <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              UUID
            </th>
            <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Name
            </th>
            <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Type
            </th>
            <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Email/Hash
            </th>
            <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Status
            </th>
            <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((item, idx) => (
            <tr
              key={item.uuid}
              style={{
                borderTop: '1px solid var(--border)',
                background: idx % 2 === 0 ? 'var(--white)' : 'var(--bg)',
              }}
            >
              <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                {item.uuid.substring(0, 8)}...
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>
                {item.businessName ||
                  `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
                  'Guest'}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {(() => {
                  const isPlatform = item._type === 'company'
                  const label = isPlatform ? 'platform' : item._type
                  const bg = isPlatform ? '#7c3aed22' : 'var(--surface-hover)'
                  const color = isPlatform ? '#7c3aed' : 'inherit'
                  return (
                    <span
                      style={{
                        padding: '2px 6px',
                        background: bg,
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        color,
                        fontWeight: isPlatform ? 700 : 'inherit',
                      }}
                    >
                      {label}
                    </span>
                  )
                })()}
              </td>
              <td
                style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}
              >
                {item.email || item.emailHash || 'N/A'}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                {item.isInternal ? (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>INTERNAL (HIDDEN)</span>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>NORMAL</span>
                )}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <button
                  onClick={() => handleToggle(item._type, item.uuid, item.isInternal)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: item.isInternal ? '#6b7280' : '#ef4444',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {item.isInternal ? 'Mark Normal' : 'Mark Internal'}
                </button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td
                colSpan={6}
                style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="page-container fade-in" style={{ padding: '24px' }}>
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UserCog size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Internal Accounts Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Toggle the "Internal" status for accounts to exclude them from dashboard metrics.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--clay)' : '2px solid transparent',
            color: activeTab === 'users' ? 'var(--clay)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Registered Tenants ({registeredUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('guests')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'guests' ? '2px solid var(--clay)' : '2px solid transparent',
            color: activeTab === 'guests' ? 'var(--clay)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Guests / Pending ({guests.length})
        </button>
        <button
          onClick={() => setActiveTab('pms')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pms' ? '2px solid var(--clay)' : '2px solid transparent',
            color: activeTab === 'pms' ? 'var(--clay)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Property Managers ({pms.length})
        </button>
      </div>

      {activeTab === 'users' && renderTable(registeredUsers)}
      {activeTab === 'guests' && renderTable(guests)}
      {activeTab === 'pms' && renderTable(pms)}
    </div>
  )
}
