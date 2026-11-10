import React, { useState, useEffect, useMemo } from 'react'
import {
  Megaphone,
  Plus,
  Clock,
  Sparkles,
  Target,
  Search,
  Bell,
  Info,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Radio,
  XCircle,
  Copy,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import {
  DataTable,
  type ColumnDef,
  type ActionItem,
  StatusBadge,
  FilterBar,
  Modal,
  ConfirmModal,
} from '../components/common'

interface Announcement {
  id: string
  title: string
  message: string
  iconType: string
  url?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AnnouncementsProps {
  token: string
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

const PAGE_SIZE = 10

const ICON_OPTIONS = [
  { value: 'sparkles', label: 'Sparkles', icon: <Sparkles size={16} /> },
  { value: 'info', label: 'Info', icon: <Info size={16} /> },
  { value: 'megaphone', label: 'Megaphone', icon: <Megaphone size={16} /> },
  { value: 'target', label: 'Target', icon: <Target size={16} /> },
  { value: 'clock', label: 'Clock', icon: <Clock size={16} /> },
]

function renderAnnouncementIcon(iconType: string, isActive: boolean) {
  const iconProps = { size: 18 }
  let iconNode = <Megaphone {...iconProps} />

  switch (iconType?.toLowerCase()) {
    case 'sparkles':
      iconNode = <Sparkles {...iconProps} />
      break
    case 'info':
      iconNode = <Info {...iconProps} />
      break
    case 'target':
      iconNode = <Target {...iconProps} />
      break
    case 'clock':
      iconNode = <Clock {...iconProps} />
      break
    default:
      iconNode = <Megaphone {...iconProps} />
      break
  }

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: isActive ? 'var(--accent-faint)' : 'var(--surface-hover)',
        border: isActive ? '1px solid var(--accent-muted)' : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        flexShrink: 0,
      }}
    >
      {iconNode}
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export const Announcements: React.FC<AnnouncementsProps> = ({ token }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDirectModal, setShowDirectModal] = useState(false)
  const [showPushModal, setShowPushModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)

  // Loading states for actions
  const [sendingPush, setSendingPush] = useState(false)
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false)
  const [sendingDirect, setSendingDirect] = useState(false)
  const [_deactivating, setDeactivating] = useState(false)

  // Form states
  const [pushNotification, setPushNotification] = useState({
    title: '',
    message: '',
    url: '',
  })

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    iconType: 'sparkles',
    url: '',
  })

  const [directNotification, setDirectNotification] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'SYSTEM',
  })

  // User search states for Direct Notification
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; name: string; email: string }[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [token])

  const fetchAnnouncements = async () => {
    try {
      const result = await apiService.get('/admin/notifications/announcements', token)
      setAnnouncements(Array.isArray(result) ? result : result.data || [])
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch announcements', true)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAnnouncements()
    setIsRefreshing(false)
  }

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query)
    setDirectNotification((prev) => ({ ...prev, userId: '' }))

    if (query.length < 2) {
      setUserSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const result = await apiService.get(`/admin/users/search?q=${encodeURIComponent(query)}`, token)
      setUserSearchResults(result.data || [])
    } catch (err) {
      console.error('User search failed', err)
    } finally {
      setSearchingUsers(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      showToast('Please fill in title and message', true)
      return
    }

    setCreatingAnnouncement(true)
    try {
      await apiService.post('/admin/notifications/announcements', newAnnouncement, token)
      await fetchAnnouncements()
      setShowCreateModal(false)
      setNewAnnouncement({ title: '', message: '', iconType: 'sparkles', url: '' })
      showToast('Platform announcement broadcasted successfully!')
    } catch (err) {
      console.error(err)
      showToast('Failed to create announcement', true)
    } finally {
      setCreatingAnnouncement(false)
    }
  }

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directNotification.userId) {
      showToast('Please select a recipient tenant', true)
      return
    }

    setSendingDirect(true)
    try {
      await apiService.post('/admin/notifications/direct', directNotification, token)
      setShowDirectModal(false)
      setDirectNotification({ userId: '', title: '', message: '', type: 'SYSTEM' })
      setUserSearchQuery('')
      setUserSearchResults([])
      showToast('Direct notification delivered to tenant!')
    } catch (err) {
      console.error(err)
      showToast('Failed to send notification. Please check the recipient.', true)
    } finally {
      setSendingDirect(false)
    }
  }

  const handleSendPushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pushNotification.title.trim() || !pushNotification.message.trim()) {
      showToast('Please provide both title and message', true)
      return
    }

    setSendingPush(true)
    try {
      await apiService.post('/admin/notifications/push-broadcast', pushNotification, token)
      setShowPushModal(false)
      setPushNotification({ title: '', message: '', url: '' })
      showToast('Push notification broadcasted to all mobile devices! 🚀')
    } catch (err: any) {
      console.error(err)
      showToast(err?.message || 'Failed to broadcast push notification', true)
    } finally {
      setSendingPush(false)
    }
  }

  const handleDeactivateAll = async () => {
    setDeactivating(true)
    try {
      await apiService.delete('/admin/notifications/announcements', token)
      await fetchAnnouncements()
      setShowDeactivateModal(false)
      showToast('Active announcements have been deactivated.')
    } catch (err) {
      console.error(err)
      showToast('Failed to deactivate announcement', true)
    } finally {
      setDeactivating(false)
    }
  }

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text)
    showToast(`${label} to clipboard!`)
  }

  // Filtered & Paginated Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const matchesSearch =
        searchQuery === '' ||
        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ann.url && ann.url.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && ann.isActive) ||
        (statusFilter === 'INACTIVE' && !ann.isActive)

      return matchesSearch && matchesStatus
    })
  }, [announcements, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / PAGE_SIZE))

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredAnnouncements.slice(start, start + PAGE_SIZE)
  }, [filteredAnnouncements, currentPage])

  // Overview metrics
  const activeAnnouncement = useMemo(() => announcements.find((a) => a.isActive), [announcements])
  const activeCount = announcements.filter((a) => a.isActive).length
  const inactiveCount = announcements.filter((a) => !a.isActive).length

  // Table Columns Definition
  const columns: ColumnDef<Announcement>[] = [
    {
      key: 'announcement',
      label: 'Announcement',
      render: (ann) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '480px' }}>
          {renderAnnouncementIcon(ann.iconType, ann.isActive)}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                {ann.title}
              </span>
              {ann.isActive && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--success-faint)',
                    color: 'var(--success)',
                  }}
                >
                  <Radio size={12} className="pulse" /> Live Now
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginTop: '4px',
                marginBottom: 0,
                lineHeight: 1.45,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {ann.message}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'url',
      label: 'Action Destination',
      width: '180px',
      render: (ann) => {
        if (!ann.url) {
          return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
        }
        return (
          <a
            href={ann.url.startsWith('http') ? ann.url : `#`}
            target={ann.url.startsWith('http') ? '_blank' : '_self'}
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-faint)',
              maxWidth: '170px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={ann.url}
          >
            <ExternalLink size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ann.url}</span>
          </a>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (ann) => (
        <StatusBadge
          variant={ann.isActive ? 'success' : 'secondary'}
          label={ann.isActive ? 'Active' : 'Archived'}
        />
      ),
    },
    {
      key: 'createdAt',
      label: 'Broadcasted At',
      width: '160px',
      render: (ann) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <Clock size={13} />
          <span>{formatDate(ann.createdAt)}</span>
        </div>
      ),
    },
  ]

  // Row Actions (Dropdown menu per row)
  const getRowActions = (ann: Announcement): ActionItem<Announcement>[] => {
    const actions: ActionItem<Announcement>[] = [
      {
        label: 'Copy Message',
        icon: <Copy size={14} />,
        onClick: () => copyToClipboard(ann.message, 'Message copied'),
      },
    ]

    if (ann.url) {
      actions.push({
        label: 'Copy Action URL',
        icon: <ExternalLink size={14} />,
        onClick: () => copyToClipboard(ann.url!, 'URL copied'),
      })
    }

    if (ann.isActive) {
      actions.push({
        label: 'Deactivate Broadcast',
        icon: <XCircle size={14} />,
        danger: true,
        onClick: () => setShowDeactivateModal(true),
      })
    }

    return actions
  }

  return (
    <div className="page-container fade-in" style={{ padding: '24px 32px' }}>
      {/* ── Top Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'var(--accent-faint)',
              border: '1px solid var(--accent-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Megaphone size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              Announcements & Push Notifications
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Broadcast platform announcements, reach tenants with direct alerts, or deliver mobile push notifications.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPushModal(true)}
            style={{ height: 38, fontSize: 13, fontWeight: 600 }}
          >
            <Smartphone size={16} />
            <span>Broadcast Push</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDirectModal(true)}
            style={{ height: 38, fontSize: 13, fontWeight: 600 }}
          >
            <Bell size={16} />
            <span>Send Direct</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ height: 38, fontSize: 13, fontWeight: 600 }}
          >
            <Plus size={16} />
            <span>New Announcement</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary"
            style={{ height: 38, fontSize: 13, fontWeight: 600 }}
            disabled={isRefreshing || loading}
            title="Refresh announcements"
          >
            <RefreshCw size={14} className={isRefreshing ? 'loader' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--accent)', textTransform: 'uppercase' }}>
              Active Broadcast
            </span>
            <Radio size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeAnnouncement ? activeAnnouncement.title : 'No Active Popup'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {activeCount > 0 ? 'Live in tenant dashboard popup' : 'All users on standard view'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Announcements
            </span>
            <Megaphone size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: 'var(--text)' }}>
            {loading ? '...' : announcements.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {inactiveCount} archived in history
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#059669', textTransform: 'uppercase' }}>
              Push Notification Pipeline
            </span>
            <Smartphone size={18} color="#059669" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: 'var(--text)' }}>
            APNs & FCM Live
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Custom chime audio (`upward_chime`)
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <FilterBar
        searchPlaceholder="Search announcements by title, content or URL..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val)
          setCurrentPage(1)
        }}
        filters={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab)
                  setCurrentPage(1)
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: statusFilter === tab ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: statusFilter === tab ? 'var(--accent-faint)' : 'var(--surface)',
                  color: statusFilter === tab ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'var(--transition)',
                }}
              >
                {tab === 'ALL' ? 'All Broadcasts' : tab === 'ACTIVE' ? 'Active Only' : 'Archived'}
              </button>
            ))}
          </div>
        }
      />

      {/* ── Main DataTable ── */}
      <DataTable<Announcement>
        data={paginatedData}
        columns={columns}
        keyExtractor={(item) => item.id.toString()}
        isLoading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rowActions={getRowActions}
        emptyIcon={<Megaphone size={40} style={{ color: 'var(--text-muted)' }} />}
        emptyTitle="No announcements found"
        emptyDescription={
          searchQuery || statusFilter !== 'ALL'
            ? 'No announcements match your search filters. Try clearing filters.'
            : 'Get started by creating your first platform announcement.'
        }
      />

      {/* ── Modal 1: Create Platform Announcement ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="540px"
        title="Create Platform Announcement"
        description="Shown as a prominent modal popup to all tenants upon signing in."
        icon={<Megaphone size={22} />}
        footerActions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateModal(false)}
              style={{ flex: 1 }}
              disabled={creatingAnnouncement}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-announcement-form"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={creatingAnnouncement}
            >
              {creatingAnnouncement ? 'Broadcasting...' : 'Broadcast Announcement'}
            </button>
          </>
        }
      >
        <form
          id="create-announcement-form"
          onSubmit={handleCreateAnnouncement}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Announcement Title *
            </label>
            <input
              required
              type="text"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              placeholder="E.g. Scheduled System Maintenance"
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Action Destination / Link (Optional)
            </label>
            <input
              type="url"
              value={newAnnouncement.url}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, url: e.target.value })}
              placeholder="https://goodtenants.co or /dashboard/rent"
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Optional button attached to the popup for the tenant to click through.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Message Body *
            </label>
            <textarea
              required
              rows={4}
              value={newAnnouncement.message}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
              placeholder="Inform tenants about upgrades, service notices, or new features..."
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Visual Icon
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICON_OPTIONS.map((opt) => {
                const isSelected = newAnnouncement.iconType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewAnnouncement({ ...newAnnouncement, iconType: opt.value })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: isSelected ? 'var(--accent-faint)' : 'var(--white)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Live In-App Preview */}
          {newAnnouncement.title && (
            <div
              style={{
                marginTop: 4,
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'var(--surface-hover)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                In-App Modal Preview
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {renderAnnouncementIcon(newAnnouncement.iconType, true)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {newAnnouncement.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>
                    {newAnnouncement.message || 'Announcement description preview...'}
                  </div>
                  {newAnnouncement.url && (
                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--accent)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: 'var(--accent-faint)',
                        }}
                      >
                        Action Link: {newAnnouncement.url}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ── Modal 2: Send Direct Notification ── */}
      <Modal
        isOpen={showDirectModal}
        onClose={() => setShowDirectModal(false)}
        maxWidth="540px"
        title="Send Direct Notification"
        description="Target an individual tenant with a private in-app notification."
        icon={<Bell size={22} />}
        footerActions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDirectModal(false)}
              style={{ flex: 1 }}
              disabled={sendingDirect}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="send-direct-form"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={sendingDirect || !directNotification.userId}
            >
              {sendingDirect ? 'Sending...' : 'Send Private Alert'}
            </button>
          </>
        }
      >
        <form
          id="send-direct-form"
          onSubmit={handleSendDirect}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Recipient Tenant *
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                required
                type="text"
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search tenant by name or email..."
                className="input"
                style={{
                  padding: '10px 14px 10px 38px',
                  borderRadius: 10,
                  fontSize: 14,
                  borderColor: directNotification.userId ? 'var(--success)' : 'var(--border)',
                }}
              />

              {searchingUsers && (
                <div
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  Searching...
                </div>
              )}

              {userSearchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    marginTop: 4,
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 20,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {userSearchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setDirectNotification({ ...directNotification, userId: user.id })
                        setUserSearchQuery(`${user.name} (${user.email})`)
                        setUserSearchResults([])
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        transition: 'var(--transition)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {directNotification.userId && (
              <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                ✓ Recipient tenant selected
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Subject *
            </label>
            <input
              required
              type="text"
              value={directNotification.title}
              onChange={(e) => setDirectNotification({ ...directNotification, title: e.target.value })}
              placeholder="E.g. Update regarding your tenancy agreement"
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Message *
            </label>
            <textarea
              required
              rows={4}
              value={directNotification.message}
              onChange={(e) => setDirectNotification({ ...directNotification, message: e.target.value })}
              placeholder="Write your private message to this tenant..."
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, resize: 'vertical' }}
            />
          </div>
        </form>
      </Modal>

      {/* ── Modal 3: Broadcast Mobile Push (Push-Only) ── */}
      <Modal
        isOpen={showPushModal}
        onClose={() => setShowPushModal(false)}
        maxWidth="540px"
        title="Broadcast Mobile Push"
        description="Delivers an instant APNs & FCM push notification with custom chime to all iOS and Android devices."
        icon={<Smartphone size={22} />}
        footerActions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPushModal(false)}
              style={{ flex: 1 }}
              disabled={sendingPush}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="broadcast-push-form"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={sendingPush}
            >
              {sendingPush ? 'Broadcasting...' : 'Broadcast Push Now 🚀'}
            </button>
          </>
        }
      >
        <form
          id="broadcast-push-form"
          onSubmit={handleSendPushBroadcast}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Notification Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Exclusive Weekend Housing Perks 🎁"
              value={pushNotification.title}
              onChange={(e) => setPushNotification({ ...pushNotification, title: e.target.value })}
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Notification Message / Body *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Browse newly unlocked discounts on furniture and rental deals in your Upward Pay app today."
              value={pushNotification.message}
              onChange={(e) => setPushNotification({ ...pushNotification, message: e.target.value })}
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Action Deep-Link Path (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. /dashboard/benefits or /dashboard/pay-rent"
              value={pushNotification.url}
              onChange={(e) => setPushNotification({ ...pushNotification, url: e.target.value })}
              className="input"
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              When tapped on mobile, the app automatically deep-links to this screen.
            </span>
          </div>

          {/* Mobile Notification Preview Card */}
          {pushNotification.title && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--accent)',
                  }}
                >
                  UPWARD PAY • NOW
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  🔔 upward_chime
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {pushNotification.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {pushNotification.message || 'Notification preview text...'}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ── Modal 4: Deactivate Confirm Modal ── */}
      <ConfirmModal
        isOpen={showDeactivateModal}
        title="Deactivate Active Announcement?"
        message="This will hide the current announcement popup from all tenants. Existing history will remain preserved in the archive."
        danger={true}
        onConfirm={handleDeactivateAll}
        onCancel={() => setShowDeactivateModal(false)}
      />
    </div>
  )
}

export default Announcements
