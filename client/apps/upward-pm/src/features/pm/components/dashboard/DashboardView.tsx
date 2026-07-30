'use client'

import React, { useState, useEffect } from 'react'
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
  CheckCircle2,
  DoorOpen,
  DoorClosed,
  UserX,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboardSummary, useResendPaymentRequest } from '@/features/pm/hooks/usePayments'
import { ActivityCarousel } from './ActivityCarousel'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { useToast } from '@/components/common/Toast'
import { DashboardSkeleton } from '@/components/skeletons'
import { TenantNameDisplay } from '@/components/common/TenantNameDisplay'
import { CreatePaymentRequestModal } from '../payments/modals/CreatePaymentRequestModal'
import { ManagedAddPropertyModal } from '../properties/modals/ManagedAddPropertyModal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { formatTenantName } from '@/lib/utils'
import { DocumentEditorView } from '../documents/DocumentEditorView'
import { useSubscription } from '@/features/pm/hooks/useSubscription'
import { usePricingModal } from '@/features/pm/hooks/usePricingModal'
import { SuccessNotificationModal } from '../subscription/SuccessNotificationModal'

export function DashboardView({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  
  const [showSubSuccessModal, setShowSubSuccessModal] = useState(false)

  const resendMutation = useResendPaymentRequest()
  const { data: dashboardData, isLoading } = useDashboardSummary(initialData)
  const { subscription, wallet } = useSubscription()
  const { openPricing } = usePricingModal()

  const [activeTab, setActiveTab] = useState<'arrears' | 'upcoming' | 'completed'>('arrears')
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false)

  useEffect(() => {
    // Automatically pop up the pricing plans selector for new signup/unsubscribed users
    if (subscription && subscription.tier === 'FREE' && !subscription.isInitialDepositPaid) {
      openPricing()
    }
  }, [subscription])

  useEffect(() => {
    const subStatus = searchParams?.get('subscription')
    if (subStatus === 'activated') {
      setShowSubSuccessModal(true)
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [searchParams])

  useEffect(() => {
    if (dashboardData && !hasSetInitialTab) {
      if (dashboardData.overduePayments?.length > 0) setActiveTab('arrears')
      else if (dashboardData.upcomingPayments?.length > 0) setActiveTab('upcoming')
      else if (dashboardData.completedPayments?.length > 0) setActiveTab('completed')
      setHasSetInitialTab(true)
    }
  }, [dashboardData, hasSetInitialTab])

  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false)
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<any>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [paymentContext, setPaymentContext] = useState<any>(null)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)

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
    openRequestsCount = 0,
    vacantUnits = 0,
    occupiedUnits = 0,
    pendingInvites = 0
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

  const handleOpenPaymentRequest = (unit: any, tenant: any) => {
    setSelectedUnitForPayment({ ...unit, tenant })
    setShowPaymentRequestModal(true)
  }

  const handleProceedToEditor = (template: any, context: any) => {
    setEditingTemplate(template)
    setPaymentContext(context)
    setShowPaymentRequestModal(false)
    setShowEditor(true)
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
    const initials = (() => {
      if (!req.tenant) return 'U'
      const name = formatTenantName(req.tenant)
      if (!name || name.toLowerCase() === 'no tenant') return 'U'
      const parts = name.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name[0]?.toUpperCase() || 'U'
    })()
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
            <h4 className="payments-tracker__name">
              <TenantNameDisplay tenant={req.tenant} fallback="No Tenant" />
            </h4>
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
                    handleOpenPaymentRequest(req.unit, req.tenant)
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
                  router.push(isPortal ? `/portal/payments/view?uuid=${req.uuid}` : `/payments/view?uuid=${req.uuid}`)
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

  if (showEditor) {
    const tenant = selectedUnitForPayment?.tenant;
    return (
      <div className="container" style={{ padding: '40px' }}>
        <DocumentEditorView
          initialTemplate={editingTemplate}
          initialRecipient={tenant ? {
            type: 'existing',
            uuid: tenant.uuid,
            name: formatTenantName(tenant),
            email: tenant.email,
            deliveryMode: 'email'
          } : undefined}
          paymentContext={paymentContext}
          onBack={() => setShowEditor(false)}
        />
      </div>
    )
  }

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header-grid">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <PageHeader
            title="Welcome back!"
            subtitle="Here is what is happening with your property portfolio today."
          />
        </div>

        <div
          onClick={() => router.push('/subscription/wallet')}
          className="checkout-card"
          style={{
            padding: '24px 32px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid #E7E3DB',
            borderRadius: '24px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(26, 26, 23, 0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--forest, #166534)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 101, 52, 0.05)';
            const arrow = e.currentTarget.querySelector('.wallet-arrow') as HTMLSpanElement;
            if (arrow) arrow.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E7E3DB';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 26, 23, 0.02)';
            const arrow = e.currentTarget.querySelector('.wallet-arrow') as HTMLSpanElement;
            if (arrow) arrow.style.transform = 'translateX(0)';
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8A857F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Company Wallet
              </span>
            </div>

            <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A17' }}>
              ₦{(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div style={{ fontSize: 11, color: '#5D5954', marginTop: 4, fontWeight: 500 }}>
              Available Balance
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderTop: '1px solid #F2F1EB', paddingTop: 12 }}>
            <span style={{ fontSize: 11, color: '#8A857F', fontWeight: 600 }}>
              Available for subscriptions
            </span>
            <span className="wallet-arrow" style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest, #166534)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 4 }}>
              View Wallet <span style={{ transition: 'transform 0.2s ease', display: 'inline-block' }}>→</span>
            </span>
          </div>
        </div>
      </div>

      <ActivityCarousel />



      <div className="dashboard__content">
        {/* Left Column: Rent Payments Tracker (2fr) */}
        <section className="payments-tracker">
          <div className="payments-tracker__header">
            <div className="payments-tracker__title-group">
              <h2 className="payments-tracker__title">Rent Payments Overview</h2>
              <p className="payments-tracker__subtitle">Monitor collections, outstanding balances, and arrears.</p>
            </div>

            <div className="payments-tracker__filter">
              <FormSelect
                triggerClassName="payments-tracker__select"
                inline={true}
                value={activeTab}
                onChange={(val) => setActiveTab(val as any)}
                options={[
                  { label: `Arrears (${overduePayments.length})`, value: 'arrears' },
                  { label: `Upcoming (${upcomingPayments.length})`, value: 'upcoming' },
                  { label: `Paid (${completedPayments.length})`, value: 'completed' }
                ]}
              />
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
                    onClick={() => router.push('/properties?tab=units&dueFilter=passed')}
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
                    onClick={() => router.push('/properties?tab=units&dueFilter=30days')}
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
                    onClick={() => router.push('/properties?tab=units&paymentFilter=paid')}
                  >
                    View All Completed ({completedPayments.length})
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <CreatePaymentRequestModal
        isOpen={showPaymentRequestModal}
        onClose={() => setShowPaymentRequestModal(false)}
        unit={selectedUnitForPayment}
        onProceedToEditor={handleProceedToEditor}
      />
      <ManagedAddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
      />
      <SuccessNotificationModal
        isOpen={showSubSuccessModal}
        onClose={() => setShowSubSuccessModal(false)}
        title="Subscription Activated! 🎉"
        message={
          <>
            Your professional plan subscription has been activated successfully.<br />
            Welcome to Upward!
          </>
        }
      />
    </div>
  )
}

