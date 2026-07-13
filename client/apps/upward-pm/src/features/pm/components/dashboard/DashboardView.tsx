'use client'

import React, { useState } from 'react'
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  PlusCircle,
  ShieldCheck,
  MapPin,
  Calendar,
  Bell,
  Copy,
  ExternalLink,
  CheckCircle2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDashboardSummary, useResendPaymentRequest } from '@/features/pm/hooks/usePayments'
import { ActivityCarousel } from './ActivityCarousel'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { useToast } from '@/components/common/Toast'
import { DashboardSkeleton } from '@/components/skeletons'

export function DashboardView() {
  const router = useRouter()
  const toast = useToast()
  
  const resendMutation = useResendPaymentRequest()
  const { data: dashboardData, isLoading } = useDashboardSummary()
  const [activeTab, setActiveTab] = useState<'arrears' | 'upcoming' | 'completed'>('arrears')

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const {
    totalUnits = 0,
    activeTenants = 0,
    pendingBalance = 0,
    totalRevenue = 0,
    overduePayments = [],
    upcomingPayments = [],
    completedPayments = [],
    properties = [],
    propertiesCount = 0,
    hasProperties = false,
    openRequestsCount = 0
  } = dashboardData || {}

  const pendingAmount = pendingBalance
  const totalRevenueVal = totalRevenue // Keep variable reference clear if totalRevenue is reused
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  const getDaysAgo = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(dateStr)
    dueDate.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Due today'
    return diffDays === 1 ? '1 day overdue' : `${diffDays} days overdue`
  }

  const getDaysUntil = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(dateStr)
    dueDate.setHours(0, 0, 0, 0)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  const handleCopyLink = (req: any) => {
    if (!req.coreRequestUuid) {
      return toast.error('Payment link not available for this request')
    }
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const link = `${baseUrl}/pay/${req.coreRequestUuid}`
    navigator.clipboard.writeText(link)
    toast.success('Payment link copied to clipboard!')
  }

  const handleSendReminder = (req: any) => {
    resendMutation.mutate({ uuid: req.uuid }, {
      onSuccess: () => {
        toast.success('Payment reminder sent to tenant!')
      },
      onError: (err: any) => {
        toast.error(err?.message || 'Failed to send payment reminder.')
      }
    })
  }

  const renderEmptyState = (type: 'arrears' | 'upcoming' | 'completed') => {
    let message = ''
    if (type === 'arrears') message = 'No tenants are behind on rent. Excellent!'
    else if (type === 'upcoming') message = 'No upcoming rent payments scheduled.'
    else message = 'No completed payments recorded yet.'
    
    return (
      <div className="payments-tracker__empty">
        <ShieldCheck size={36} className="text-muted" style={{ strokeWidth: 1.5 }} />
        <p>{message}</p>
      </div>
    )
  }

  const renderPaymentItem = (req: any, type: 'arrears' | 'upcoming' | 'completed') => {
    const tenantName = req.tenant ? `${req.tenant.firstName} ${req.tenant.lastName}` : 'No Tenant'
    const initials = req.tenant ? `${req.tenant.firstName?.[0] || ''}${req.tenant.lastName?.[0] || ''}` : 'U'
    const propertyName = req.unit?.property?.name || 'N/A'
    const unitName = req.unit?.unitName || 'N/A'
    const isUnbilled = req.isUnbilled
    
    return (
      <div 
        key={req.uuid} 
        className={cn(
          "payments-tracker__item",
          `payments-tracker__item--${type}`
        )}
      >
        <div className="payments-tracker__tenant-info">
          <div className={cn("payments-tracker__avatar", `payments-tracker__avatar--${type}`)}>
            {initials}
          </div>
          <div className="payments-tracker__meta">
            <h4 className="payments-tracker__name">{tenantName}</h4>
            <p className="payments-tracker__details">{propertyName} • Unit {unitName}</p>
          </div>
        </div>

        <div className="payments-tracker__middle">
          <div className="payments-tracker__date-info">
            {type === 'completed' ? (
              <>
                <CheckCircle2 size={12} className="text-success" />
                <span>Paid Date: {formatDate(req.updatedAt || req.createdAt)}</span>
              </>
            ) : (
              <>
                <Calendar size={12} />
                <span>Due Date: {formatDate(req.dueDate)}</span>
              </>
            )}
          </div>
          <span className={cn(
            "payments-tracker__days",
            type === 'arrears' && "payments-tracker__days--overdue",
            type === 'upcoming' && "payments-tracker__days--upcoming",
            type === 'completed' && "payments-tracker__days--completed"
          )}>
            {type === 'arrears' && getDaysAgo(req.dueDate)}
            {type === 'upcoming' && getDaysUntil(req.dueDate)}
            {type === 'completed' && 'Payment completed'}
          </span>
        </div>

        <div className="payments-tracker__right">
          <div className="payments-tracker__financials">
            <span className="payments-tracker__amount">
              ₦{req.amount.toLocaleString()}
            </span>
            {req.status === 'PARTIAL' && (
              <span className="payments-tracker__status status-chip status-chip--partial status-chip--sm">
                Partial: ₦{req.amountPaid.toLocaleString()} paid
              </span>
            )}
            {req.status === 'PENDING' && (
              <span className="payments-tracker__status status-chip status-chip--pending status-chip--sm">
                Pending
              </span>
            )}
            {req.status === 'PAID' && (
              <span className="payments-tracker__status status-chip status-chip--paid status-chip--sm">
                Paid
              </span>
            )}
            {req.status === 'UNBILLED' && (
              <span className="payments-tracker__status status-chip status-chip--pending status-chip--sm" style={{ background: '#fef3c7', color: '#d97706' }}>
                Unbilled
              </span>
            )}
          </div>

          <div className="payments-tracker__actions">
            {type !== 'completed' && !isUnbilled && (
              <>
                <button 
                  className="payments-tracker__action-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSendReminder(req)
                  }}
                  disabled={resendMutation.isPending}
                  title="Send Reminder Email"
                >
                  <Bell size={14} />
                </button>
                <button 
                  className="payments-tracker__action-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyLink(req)
                  }}
                  title="Copy Pay Link"
                >
                  <Copy size={14} />
                </button>
              </>
            )}
            {isUnbilled ? (
              <>
                <button 
                  className="btn btn--primary btn--sm"
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8, height: 28, whiteSpace: 'nowrap' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/properties?tab=units&search=${req.unit?.unitName}`)
                  }}
                  title="Create Payment Request"
                >
                  Request Payment
                </button>
                <button 
                  className="payments-tracker__action-btn"
                  onClick={() => {
                    router.push(`/properties/units/${req.uuid}`)
                  }}
                  title="View Unit Details"
                >
                  <ExternalLink size={14} />
                </button>
              </>
            ) : (
              <button 
                className="payments-tracker__action-btn"
                onClick={() => {
                  const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')
                  router.push(isPortal ? `/portal/payments/${req.uuid}` : `/payments/${req.uuid}`)
                }}
                title="View Request Details"
              >
                <ExternalLink size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard animate-fade-in">
      <PageHeader 
        title={`Welcome back!`}
        subtitle="Here is what is happening with your properties today."
        actions={
          <button className="btn btn--primary" onClick={() => router.push('/properties')}>
            <PlusCircle size={18} /> Add Property
          </button>
        }
      />

      <ActivityCarousel />

      <StatGrid>
        <StatCard 
          label="Total Units" 
          value={totalUnits} 
          icon={Building2} 
          variant="accent"
        />
        <StatCard 
          label="Total Tenants" 
          value={activeTenants} 
          icon={Users} 
        />
        <StatCard 
          label="Pending Balance" 
          value={`₦${pendingAmount.toLocaleString()}`} 
          icon={CreditCard} 
        />
        <StatCard 
          label="Total Revenue" 
          value={`₦${totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
        />
      </StatGrid>

      <div className="dashboard__content">
        {/* Left Column: Rent Payments Tracker (2fr) */}
        <section className="payments-tracker">
          <div className="payments-tracker__header">
            <div className="payments-tracker__title-group">
              <h2 className="payments-tracker__title">Rent Payments Overview</h2>
              <p className="payments-tracker__subtitle">Monitor collections, outstanding balances, and arrears.</p>
            </div>
            
            <div className="payments-tracker__tabs">
              <button 
                className={cn(
                  "payments-tracker__tab-btn",
                  activeTab === 'arrears' && "payments-tracker__tab-btn--active"
                )}
                onClick={() => setActiveTab('arrears')}
              >
                Arrears
                <span className="payments-tracker__count payments-tracker__count--arrears">
                  {overduePayments.length}
                </span>
              </button>
              <button 
                className={cn(
                  "payments-tracker__tab-btn",
                  activeTab === 'upcoming' && "payments-tracker__tab-btn--active"
                )}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming
                <span className="payments-tracker__count payments-tracker__count--upcoming">
                  {upcomingPayments.length}
                </span>
              </button>
              <button 
                className={cn(
                  "payments-tracker__tab-btn",
                  activeTab === 'completed' && "payments-tracker__tab-btn--active"
                )}
                onClick={() => setActiveTab('completed')}
              >
                Paid
                <span className="payments-tracker__count payments-tracker__count--completed">
                  {completedPayments.length}
                </span>
              </button>
            </div>
          </div>

          <div className="payments-tracker__list">
            {activeTab === 'arrears' && (
              <>
                {overduePayments.slice(0, 5).map((req: any) => renderPaymentItem(req, 'arrears'))}
                {overduePayments.length === 0 && renderEmptyState('arrears')}
                {overduePayments.length > 5 && (
                  <button 
                    className="btn btn--secondary btn--sm payments-tracker__view-all"
                    onClick={() => router.push('/payments?status=OVERDUE')}
                  >
                    View All Arrears ({overduePayments.length})
                  </button>
                )}
              </>
            )}

            {activeTab === 'upcoming' && (
              <>
                {upcomingPayments.slice(0, 5).map((req: any) => renderPaymentItem(req, 'upcoming'))}
                {upcomingPayments.length === 0 && renderEmptyState('upcoming')}
                {upcomingPayments.length > 5 && (
                  <button 
                    className="btn btn--secondary btn--sm payments-tracker__view-all"
                    onClick={() => router.push('/payments?status=PENDING')}
                  >
                    View All Upcoming ({upcomingPayments.length})
                  </button>
                )}
              </>
            )}

            {activeTab === 'completed' && (
              <>
                {completedPayments.slice(0, 5).map((req: any) => renderPaymentItem(req, 'completed'))}
                {completedPayments.length === 0 && renderEmptyState('completed')}
                {completedPayments.length > 5 && (
                  <button 
                    className="btn btn--secondary btn--sm payments-tracker__view-all"
                    onClick={() => router.push('/payments?status=PAID')}
                  >
                    View All Completed ({completedPayments.length})
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2 className="section-title">Property Portfolio</h2>
          </div>
          
          <div className="property-summary">
            {properties.map((prop: any) => {
              return (
                <div key={prop.uuid} className="property-item-mini" onClick={() => router.push(`/properties`)} style={{ cursor: 'pointer' }}>
                  <div className="property-item-mini__icon">
                    <Building2 size={20} className="text-forest" />
                  </div>
                  <div className="property-item-mini__info">
                    <h4>{prop.name}</h4>
                    <p>{prop.area}, {prop.state} • {prop.totalUnits} Units</p>
                  </div>
                  <div className="property-item-mini__action">
                    <ArrowUpRight size={18} className="text-muted" />
                  </div>
                </div>
              )
            })}
            {!hasProperties && (
              <div className="empty-state-mini">
                <MapPin size={32} className="text-muted" />
                <p>No properties added yet.</p>
                <button className="btn btn--secondary btn--sm" onClick={() => router.push('/properties')}>
                  Add Property
                </button>
              </div>
            )}
            {hasProperties && properties.length > 0 && (
              <button 
                className="btn btn--secondary btn--sm" 
                style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} 
                onClick={() => router.push('/properties')}
              >
                View All Properties
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

