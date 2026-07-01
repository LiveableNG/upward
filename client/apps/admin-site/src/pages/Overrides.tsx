import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, ShieldCheck, Landmark, Building, AppWindow, HelpCircle, Plus } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import type { FeeOverride } from '../features/dashboard/types'

interface OverridesPageProps {
  token: string
  adminRole?: string
}

const OverridesPage: React.FC<OverridesPageProps> = ({ token, adminRole }) => {
  const [searchParams] = useSearchParams()
  const isSuperadmin = adminRole === 'SUPERADMIN'

  // Fetch States
  const [overrides, setOverrides] = useState<FeeOverride[]>([])
  const [baseFeeInput, setBaseFeeInput] = useState('2000')
  const [loading, setLoading] = useState(true)

  // Form States
  const [customOverrideType, setCustomOverrideType] = useState('PM')
  const [customOverrideId, setCustomOverrideId] = useState('')
  const [customOverrideFee, setCustomOverrideFee] = useState('2000')
  const [savingBaseFee, setSavingBaseFee] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)

  // Filter State
  const [searchQuery, setSearchQuery] = useState('')

  // Read URL Params (for quick action)
  const pmUuidParam = searchParams.get('pmUuid')
  const pmNameParam = searchParams.get('pmName')

  const fetchOverrides = async () => {
    setLoading(true)
    try {
      const response = await apiService.get('/admin/fees/overrides', token)
      setOverrides(response.overrides || [])
      if (response.baseFee !== undefined) {
        setBaseFeeInput(String(response.baseFee))
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to load overrides config', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverrides()
  }, [])

  // Pre-fill if quick action is triggered
  useEffect(() => {
    if (pmUuidParam) {
      setCustomOverrideType('PM')
      setCustomOverrideId(pmUuidParam)
    }
  }, [pmUuidParam])

  // Save Base Fee
  const handleSaveBaseFee = async () => {
    if (!isSuperadmin) return
    setSavingBaseFee(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: 'PLATFORM',
        targetId: 'GLOBAL_DEFAULT',
        fee: parseFloat(baseFeeInput),
      }, token)
      showToast('Global fallback processing fee updated')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to save base fee', true)
    } finally {
      setSavingBaseFee(false)
    }
  }

  // Save Custom Override
  const handleSaveCustomOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSuperadmin) return
    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: customOverrideType,
        targetId: customOverrideId,
        fee: parseFloat(customOverrideFee),
      }, token)
      showToast('Fee override successfully applied')
      setCustomOverrideId('')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to apply custom override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  // Delete Custom Override
  const handleDeleteOverride = async (targetType: string, targetId: string) => {
    if (!isSuperadmin) return
    try {
      await apiService.delete(`/admin/fees/overrides/${targetType}/${targetId}`, token)
      showToast('Override configuration removed')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete override', true)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'PM': return <Building size={16} />
      case 'COMPANY': return <Landmark size={16} />
      default: return <AppWindow size={16} />
    }
  }

  const filteredOverrides = overrides.filter((ov) => {
    const q = searchQuery.toLowerCase()
    return (
      ov.targetId.toLowerCase().includes(q) ||
      (ov.targetName && ov.targetName.toLowerCase().includes(q)) ||
      ov.targetType.toLowerCase().includes(q)
    );
  })

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Fee Overrides Configuration</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Administration / Custom & Platform Processing Fees
          </span>
        </div>
      </div>

      {pmUuidParam && pmNameParam && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.06)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          <ShieldCheck size={18} style={{ color: '#6366f1' }} />
          <span>
            Quick Override pre-filled for PM <strong>{pmNameParam}</strong> ({pmUuidParam.slice(0, 8)}...). Set custom fee below.
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div style={{ margin: '0 auto 12px auto' }} className="loader" />
          <span>Loading override registry logs...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }} className="grid-mobile-1">
          
          {/* LEFT SIDE: Override creators */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Global Settings */}
            <div className="card">
              <span className="section-label" style={{ display: 'block', marginBottom: '12px' }}>Global Base Fallback Fee</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px', lineHeight: 1.5 }}>
                This is the standard transaction processing fee applied when no company or property manager override matches.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    min="0"
                    value={baseFeeInput}
                    onChange={(e) => setBaseFeeInput(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px', fontSize: '15px', fontWeight: 700 }}
                    disabled={!isSuperadmin}
                  />
                </div>
                {isSuperadmin && (
                  <button onClick={handleSaveBaseFee} className="btn btn-primary" style={{ height: '44px' }} disabled={savingBaseFee}>
                    <Save size={16} /> Save
                  </button>
                )}
              </div>
            </div>

            {/* Custom Override Form */}
            {isSuperadmin && (
              <div className="card">
                <span className="section-label" style={{ display: 'block', marginBottom: '12px' }}>Create Custom Fee Override</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px', lineHeight: 1.5 }}>
                  Apply special fee packages for a Property Manager, PM Company group, or external platform integration.
                </p>
                <form onSubmit={handleSaveCustomOverride} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Override Level</label>
                    <select
                      value={customOverrideType}
                      onChange={(e) => setCustomOverrideType(e.target.value)}
                      className="input"
                    >
                      <option value="PM">Property Manager Account (PMA)</option>
                      <option value="COMPANY">Company Group / PM Corp</option>
                      <option value="PLATFORM">External App Platform</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Entity UUID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
                      value={customOverrideId}
                      onChange={(e) => setCustomOverrideId(e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Custom Fee Amount (₦)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                      <input
                        type="number"
                        min="0"
                        value={customOverrideFee}
                        onChange={(e) => setCustomOverrideFee(e.target.value)}
                        className="input"
                        style={{ paddingLeft: '32px', fontSize: '15px', fontWeight: 700 }}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px', marginTop: '8px' }} disabled={savingOverride}>
                    <Plus size={16} /> Apply Override
                  </button>

                </form>
              </div>
            )}

          </div>

          {/* RIGHT SIDE: Active list overrides */}
          <div className="card" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="section-label">Active Custom Override Profiles</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Matches prioritize PM overrides first, then Company overrides, then Global Fallbacks.
                </span>
              </div>
              
              {/* Table search filter */}
              <input
                type="text"
                placeholder="Search overrides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ maxWidth: '240px', height: '36px', padding: '0 12px' }}
              />
            </div>

            {filteredOverrides.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredOverrides.map((ov) => (
                  <div
                    key={ov.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'var(--surface-hover)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      transition: 'var(--transition)'
                    }}
                    className="table-row-hover"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: ov.targetType === 'PM' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        color: ov.targetType === 'PM' ? '#6366f1' : 'var(--warning)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getIcon(ov.targetType)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>{ov.targetName || 'Anonymous Account'}</span>
                          <span className="badge" style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            background: ov.targetType === 'PM' ? 'rgba(99, 102, 241, 0.08)' : 'var(--warning-faint)',
                            color: ov.targetType === 'PM' ? '#6366f1' : 'var(--warning)',
                            border: 'none'
                          }}>
                            {ov.targetType}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>
                          ID: {ov.targetId}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Fee Override</span>
                        <strong style={{ fontSize: '16px', color: 'var(--accent)' }}>₦{ov.fee.toLocaleString()}</strong>
                      </div>
                      {isSuperadmin && (
                        <button
                          onClick={() => handleDeleteOverride(ov.targetType, ov.targetId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          className="btn-secondary"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <HelpCircle size={40} style={{ color: 'var(--text-muted)' }} />
                <span>No active fee overrides matching "{searchQuery}" found.</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}

export default OverridesPage
