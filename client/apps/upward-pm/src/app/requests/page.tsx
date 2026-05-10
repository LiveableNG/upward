'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronRight, 
  Clock, 
  User, 
  MapPin, 
  FileText,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { format } from 'date-fns'


export default function RequestsPage() {
  const router = useRouter()
  const { data: requests = [], isLoading } = useCredibilityRequests()

  return (
    <div className="requests-page">
      <header className="requests-header">
        <div className="requests-header__content">
          <button 
            onClick={() => router.push('/dashboard')}
            className="requests-header__back"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1 className="requests-header__title">Record Requests</h1>
          <p className="requests-header__subtitle">Manage requests from tenants for their past payment records.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="requests-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="request-card" style={{ height: '100px', opacity: 0.5 }}>
              <div className="animate-pulse" style={{ width: '100%', height: '100%', background: 'var(--ivory-dim)', borderRadius: '12px' }}></div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="requests-empty">
          <div className="requests-empty__icon">
            <FileText size={32} />
          </div>
          <h2 className="requests-empty__title">No Pending Requests</h2>
          <p className="requests-empty__text">
            When tenants request their past tenancy and payment records, they will appear here for you to fulfill.
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((req) => (
            <div 
              key={req.uuid}
              onClick={() => router.push(`/requests/${req.uuid}`)}
              className="request-card"
            >
              <div className="request-card__main">
                <div className="request-card__icon">
                  <User size={24} />
                </div>
                <div className="request-card__info">
                  <h3 className="request-card__name">{req.tenantName}</h3>
                  <div className="request-card__meta">
                    <span className="request-card__meta-item">
                      <MapPin size={14} />
                      {req.propertyAddress}
                    </span>
                    <span className="request-card__meta-item">
                      <Clock size={14} />
                      Requested {format(new Date(req.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="request-card__status">
                <span className="badge badge--warning">
                  Pending
                </span>
                <ChevronRight size={20} className="request-card__chevron" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="requests-info">
        <div className="requests-info__icon">
          <AlertCircle size={20} />
        </div>
        <div className="requests-info__content">
          <h4 className="requests-info__title">How fulfillment works</h4>
          <p className="requests-info__text">
            Fulfilling a request helps your tenants build their **Upward Score**. You can either upload a CSV of their payment history or enter the records manually. Once submitted, the tenant's profile will be updated automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
