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
import { useProperties, useUnits } from '@/features/pm/hooks/useProperties'
import { useTenants } from '@/features/pm/hooks/useTenants'
import { usePaymentRequests, useResendPaymentRequest } from '@/features/pm/hooks/usePayments'
import { ActivityCarousel } from './ActivityCarousel'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { useToast } from '@/components/common/Toast'

export function DashboardView() {
  const router = useRouter()
  const toast = useToast()
  
  const { data: properties = [] } = useProperties()
  const { data: units = [] } = useUnits()
  const { data: tenants = [] } = useTenants()
  const { data: requests = [] } = usePaymentRequests()
  const resendMutation = useResendPaymentRequest()

  const [activeTab, setActiveTab] = useState<'arrears' | 'upcoming' | 'completed'>('arrears')

  const totalUnits = units.length
  const activeTenants = tenants.filter(t => t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED').length
  
  const pendingAmount = requests
    .filter(r => r.status !== 'PAID')
    .reduce((sum, r) => sum + (r.amount - r.amountPaid), 0)
    
  const totalRevenue = requests
    .reduce((sum, r) => sum + r.amountPaid, 0)

  const overduePayments = [...requests]
    .filter(r => (r.status === 'PENDING' || r.status === 'PARTIAL') && new Date(r.dueDate) < new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const upcomingPayments = [...requests]
    .filter(r => (r.status === 'PENDING' || r.status === 'PARTIAL') && new Date(r.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const completedPayments = [...requests]
    .filter(r => r.status === 'PAID')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  const getDaysAgo = (dateStr: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateStr).getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays === 1 ? '1 day overdue' : `${diffDays} days overdue`
  }

  const getDaysUntil = (dateStr: string) => {
    const diffTime = new Date(dateStr).getTime() - new Date().getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    return diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`
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
          </div>

          <div className="payments-tracker__actions">
            {type !== 'completed' && (
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
          trend={{ value: properties.length, label: 'Properties', isUp: true }}
          variant="accent"
        />
        <StatCard 
          label="Active Tenants" 
          value={activeTenants} 
          icon={Users} 
          trend={{ value: Math.round((activeTenants / (totalUnits || 1)) * 100), label: '% occupancy', isUp: true }}
        />
        <StatCard 
          label="Pending Balance" 
          value={`₦${pendingAmount.toLocaleString()}`} 
          icon={CreditCard} 
          trend={{ value: requests.filter(r => r.status !== 'PAID').length, label: 'open requests', isUp: false }}
        />
        <StatCard 
          label="Total Revenue" 
          value={`₦${totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend={{ value: 100, label: 'All time collection', isUp: true }}
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
                Behind on Rent
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
                Completed
                <span className="payments-tracker__count payments-tracker__count--completed">
                  {completedPayments.length}
                </span>
              </button>
            </div>
          </div>

          <div className="payments-tracker__list">
            {activeTab === 'arrears' && (
              <>
                {overduePayments.slice(0, 5).map((req) => renderPaymentItem(req, 'arrears'))}
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
                {upcomingPayments.slice(0, 5).map((req) => renderPaymentItem(req, 'upcoming'))}
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
                {completedPayments.slice(0, 5).map((req) => renderPaymentItem(req, 'completed'))}
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
            <button className="section-link" onClick={() => router.push('/properties')}>View All</button>
          </div>
          
          <div className="property-summary">
            {properties.slice(0, 3).map(prop => {
              const propUnits = units.filter(u => (u as any).propertyUuid === prop.uuid || u.propertyId === prop.id)
              const occupiedCount = propUnits.filter(u => u.status === 'OCCUPIED').length
              const rate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0
              
              return (
                <div key={prop.uuid} className="property-item-mini" onClick={() => router.push(`/properties`)} style={{ cursor: 'pointer' }}>
                  <div className="property-item-mini__info">
                    <h4>{prop.name}</h4>
                    <p>{prop.area}, {prop.state} • {propUnits.length} Units</p>
                  </div>
                  <div className={cn(
                    "property-item-mini__status",
                    rate === 100 ? "property-item-mini__status--full" : "property-item-mini__status--partial"
                  )}>
                    {rate}% Occupied
                  </div>
                </div>
              )
            })}
            {properties.length === 0 && (
              <div className="empty-state-mini">
                <MapPin size={32} className="text-muted" />
                <p>No properties added yet.</p>
                <button className="btn btn--secondary btn--sm" onClick={() => router.push('/properties')}>
                  Add Property
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

