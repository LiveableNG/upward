import React, { useState, useEffect } from 'react'
import {
  Percent,
  Search,
  Plus,
  Trash2,
  Filter,
  Edit2,
  X,
  User,
  Users,
  Building2,
  ShieldCheck,
  RefreshCcw
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface FeeOverride {
  id: number
  targetType: string // 'USER', 'PM', 'COMPANY', 'PLATFORM'
  targetId: string
  fee: number
  createdAt: string
  targetName?: string
  targetEmail?: string
}

interface FeeTarget {
  id: string
  name: string
  email: string
  type: string // 'USER', 'PM', 'COMPANY', 'PLATFORM'
  fee: number | null
}

interface FeesProps {
  token: string
}

const Fees: React.FC<FeesProps> = ({ token }) => {
  const [overrides, setOverrides] = useState<FeeOverride[]>([])
  const [targets, setTargets] = useState<FeeTarget[]>([])
  const [pmList, setPmList] = useState<FeeTarget[]>([])
  
  const [loadingOverrides, setLoadingOverrides] = useState(true)
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [loadingPms, setLoadingPms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters / Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL')
  const [selectedPmUuid, setSelectedPmUuid] = useState('')

  // Modal / Editor State
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configTarget, setConfigTarget] = useState<FeeTarget | null>(null)
  const [inputFee, setInputFee] = useState<string>('2000')

  // Fetch configured overrides
  const fetchOverrides = async () => {
    setLoadingOverrides(true)
    try {
      const response = await apiService.get('/admin/fees/overrides', token)
      if (response && response.success) {
        setOverrides(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch fee overrides:', error)
    } finally {
      setLoadingOverrides(false)
    }
  }

  // Fetch property managers for filtering
  const fetchPms = async () => {
    setLoadingPms(true)
    try {
      const response = await apiService.get('/admin/fees/targets?type=PM', token)
      if (response && response.success) {
        setPmList(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch PM list for filters:', error)
    } finally {
      setLoadingPms(false)
    }
  }

  // Search/fetch override targets
  const fetchTargets = async () => {
    setLoadingTargets(true)
    try {
      let url = `/admin/fees/targets?q=${encodeURIComponent(searchQuery)}`
      if (targetTypeFilter !== 'ALL') {
        url += `&type=${targetTypeFilter}`
      }
      if (selectedPmUuid) {
        url += `&pmUuid=${selectedPmUuid}`
      }
      const response = await apiService.get(url, token)
      if (response && response.success) {
        setTargets(response.data)
      }
    } catch (error) {
      console.error('Failed to search fee targets:', error)
    } finally {
      setLoadingTargets(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchOverrides()
    fetchPms()
  }, [])

  // Refetch targets when query/filters change
  useEffect(() => {
    fetchTargets()
  }, [searchQuery, targetTypeFilter, selectedPmUuid])

  const handleOpenConfig = (target: FeeTarget) => {
    setConfigTarget(target)
    setInputFee(target.fee !== null && target.fee !== undefined ? String(target.fee) : '2000')
    setShowConfigModal(true)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configTarget) return
    const feeNum = parseFloat(inputFee)
    if (isNaN(feeNum) || feeNum < 0) {
      alert('Please enter a valid processing fee.')
      return
    }

    setSubmitting(true)
    try {
      const response = await apiService.post(
        '/admin/fees/overrides',
        {
          targetType: configTarget.type,
          targetId: configTarget.id,
          fee: feeNum,
        },
        token
      )
      if (response && response.success) {
        setShowConfigModal(false)
        fetchOverrides()
        fetchTargets()
      }
    } catch (error: any) {
      console.error('Failed to save fee override:', error)
      alert(error.message || 'Error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOverride = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this custom fee override? It will revert to the next hierarchy level (or platform default ₦2,000).')) {
      return
    }

    try {
      const response = await apiService.delete(`/admin/fees/overrides/${type}/${id}`, token)
      if (response && response.success) {
        fetchOverrides()
        fetchTargets()
      }
    } catch (error: any) {
      console.error('Failed to delete fee override:', error)
      alert(error.message || 'Failed to delete override')
    }
  }

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'PLATFORM':
        return <ShieldCheck size={16} />
      case 'COMPANY':
        return <Building2 size={16} />
      case 'PM':
        return <Users size={16} />
      default:
        return <User size={16} />
    }
  }

  const getTargetLabelColor = (type: string) => {
    switch (type) {
      case 'PLATFORM':
        return 'var(--success)'
      case 'COMPANY':
        return 'var(--warning)'
      case 'PM':
        return 'var(--accent)'
      default:
        return 'var(--text-muted)'
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
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
            <Percent size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Hierarchical Fee Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Override the standard ₦2,000 Paystack processing fee at different granular levels: User &gt; PM &gt; Company &gt; Platform &gt; Default.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchOverrides()
            fetchTargets()
          }}
          className="btn btn-secondary"
          disabled={loadingOverrides || loadingTargets}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RefreshCcw size={16} className={loadingOverrides || loadingTargets ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="grid-mobile-1">
        
        {/* Left Column: Configure & Search targets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              Find & Configure Target Fees
            </h3>

            {/* Filter Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* Search */}
              <div style={{ position: 'relative', width: '100%' }}>
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
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '42px' }}
                />
              </div>

              {/* Filters Dropdown row */}
              <div style={{ display: 'flex', gap: '12px' }} className="flex-mobile-column">
                <div style={{ flex: 1, position: 'relative' }}>
                  <select
                    value={targetTypeFilter}
                    onChange={(e) => {
                      setTargetTypeFilter(e.target.value)
                      if (e.target.value !== 'USER' && e.target.value !== 'ALL') {
                        setSelectedPmUuid('')
                      }
                    }}
                    className="input"
                    style={{ appearance: 'none', paddingRight: '32px' }}
                  >
                    <option value="ALL">All Levels</option>
                    <option value="USER">User (Tenant)</option>
                    <option value="PM">Property Manager</option>
                    <option value="COMPANY">Company</option>
                    <option value="PLATFORM">Platform</option>
                  </select>
                  <Filter
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

                {/* Optional PM filter for users */}
                {(targetTypeFilter === 'ALL' || targetTypeFilter === 'USER') && (
                  <div style={{ flex: 1, position: 'relative' }}>
                    <select
                      value={selectedPmUuid}
                      onChange={(e) => setSelectedPmUuid(e.target.value)}
                      className="input"
                      style={{ appearance: 'none', paddingRight: '32px' }}
                    >
                      <option value="">Filter by PM: None</option>
                      {pmList.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))}
                    </select>
                    <Filter
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
                )}
              </div>
            </div>

            {/* Target Results List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {loadingTargets ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                  <div className="loader"></div>
                </div>
              ) : targets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No matching targets found. Search above.
                </div>
              ) : (
                targets.map((target) => (
                  <div
                    key={`${target.type}-${target.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: `${getTargetLabelColor(target.type)}15`,
                            color: getTargetLabelColor(target.type),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {getTargetIcon(target.type)}
                          {target.type}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{target.name}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                        {target.email} · ID: {target.id}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {target.fee !== null && target.fee !== undefined ? (
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>
                          ₦{target.fee.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Default (2k)</span>
                      )}

                      <button
                        onClick={() => handleOpenConfig(target)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Configured overrides list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ height: '100%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              Active Fee Overrides
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '600px' }}>
              {loadingOverrides ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                  <div className="loader"></div>
                </div>
              ) : overrides.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No active custom fee overrides found. All transactions inherit standard rules.
                </div>
              ) : (
                overrides.map((ov) => (
                  <div
                    key={ov.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: `${getTargetLabelColor(ov.targetType)}15`,
                            color: getTargetLabelColor(ov.targetType),
                          }}
                        >
                          {ov.targetType}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          ₦{ov.fee.toLocaleString()}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                        {ov.targetName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {ov.targetEmail}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() =>
                          handleOpenConfig({
                            id: ov.targetId,
                            name: ov.targetName || '',
                            email: ov.targetEmail || '',
                            type: ov.targetType,
                            fee: ov.fee,
                          })
                        }
                        className="btn btn-secondary"
                        style={{ padding: '6px', borderRadius: '8px' }}
                        title="Edit Fee"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteOverride(ov.targetType, ov.targetId)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--danger)' }}
                        title="Delete Override"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && configTarget && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Configure Custom Fee</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Configuring Level: {configTarget.type}
              </span>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginTop: '4px' }}>
                {configTarget.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{configTarget.email}</div>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Processing Fee Amount (₦)
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                    }}
                  >
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="2000"
                    value={inputFee}
                    onChange={(e) => setInputFee(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px', fontWeight: 700, fontSize: '16px' }}
                    required
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  This amount overrides standard settings. Use 0 to enable zero-fee checkouts for this group.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Fees
