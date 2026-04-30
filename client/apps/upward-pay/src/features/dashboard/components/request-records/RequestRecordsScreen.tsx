'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Plus, MapPin, Building, Phone, Mail, User, ShieldCheck, CheckCircle, FileText } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/common/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'

export function RequestRecordsScreen() {
  const router = useRouter()
  const toast = useToast()
  const { user } = useAuth()
  const [selectedPropertyIdx, setSelectedPropertyIdx] = useState(0)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({})

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getCredibilityRequests()
        setHistory(data)
        if (data.length > 0) {
          setActiveTab('history')
        }
      } catch (err) {
        console.error('Failed to fetch request history:', err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [])

  const properties = user?.properties || []
  const hasProperties = properties.length > 0

  const [formState, setFormState] = useState({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    alias: '',
  })

  React.useEffect(() => {
    if (hasProperties) {
      const prop = properties[selectedPropertyIdx]
      const comp = (prop as any).company
      const mang = (prop as any).manager
      const cEmail = comp?.email || mang?.email || (prop as any).companyEmail || (prop as any).managerEmail || ''
      const cPhone = comp?.phone || mang?.phone || (prop as any).companyPhone || (prop as any).managerPhone || ''
      const cName = comp?.name || (mang?.firstName ? `${mang.firstName} ${mang.lastName || ''}` : '') || (prop as any).companyName || (prop as any).managerName || ''
      setFormState({
        companyName: cName,
        email: cEmail,
        phone: cPhone,
        address: (prop as any).location?.address || (prop as any).location?.area || prop.address || '',
        alias: '',
      })
    }
  }, [selectedPropertyIdx, hasProperties, properties])

  const handleCreateRequest = async () => {
    if (!hasProperties) return
    setLoading(true)
    try {
      const payload = {
        propertyUuid: properties[selectedPropertyIdx].uuid,
        requestContactDetails: { ...formState }
      }
      const res = await api.submitRequestRecords(payload)
      if (res.success) {
        const updated = await api.getCredibilityRequests()
        setHistory(updated)
        setSuccess(true)
      }
    } catch (err) {
      console.error('Request failed:', err)
      toast.error('Something went wrong sending the request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="req-records dashboard--nav-offset">
        <PageHeader title="Request Records" showBack={false} />
        <div className="req-main req-success">
          <CheckCircle size={64} className="text--green" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
          <h2 className="req-success__title">Request Sent!</h2>
          <p className="req-success__desc">
            We have sent an email to your landlord/manager with a secure link to provide your past tenancy and payment records.
            Once they complete it, your credibility profile and Upward Score will be updated automatically!
          </p>
          <button className="btn btn--primary btn--block" onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
        <style jsx>{`
          .req-main { max-width: 600px; margin: 0 auto; padding: 2rem 1.5rem 6rem; }
          .req-success {
            text-align: center; margin-top: 2rem; background: var(--surface);
            padding: 3rem 2rem; border-radius: 24px; border: 1px solid var(--border-solid);
          }
          .req-success__title { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; }
          .req-success__desc { color: var(--text-muted); line-height: 1.6; margin-bottom: 2rem; }
          .text--green { color: var(--success); }
        `}</style>
      </div>
    )
  }

  return (
    <div className="req-records dashboard--nav-offset">
      <PageHeader title="Request Past Records" showBack onBack={() => router.push('/dashboard')} />

      <div className="req-main">
        <div className="req-banner">
          <div className="req-banner__icon"><ShieldCheck size={28} /></div>
          <div className="req-banner__content">
            <h3>Boost Your Credibility Profile</h3>
            <p>
              Requesting and verifying past tenancy records adds powerful historical data to your profile, improving your Upward Score and boosting your reliability rating.
            </p>
          </div>
        </div>

        {history.length > 0 && !loadingHistory && (
          <div className="req-tabs-container">
            <div className="req-tabs">
              <button className={`req-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                <Clock size={16} /> Past Requests
              </button>
              <button className={`req-tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>
                <Plus size={16} /> Send New Request
              </button>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className="req-history__loading" style={{ marginTop: '2rem' }}>
            <div className="spinner" />
            <p>Fetching your request history...</p>
          </div>
        ) : activeTab === 'new' ? (
          <div className="req-form animate-fade-in">
            <h2 className="req-form__title">Select Property Details</h2>
            <p className="req-form__desc">Enter the details of the manager or landlord you want to request records from.</p>

            {!hasProperties ? (
              <div className="req-empty-state">
                <div className="req-empty-icon"><Building size={32} /></div>
                <h3>No Properties Linked</h3>
                <p>You need to add a property to your profile to request past tenancy records.</p>
                <button className="btn btn--primary" onClick={() => router.push('/dashboard/me?view=personal&edit=true')}>
                  Add Your Property
                </button>
              </div>
            ) : (
              <div className="req-content">
                <div className="req-profile-selector animate-fade-in">
                  <label className="input-label">1. Select Property</label>
                  <div className="property-list">
                    {properties.map((prop, idx) => (
                      <div key={idx} className={`prop-card ${selectedPropertyIdx === idx ? 'selected' : ''}`} onClick={() => setSelectedPropertyIdx(idx)}>
                        <div className="prop-card__icon"><Building size={18} /></div>
                        <div className="prop-card__info">
                          <strong>{prop.location?.address || prop.location?.area || 'Address not listed'}</strong>
                          <span>
                            {(prop as any).company?.name || ((prop as any).manager?.firstName ? `${(prop as any).manager.firstName} ${(prop as any).manager.lastName || ''}` : '') || 'Independent Landlord'}
                          </span>
                        </div>
                        <div className="prop-card__radio"><div className="radio-inner" /></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="req-manual-form animate-fade-in" style={{ marginTop: '2rem' }}>
                  <label className="input-label" style={{ borderTop: '1px solid var(--border-solid)', paddingTop: '2rem' }}>
                    2. Confirm Contact Details
                  </label>
                  <p className="input-hint" style={{ marginBottom: '1.5rem', marginTop: '-0.25rem' }}>
                    We will send the request here. You can edit these for this specific request without altering your main profile records.
                  </p>

                  <div className="input-group">
                    <label className="input-label">Company or Manager Name</label>
                    <div className="input-wrap">
                      <Building size={18} className="input-icon" />
                      <input type="text" placeholder="e.g. Haven Properties or John Doe" className="input"
                        value={formState.companyName} onChange={(e) => setFormState(prev => ({ ...prev, companyName: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Email Address</label>
                      <div className="input-wrap">
                        <Mail size={18} className="input-icon" />
                        <input type="email" placeholder="manager@example.com" className="input"
                          value={formState.email} onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Phone Number</label>
                      <div className="input-wrap">
                        <Phone size={18} className="input-icon" />
                        <input type="tel" placeholder="0800 000 0000" className="input"
                          value={formState.phone} onChange={(e) => setFormState(prev => ({ ...prev, phone: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tenant Address shown on their side</label>
                    <div className="input-wrap">
                      <MapPin size={18} className="input-icon" />
                      <input type="text" placeholder="e.g. 12 Adeola Odeku St, VI" className="input"
                        value={formState.address} onChange={(e) => setFormState(prev => ({ ...prev, address: e.target.value }))} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tenant Name known as (Optional Alias)</label>
                    <div className="input-wrap">
                      <User size={18} className="input-icon" />
                      <input type="text" placeholder="The exact name they know you by" className="input"
                        value={formState.alias} onChange={(e) => setFormState(prev => ({ ...prev, alias: e.target.value }))} />
                    </div>
                    <div className="input-hint">If different from your profile name ({user?.firstName} {user?.lastName})</div>
                  </div>
                </div>
              </div>
            )}

            <div className="req-footer">
              <button className="btn btn--outline" onClick={() => router.push('/dashboard')}>Cancel</button>
              <button className="btn btn--primary" onClick={handleCreateRequest}
                disabled={loading || !hasProperties || (!formState.email && !formState.phone)}>
                {loading ? 'Sending Request...' : 'Send Request Email'}
              </button>
            </div>
          </div>
        ) : (
          <div className="req-history animate-fade-in">
            <div className="req-history__header">
              <h2 className="req-history__title">Recent Requests</h2>
              <p className="req-history__desc">Status of your past credibility requests.</p>
            </div>

            {/* Mobile cards */}
            <div className="req-history__list">
              {history.map((req, idx) => (
                <div key={idx} className="req-history__item">
                  <div className={`req-history__icon ${req.status === 'COMPLETED' ? 'req-history__icon--success' : ''}`}>
                    {req.status === 'COMPLETED' ? <CheckCircle size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="req-history__info">
                    <strong>{req.companyName || req.managerName || 'Verification Request'}</strong>
                    <span>Requested on {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={`req-history__status req-history__status--${req.status.toLowerCase()}`}>
                    {req.status}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="req-history__table">
              <thead>
                <tr>
                  <th>Manager / Company</th>
                  <th>Date Requested</th>
                  <th>Response Status</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {history.map((req, idx) => (
                  <React.Fragment key={idx}>
                    <tr
                      className={req.status === 'COMPLETED' ? 'clickable-row' : ''}
                      onClick={() => {
                        if (req.status === 'COMPLETED') {
                          setExpandedReqs(prev => ({ ...prev, [req.uuid]: !prev[req.uuid] }))
                        }
                      }}
                    >
                      <td>
                        <div className="td-company">
                          <div className="td-company__icon"><Building size={14} /></div>
                          <div className="td-company__text">
                            <strong>{req.companyName || req.managerName || 'Verification'}</strong>
                            <span>{req.propertyAddress}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td-date">{new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <span className={`table-badge table-badge--${req.status.toLowerCase()}`}>
                          {req.status === 'PENDING' ? 'Awaiting Records' : req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'COMPLETED'
                          ? <span className="td-impact td-impact--positive">+ Score Boost</span>
                          : <span className="td-impact td-impact--pending">Pending Impact</span>}
                      </td>
                    </tr>
                    {expandedReqs[req.uuid] && req.ingestedRecords && (
                      <tr className="expanded-records-row">
                        <td colSpan={4}>
                          <div className="ingested-records-list animate-fade-in">
                            <div className="records-header">Verified Tenancy Records</div>
                            {req.ingestedRecords.length === 0 ? (
                              <div className="no-records-hint">Records ingested into your profile manually.</div>
                            ) : (
                              <div className="records-grid">
                                {req.ingestedRecords.map((rec: any, rIdx: number) => (
                                  <div key={rIdx} className="record-mini-card">
                                    <div className="record-mini-info">
                                      <span className="date">{new Date(rec.dueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                      <span className="amount">{formatCurrency(rec.amount, 'NGN')}</span>
                                    </div>
                                    <div className={`record-mini-badge ${rec.isLate ? 'late' : 'on-time'}`}>
                                      {rec.isLate ? 'Late' : 'On-Time'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .req-main {
          max-width: 860px;
          margin: 0 auto;
          padding: 1.5rem 1rem 6rem;
        }

        @media (min-width: 1024px) {
          .req-main {
            padding: 0 0 4rem;
          }
        }

        .req-tabs-container {
          display: flex;
          justify-content: center;
          margin: 0 auto 2rem;
          max-width: 400px;
        }

        .req-tabs {
          display: flex;
          background: var(--surface2);
          padding: 6px;
          border-radius: 40px;
          border: 1px solid var(--border-solid);
          width: 100%;
          gap: 4px;
        }

        .req-tab {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          font-weight: 700;
          border-radius: 30px;
          color: var(--text-muted);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .req-tab:hover { color: var(--text); background: rgba(var(--clay-rgb), 0.05); }
        .req-tab.active { background: var(--surface); color: var(--clay); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        .req-history__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-muted);
          background: var(--surface2);
          border-radius: 16px;
          border: 1px dashed var(--border-solid);
        }
        .req-history__loading p { margin-top: 1rem; font-weight: 600; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(var(--clay-rgb), 0.1);
          border-top-color: var(--clay);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .req-banner {
          background: linear-gradient(135deg, rgba(var(--clay-rgb), 0.1) 0%, transparent 100%);
          border: 1px solid rgba(var(--clay-rgb), 0.3);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .req-banner__icon {
          width: 48px; height: 48px;
          background: var(--clay); color: white;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(var(--clay-rgb), 0.3);
        }
        .req-banner__content h3 { font-size: 1.1rem; font-weight: 800; color: var(--clay); margin: 0 0 0.25rem; }
        .req-banner__content p { font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); margin: 0; }

        .req-form {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 2rem 1.5rem;
        }
        @media (min-width: 640px) { .req-form { padding: 2.5rem; } }

        .req-form__title { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem; }
        .req-form__desc { font-size: 0.9rem; color: var(--text-muted); margin: 0 0 1.5rem; }

        .req-empty-state {
          text-align: center; padding: 2.5rem 1.5rem;
          background: rgba(var(--clay-rgb), 0.05);
          border: 1px dashed rgba(var(--clay-rgb), 0.3); border-radius: 16px;
        }
        .req-empty-icon {
          width: 64px; height: 64px; background: rgba(var(--clay-rgb), 0.1); color: var(--clay);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.5rem;
        }
        .req-empty-state h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.5rem; }
        .req-empty-state p { color: var(--text-muted); margin: 0 0 2rem; font-size: 0.95rem; }

        .property-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .prop-card {
          display: flex; align-items: center; padding: 1.25rem;
          border: 2px solid var(--border-solid); border-radius: 16px;
          cursor: pointer; transition: all 0.2s;
        }
        .prop-card:hover { background: var(--surface2); }
        .prop-card.selected { border-color: var(--clay); background: rgba(var(--clay-rgb), 0.05); }
        .prop-card__icon {
          width: 40px; height: 40px; background: var(--surface);
          border: 1px solid var(--border-solid); border-radius: 10px;
          display: flex; align-items: center; justify-content: center; margin-right: 1rem;
        }
        .prop-card.selected .prop-card__icon { background: var(--clay); color: white; border-color: var(--clay); }
        .prop-card__info { flex: 1; display: flex; flex-direction: column; }
        .prop-card__info strong { font-size: 0.95rem; font-weight: 700; }
        .prop-card__info span { font-size: 0.8rem; color: var(--text-muted); }
        .prop-card__radio {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--border-solid);
          display: flex; align-items: center; justify-content: center;
        }
        .prop-card.selected .prop-card__radio { border-color: var(--clay); }
        .prop-card.selected .radio-inner { width: 10px; height: 10px; background: var(--clay); border-radius: 50%; }

        .input-group { margin-bottom: 1.5rem; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .input-label { display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
        .input-wrap { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 1rem; color: var(--text-muted); pointer-events: none; }
        .input {
          width: 100%; padding: 1rem 1rem 1rem 3rem;
          border: 1px solid var(--border-solid); border-radius: 12px;
          background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.95rem; transition: all 0.2s;
        }
        .input:focus { outline: none; border-color: var(--clay); box-shadow: 0 0 0 3px rgba(var(--clay-rgb), 0.1); }
        .input-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 6px; }

        /* History section */
        .req-history {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 2rem 1.5rem;
          margin-top: 0;
        }
        @media (min-width: 768px) { .req-history { padding: 2.5rem; } }

        .req-history__header { margin-bottom: 1.5rem; }
        .req-history__title { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem; }
        .req-history__desc { font-size: 0.9rem; color: var(--text-muted); margin: 0; }

        /* Mobile cards */
        .req-history__list { display: flex; flex-direction: column; gap: 1rem; }
        .req-history__item {
          display: flex; align-items: center; padding: 1.25rem;
          background: var(--surface2); border-radius: 16px; border: 1px solid var(--border-solid);
        }
        .req-history__icon {
          width: 40px; height: 40px; background: rgba(var(--clay-rgb), 0.1); color: var(--clay);
          border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 1rem;
        }
        .req-history__icon--success { background: rgba(34,197,94,0.1); color: var(--success); }
        .req-history__info { flex: 1; display: flex; flex-direction: column; }
        .req-history__info strong { font-size: 0.95rem; font-weight: 700; }
        .req-history__info span { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .req-history__status {
          font-size: 0.75rem; font-weight: 700; padding: 4px 10px;
          border-radius: 20px; text-transform: uppercase;
        }
        .req-history__status--pending { background: rgba(245,158,11,0.1); color: var(--warning); }
        .req-history__status--completed { background: rgba(34,197,94,0.1); color: var(--success); }

        /* Desktop table */
        .req-history__table { display: none; }

        @media (min-width: 768px) {
          .req-history__list { display: none; }
          .req-history__table {
            display: table;
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .req-history__table th {
            text-align: left;
            padding: 0.75rem 1rem;
            font-size: 0.8rem;
            color: var(--text-muted);
            font-weight: 700;
            border-bottom: 2px solid var(--border-solid);
            white-space: nowrap;
          }
          .req-history__table th:nth-child(1) { width: 40%; }
          .req-history__table th:nth-child(2) { width: 20%; }
          .req-history__table th:nth-child(3) { width: 22%; }
          .req-history__table th:nth-child(4) { width: 18%; }

          .req-history__table td {
            padding: 1.25rem 1rem;
            border-bottom: 1px solid var(--border-solid);
            font-size: 0.9rem;
            vertical-align: middle;
          }
        }

        .td-company { display: flex; align-items: center; gap: 10px; }
        .td-company__icon {
          width: 32px; height: 32px; flex-shrink: 0;
          background: var(--surface2); border: 1px solid var(--border-solid);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
        }
        .td-company__text { display: flex; flex-direction: column; min-width: 0; }
        .td-company__text strong { font-size: 0.9rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .td-company__text span { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .td-date { font-size: 0.875rem; color: var(--text-secondary); white-space: nowrap; }

        .table-badge {
          display: inline-block;
          font-size: 0.7rem; font-weight: 800;
          padding: 4px 10px; border-radius: 20px; text-transform: uppercase; white-space: nowrap;
        }
        .table-badge--pending { background: rgba(245,158,11,0.1); color: var(--warning); }
        .table-badge--completed { background: rgba(34,197,94,0.1); color: var(--success); }

        .td-impact { font-size: 0.875rem; font-weight: 700; white-space: nowrap; }
        .td-impact--positive { color: var(--success); }
        .td-impact--pending { color: var(--text-muted); }

        .clickable-row { cursor: pointer; transition: background 0.2s; }
        .clickable-row:hover { background: var(--surface2); }

        .expanded-records-row td { padding: 0 !important; background: var(--surface2); border-bottom: none !important; }
        .ingested-records-list {
          padding: 1.5rem; border-left: 4px solid var(--clay);
          background: var(--bg); box-shadow: inset 0 2px 10px rgba(0,0,0,0.05);
        }
        .records-header {
          font-weight: 800; font-size: 13px; margin-bottom: 1rem;
          color: var(--text); text-transform: uppercase; letter-spacing: 0.05em;
        }
        .records-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .record-mini-card {
          padding: 12px; background: var(--surface);
          border: 1px solid var(--border-solid); border-radius: 12px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .record-mini-info { display: flex; flex-direction: column; }
        .record-mini-info .date { font-size: 11px; font-weight: 700; color: var(--text-muted); }
        .record-mini-info .amount { font-size: 13px; font-weight: 800; color: var(--text); }
        .record-mini-badge { font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 10px; text-transform: uppercase; }
        .record-mini-badge.on-time { background: rgba(34,197,94,0.1); color: var(--success); }
        .record-mini-badge.late { background: rgba(239,68,68,0.1); color: #ef4444; }
        .no-records-hint { font-size: 12px; color: var(--text-muted); font-style: italic; }

        .req-footer {
          margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;
          border-top: 1px solid var(--border-solid); padding-top: 1.5rem;
        }

        @media (max-width: 640px) {
          .grid-2 { grid-template-columns: 1fr; }
          .req-footer { flex-direction: column-reverse; }
          .req-footer .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  )
}