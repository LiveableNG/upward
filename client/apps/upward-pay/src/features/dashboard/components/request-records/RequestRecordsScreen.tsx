'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Plus,
  MapPin,
  Building,
  Phone,
  Mail,
  User,
  ShieldCheck,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { PayPageShell } from '../payment/PayPageShell'

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
      const cEmail =
        comp?.email || mang?.email || (prop as any).companyEmail || (prop as any).managerEmail || ''
      const cPhone =
        comp?.phone || mang?.phone || (prop as any).companyPhone || (prop as any).managerPhone || ''
      const cName =
        comp?.name ||
        (mang?.firstName ? `${mang.firstName} ${mang.lastName || ''}` : '') ||
        (prop as any).companyName ||
        (prop as any).managerName ||
        ''
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
        requestContactDetails: { ...formState },
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
      <PayPageShell
        title="Request Records"
        subtitle="Bring verified tenancy history into your credibility profile."
        showBack
        onBack={() => router.push('/dashboard')}
      >
        <div className="req-main">
          <div className="req-success">
            <CheckCircle size={64} className="text--green" />
            <h2 className="req-success__title">Request Sent!</h2>
            <p className="req-success__desc">
              We have sent a secure email request to your landlord or manager. Once records are
              submitted, your credibility profile and Upward Score will update automatically.
            </p>
            <button className="btn btn--primary req-success__btn" onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </PayPageShell>
    )
  }

  return (
    <PayPageShell
      title="Request Records"
      subtitle="Request verified past tenancy records to strengthen your profile."
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <div className="req-main">
        <div className="req-banner">
          <div className="req-banner__icon">
            <ShieldCheck size={24} />
          </div>
          <div className="req-banner__content">
            <h3>Boost Your Credibility Profile</h3>
            <p>
              Requesting and verifying past tenancy records adds trusted history to your profile,
              improves your Upward Score, and strengthens your reliability rating.
            </p>
          </div>
        </div>

        {history.length > 0 && !loadingHistory && (
          <div className="req-tabs-container">
            <div className="req-tabs">
              <button
                type="button"
                className={`req-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <Clock size={16} /> Past Requests
              </button>
              <button
                type="button"
                className={`req-tab ${activeTab === 'new' ? 'active' : ''}`}
                onClick={() => setActiveTab('new')}
              >
                <Plus size={16} /> Send New Request
              </button>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className="req-history__loading">
            <div className="spinner" />
            <p>Fetching your request history...</p>
          </div>
        ) : activeTab === 'new' ? (
          <div className="req-form animate-fade-in">
            <h2 className="req-form__title">Select Property Details</h2>
            <p className="req-form__desc">
              Enter the manager or landlord details we should notify.
            </p>

            {!hasProperties ? (
              <div className="req-empty-state">
                <div className="req-empty-icon">
                  <Building size={30} />
                </div>
                <h3>No Properties Linked</h3>
                <p>You need to add a property before requesting past tenancy records.</p>
                <button className="btn btn--primary" onClick={() => router.push('/dashboard/setup')}>
                  Add Your Property
                </button>
              </div>
            ) : (
              <div className="req-content">
                <div className="req-profile-selector animate-fade-in">
                  <label className="input-label">1. Select Property</label>
                  <div className="property-list">
                    {properties.map((prop, idx) => (
                      <div
                        key={idx}
                        className={`prop-card ${selectedPropertyIdx === idx ? 'selected' : ''}`}
                        onClick={() => setSelectedPropertyIdx(idx)}
                      >
                        <div className="prop-card__icon">
                          <Building size={18} />
                        </div>
                        <div className="prop-card__info">
                          <strong>{prop.location?.address || prop.location?.area || 'Address not listed'}</strong>
                          <span>
                            {(prop as any).company?.name ||
                              ((prop as any).manager?.firstName
                                ? `${(prop as any).manager.firstName} ${(prop as any).manager.lastName || ''}`
                                : '') ||
                              'Independent Landlord'}
                          </span>
                        </div>
                        <div className="prop-card__radio">
                          <div className="radio-inner" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="req-manual-form animate-fade-in">
                  <label className="input-label input-label--section">2. Confirm Contact Details</label>
                  <p className="input-hint input-hint--lead">
                    You can edit these for this request without changing your main profile data.
                  </p>

                  <div className="input-group">
                    <label className="input-label">Company or Manager Name</label>
                    <div className="input-wrap">
                      <Building size={18} className="input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. Haven Properties or John Doe"
                        className="input"
                        value={formState.companyName}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, companyName: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Email Address</label>
                      <div className="input-wrap">
                        <Mail size={18} className="input-icon" />
                        <input
                          type="email"
                          placeholder="manager@example.com"
                          className="input"
                          value={formState.email}
                          onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Phone Number</label>
                      <div className="input-wrap">
                        <Phone size={18} className="input-icon" />
                        <input
                          type="tel"
                          placeholder="0800 000 0000"
                          className="input"
                          value={formState.phone}
                          onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tenant Address shown on their side</label>
                    <div className="input-wrap">
                      <MapPin size={18} className="input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. 12 Adeola Odeku St, VI"
                        className="input"
                        value={formState.address}
                        onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Tenant Name known as (Optional Alias)</label>
                    <div className="input-wrap">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        placeholder="The exact name they know you by"
                        className="input"
                        value={formState.alias}
                        onChange={(e) => setFormState((prev) => ({ ...prev, alias: e.target.value }))}
                      />
                    </div>
                    <div className="input-hint">
                      If different from your profile name ({user?.firstName} {user?.lastName})
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="req-footer">
              <button className="btn btn--outline" onClick={() => router.push('/dashboard')}>Cancel</button>
              <button
                className="btn btn--primary"
                onClick={handleCreateRequest}
                disabled={loading || !hasProperties || (!formState.email && !formState.phone)}
              >
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
                    {req.status === 'CANCELLED' ? 'Rejected' : req.status}
                  </div>
                </div>
              ))}
            </div>

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
                          setExpandedReqs((prev) => ({ ...prev, [req.uuid]: !prev[req.uuid] }))
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
                      <td className="td-date">
                        {new Date(req.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={`table-badge table-badge--${req.status.toLowerCase()}`}>
                          {req.status === 'PENDING'
                            ? 'Awaiting Records'
                            : req.status === 'CANCELLED'
                              ? 'Declined'
                              : req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'COMPLETED' ? (
                          <span className="td-impact td-impact--positive">+ Score Boost</span>
                        ) : req.status === 'CANCELLED' ? (
                          <span className="td-impact td-impact--negative">No Impact</span>
                        ) : (
                          <span className="td-impact td-impact--pending">Pending Impact</span>
                        )}
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
                                      <span className="date">
                                        {new Date(rec.dueDate).toLocaleDateString('en-US', {
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </span>
                                      <span className="amount">{formatCurrency(rec.amount, 'NGN')}</span>
                                    </div>
                                    <div className={`record-mini-badge ${rec.isLate ? 'late' : 'on-time'}`}>
                                      {(() => {
                                        if (rec.paidAt && rec.dueDate) {
                                          const dueDate = new Date(rec.dueDate)
                                          const paidAt = new Date(rec.paidAt)
                                          const diffTime = dueDate.getTime() - paidAt.getTime()
                                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                                          if (!rec.isLate && diffDays > 0) return `${diffDays} days before due date`
                                          if (rec.isLate && diffDays < 0) return `${Math.abs(diffDays)} days after due date`
                                        }
                                        return rec.isLate ? 'Late' : 'On-Time'
                                      })()}
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
    </PayPageShell>
  )
}
