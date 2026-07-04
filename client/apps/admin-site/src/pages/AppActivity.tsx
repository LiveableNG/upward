import React, { useState, useEffect } from 'react'
import {
  Search,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Filter,
  RefreshCcw,
  ChevronDown,
  Download,
  Activity,
  Users,
  Eye,
  X,
  Copy,
  Check,
  Globe,
  Clock,
  CreditCard,
  FileText,
  UserPlus,
  LogIn,
  LogOut,
  Trash2,
  PlusCircle,
  Settings,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import PreviewDrawer, { type DrawerEntity } from '../features/dashboard/components/PreviewDrawer'

interface AppActivityLog {
  id: number
  uuid: string
  app: string
  userId: number | null
  pmId: number | null
  userRole: string | null
  userEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  description: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user?: any
  pm?: any
  userPathway?: string | null
  readableText?: string
}

interface StatsData {
  totalInstalls: number
  platforms: {
    ios: number
    android: number
    web: number
    other: number
  }
  activeUsersByApp: {
    app: string
    _count: number
  }[]
  recentActivityCount: number
  todayStats?: {
    uniqueUsersMobileCount: number
    uniqueUsersWebCount: number
    mobileActionGrouped: { action: string; count: number }[]
    webActionGrouped: { action: string; count: number }[]
  }
  user?: any
  pm?: any
  userPathway?: string | null
  readableText?: string
}

function getActivityIcon(action: string, entityType?: string) {
  if (entityType === 'PAYMENT' || entityType === 'RENT') return <CreditCard size={15} style={{ color: 'var(--success)' }} />
  if (entityType === 'CONTRACT' || entityType === 'DOCUMENT') return <FileText size={15} style={{ color: '#3b82f6' }} />
  
  switch (action) {
    case 'SIGNUP':
      return <UserPlus size={15} style={{ color: '#8b5cf6' }} />
    case 'LOGIN':
      return <LogIn size={15} style={{ color: 'var(--success)' }} />
    case 'LOGOUT':
      return <LogOut size={15} style={{ color: 'var(--text-muted)' }} />
    case 'APP_INSTALL':
      return <Smartphone size={15} style={{ color: 'var(--accent)' }} />
    case 'DELETE':
      return <Trash2 size={15} style={{ color: 'var(--danger)' }} />
    case 'CREATE':
      return <PlusCircle size={15} style={{ color: '#3b82f6' }} />
    case 'UPDATE':
      return <Settings size={15} style={{ color: 'var(--warning)' }} />
    default:
      return <Activity size={15} style={{ color: 'var(--text-muted)' }} />
  }
}

function renderLogMessage(log: any, onPreviewUser: any, onPreviewPm: any) {
  const user = log.user;
  const pm = log.pm;

  const userEmailLink = user?.email || log.userEmail;
  const userNameStr = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  const pmNameStr = pm ? pm.businessName : '';
  const pmEmailLink = pm?.email || '';

  const renderTenantLink = () => {
    if (!userEmailLink) return <span>System / Guest</span>;
    return (
      <button
        type="button"
        onClick={() => onPreviewUser({
          uuid: user?.uuid || log.entityId || log.uuid,
          firstName: user?.firstName || 'Tenant',
          lastName: user?.lastName || '',
          email: userEmailLink,
          createdAt: user?.createdAt || log.createdAt,
          totalPaid: user?.totalPaid || 0,
        })}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          textDecoration: 'underline',
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {userNameStr ? `${userNameStr} (${userEmailLink})` : userEmailLink}
      </button>
    );
  };

  const renderPmLink = () => {
    if (!pmNameStr && !pmEmailLink) return <span>Property Manager</span>;
    return (
      <button
        type="button"
        onClick={() => onPreviewPm({
          uuid: pm?.uuid || log.pmId || log.uuid,
          businessName: pmNameStr || 'Property Manager',
          email: pmEmailLink,
          createdAt: pm?.createdAt || log.createdAt,
        })}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          textDecoration: 'underline',
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {pmNameStr ? `${pmNameStr} (${pmEmailLink})` : pmEmailLink}
      </button>
    );
  };

  if (log.action === 'SIGNUP') {
    if (log.userRole === 'PM' || log.app === 'upward-pm') {
      return (
        <span>
          Property Manager {renderPmLink()} registered a new account.
        </span>
      );
    } else {
      const details = user?.isFromInvite
        ? 'completed registration (invited tenant).'
        : user?.isFromWaitlist
        ? 'converted from the waitlist and registered.'
        : 'self-registered a new account.';
      return (
        <span>
          Tenant {renderTenantLink()} {details}
        </span>
      );
    }
  }

  if (log.action === 'LOGIN') {
    if (log.userRole === 'PM' || log.app === 'upward-pm') {
      return (
        <span>
          Property Manager {renderPmLink()} logged in.
        </span>
      );
    } else {
      return (
        <span>
          Tenant {renderTenantLink()} logged in.
        </span>
      );
    }
  }

  if (log.action === 'LOGOUT') {
    if (log.userRole === 'PM' || log.app === 'upward-pm') {
      return (
        <span>
          Property Manager {renderPmLink()} logged out.
        </span>
      );
    } else {
      return (
        <span>
          Tenant {renderTenantLink()} logged out.
        </span>
      );
    }
  }

  if (log.action === 'APP_INSTALL') {
    return (
      <span>
        Mobile app installed or launched by user {renderTenantLink()}.
      </span>
    );
  }

  if (log.action === 'CREATE') {
    if (log.entityType === 'UNIT') {
      const match = log.description.match(/(?:uploaded|imported|added) (\d+) (?:units|properties|records)/i);
      if (match) {
        return (
          <span>
            Property Manager {renderPmLink()} bulk uploaded <strong>{match[1]}</strong> units.
          </span>
        );
      } else {
        return (
          <span>
            Property Manager {renderPmLink()} created a new unit.
          </span>
        );
      }
    }
    if (log.entityType === 'INVITE') {
      let inviteEmail = '';
      try {
        const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
        if (meta.email) {
          inviteEmail = meta.email;
        } else if (meta.tenants && Array.isArray(meta.tenants)) {
          inviteEmail = meta.tenants.map((t: any) => t.email).join(', ');
        }
      } catch (e) {}
      if (!inviteEmail) {
        inviteEmail = log.description.match(/invite tenant:?\s*([^\s]+)/i)?.[1] || '';
      }
      if (!inviteEmail) {
        inviteEmail = log.description.replace(/CREATE action on INVITE.*by\s+/i, '') || 'a tenant';
      }
      return (
        <span>
          Property Manager {renderPmLink()} invited Tenant <strong>{inviteEmail}</strong>.
        </span>
      );
    }
    if (log.entityType === 'PAYMENT' || log.entityType === 'RENT') {
      let amountStr = '';
      try {
        const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
        if (meta.amount) {
          amountStr = ` of ₦${Number(meta.amount).toLocaleString()}`;
        }
      } catch (e) {}
      if (!amountStr) {
        const amtMatch = log.description.match(/₦\s*([\d,]+)/);
        if (amtMatch) amountStr = ` of ₦${amtMatch[1]}`;
      }
      return (
        <span>
          Tenant {renderTenantLink()} made a payment{amountStr ? <strong>{amountStr}</strong> : ''}.
        </span>
      );
    }
    if (log.entityType === 'CREDIBILITY_REQUEST') {
      return (
        <span>
          Tenant {renderTenantLink()} requested their rental history credibility report.
        </span>
      );
    }
  }

  return <span>{log.readableText || log.description}</span>;
}

interface AppActivityProps {
  token: string
}

const AppActivity: React.FC<AppActivityProps> = ({ token }) => {
  const [logs, setLogs] = useState<AppActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [search, setSearch] = useState('')
  const [appFilter, setAppFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [platformFilter, setPlatformFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')
  
  // Modal details
  const [selectedLog, setSelectedLog] = useState<AppActivityLog | null>(null)
  const [copied, setCopied] = useState(false)

  // Drawer
  const [drawerEntity, setDrawerEntity] = useState<DrawerEntity | null>(null)

  const openDrawerForUser = (item: any) => {
    setDrawerEntity({
      kind: 'user',
      uuid: item.uuid,
      name: item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : 'Tenant Profile',
      email: item.email,
      phone: item.phone || '',
      status: item.totalPaid > 0 ? 'TENANT' : 'PENDING_TENANT',
      type: item.totalPaid > 0 ? 'TENANT' : 'PENDING_TENANT',
      joinedAt: item.createdAt,
      totalPaid: item.totalPaid || 0,
    })
  }

  const openDrawerForPm = (pm: any) => {
    setDrawerEntity({
      kind: 'pm',
      uuid: pm.uuid,
      name: pm.businessName || 'Property Manager',
      email: pm.email,
      phone: pm.phone || '',
      status: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      type: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      joinedAt: pm.createdAt,
      totalPaid: pm.totalGenerated || 0,
      propertyCount: pm.propertiesCount || 0,
    })
  }



  const fetchLogs = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/app-activity?page=${pageNum}&limit=50`
      if (appFilter !== 'ALL') url += `&app=${appFilter}`
      if (actionFilter !== 'ALL') url += `&action=${actionFilter}`
      if (platformFilter !== 'ALL') url += `&platform=${platformFilter}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      if (dateFilter) url += `&date=${dateFilter}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setLogs(response.data)
        setTotalPages(response.meta.totalPages)
        setTotal(response.meta.total)
      }
    } catch (error) {
      console.error('Failed to fetch app activity logs:', error)
    } finally {
      setLoading(false)
    }
  }



  useEffect(() => {
    fetchLogs(page)
  }, [page, appFilter, actionFilter, platformFilter, dateFilter])

  // Trigger search on submit or enter key
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs(1)
  }

  const handleRefresh = () => {
    fetchLogs(1)
    setPage(1)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'var(--success)'
      case 'LOGOUT':
        return 'var(--text-muted)'
      case 'SIGNUP':
        return '#8b5cf6' // Violet
      case 'APP_INSTALL':
        return 'var(--accent)'
      case 'DELETE':
        return 'var(--danger)'
      case 'CREATE':
        return '#3b82f6' // Blue
      case 'UPDATE':
        return 'var(--warning)'
      default:
        return 'var(--text-muted)'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-container">
      {/* Page Header */}
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
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              App Activity & Telemetry
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track app downloads, active users, and mutations on upward-pay and upward-pm.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RefreshCcw size={16} className={loading ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>



      {/* Filters/Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by email, entity, or description (Press Enter)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: '0 1 auto',
            }}
          >
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                height: '42px',
              }}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('')
                  setPage(1)
                }}
                className="btn btn-secondary"
                style={{ height: '42px', padding: '0 12px', fontSize: '13px' }}
              >
                Clear Date
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '0 1 auto',
              minWidth: '150px',
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Filter
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <select
                value={appFilter}
                onChange={(e) => {
                  setAppFilter(e.target.value)
                  setPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '11px 32px 11px 36px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Apps</option>
                <option value="upward-pay">upward-pay (Tenant)</option>
                <option value="upward-pm">upward-pm (Manager)</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '0 1 auto',
              minWidth: '150px',
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Filter
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <select
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value)
                  setPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '11px 32px 11px 36px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Platforms</option>
                <option value="web">Web Browser</option>
                <option value="mobile">Mobile App</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '0 1 auto',
              minWidth: '150px',
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Filter
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '11px 32px 11px 36px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="SIGNUP">SIGNUP</option>
                <option value="APP_INSTALL">APP_INSTALL</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Timeline Logs Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="loader"></div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            No activity logs found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.map((log) => {
              const isMobileLog = (log.userAgent && log.userAgent.toLowerCase().includes('capacitor')) || log.action === 'APP_INSTALL';
              return (
                <div
                  key={log.id}
                  className="table-row-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}>
                      {getActivityIcon(log.action, log.entityType || undefined)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: log.app === 'upward-pay' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                          color: log.app === 'upward-pay' ? '#3b82f6' : '#8b5cf6',
                        }}>
                          {log.app}
                        </span>
                        {log.userPathway && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: log.userPathway === 'WAITLIST' ? 'rgba(16, 185, 129, 0.15)' : log.userPathway === 'INVITE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            color: log.userPathway === 'WAITLIST' ? '#10b981' : log.userPathway === 'INVITE' ? '#3b82f6' : 'var(--text-muted)',
                          }}>
                            {log.userPathway === 'WAITLIST' ? 'Waitlist' : log.userPathway === 'INVITE' ? 'Invite' : 'Self'}
                          </span>
                        )}
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}>
                          {isMobileLog ? 'Mobile' : 'Web'}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {renderLogMessage(log, openDrawerForUser, openDrawerForPm)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      style={{
                        background: 'var(--accent-faint)',
                        color: 'var(--accent)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye size={14} />
                      View JSON
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: 'var(--surface)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                flex: '1 0 100%',
                textAlign: 'center',
                marginBottom: '-8px',
                display: 'block',
                order: -1,
              }}
              className="mobile-only"
            >
              Page {page} of {totalPages} ({total} events)
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? 'default' : 'pointer',
                }}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <div
                style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '14px' }}
                className="desktop-only"
              >
                Page {page} of {totalPages} ({total} events)
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: page === totalPages ? 0.5 : 1,
                  cursor: page === totalPages ? 'default' : 'pointer',
                }}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

      {/* Details JSON Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '650px',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <button
              onClick={() => setSelectedLog(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>Log Details</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                UUID: {selectedLog.uuid}
              </p>
            </div>

            <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>App:</span>
                <span>{selectedLog.app}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>IP Address:</span>
                <span>{selectedLog.ipAddress || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>User Agent:</span>
                <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedLog.userAgent || ''}>
                  {selectedLog.userAgent || '—'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="section-label" style={{ fontSize: '12px' }}>Request Payload & Metadata</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedLog.metadata || {}, null, 2))}
                  style={{
                    background: 'transparent',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '300px',
                  margin: 0,
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setSelectedLog(null)} className="btn btn-primary">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .hide-mobile { display: block; }
        .show-mobile { display: none; }
        
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
          .show-mobile { display: block; }
        }
      `}</style>
      {/* Preview Drawer */}
      <PreviewDrawer
        entity={drawerEntity}
        onClose={() => setDrawerEntity(null)}
      />
    </div>
  )
}

export default AppActivity
