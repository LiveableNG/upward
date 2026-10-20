'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Check,
  XCircle,
  Building,
  MapPin,
  Calendar,
  LogIn,
  ArrowRight,
  ShieldCheck,
  Receipt,
  ArrowLeft,
  FileText,
  Loader2,
  LogOut,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, generateId } from '@/lib/utils'
import { calculateRentEndDate } from '@/features/pm/utils/rentalDates'

export interface RentRecordEntry {
  id: string
  amount: number | ''
  expectedAmount?: number | ''
  isPartial?: boolean
  paymentDate: string
  periodStart: string
  periodEnd: string
  dueDate: string
  notes: string
}

interface RecordFulfillmentViewProps {
  uuid: string
  isPublic?: boolean
}

export function RecordFulfillmentView({ uuid, isPublic = false }: RecordFulfillmentViewProps) {
  const router = useRouter()
  const { success, error } = useToast()
  const { user, isLoggedIn, logout } = useAuth()

  const [requestDetails, setRequestDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [previewRecords, setPreviewRecords] = useState<RentRecordEntry[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchDetails = async () => {
      try {
        setLoading(true)
        setLoadError(false)
        const res = await api.get(`/public/credibility/request/${uuid}`)
        if (!isMounted) return
        setRequestDetails(res)

        // Initialize with one clean record pre-filled with the expected rent amount if active
        if (res?.status === 'PENDING') {
          setPreviewRecords([
            {
              id: generateId('rec'),
              amount: res?.rentAmount ? Number(res.rentAmount) : '',
              expectedAmount: res?.rentAmount ? Number(res.rentAmount) : '',
              isPartial: false,
              paymentDate: '',
              periodStart: '',
              periodEnd: '',
              dueDate: '',
              notes: '',
            },
          ])
        }
      } catch (err: any) {
        if (!isMounted) return
        setLoadError(true)
        error(err?.message || 'Failed to load request details.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (uuid) {
      fetchDetails()
    } else {
      setLoading(false)
      setLoadError(true)
    }

    return () => {
      isMounted = false
    }
  }, [uuid])

  // Field update handler - automatically calculates period end and autofills due date from period start
  const updateRecordField = (id: string, field: keyof RentRecordEntry, value: any) => {
    setPreviewRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec
        const updated = { ...rec, [field]: value }

        // Automatically calculate period end and autofill due date when period start is entered or changed
        if (field === 'periodStart' && value) {
          const computedEnd = calculateRentEndDate(value, requestDetails?.rentType || 'Annually')
          if (computedEnd) {
            updated.periodEnd = computedEnd
          }
          if (!rec.dueDate || rec.dueDate === rec.periodStart) {
            updated.dueDate = value
          }
        }

        return updated
      }),
    )

    // Clear inline validation error for this field
    const errorKey = `${id}-${String(field)}`
    if (validationErrors[errorKey]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[errorKey]
        if (field === 'periodStart') {
          delete next[`${id}-periodEnd`]
        }
        if (field === 'amount' || field === 'expectedAmount') {
          delete next[`${id}-amount`]
          delete next[`${id}-expectedAmount`]
        }
        return next
      })
    }
  }

  // Add a new empty record
  const handleAddRecord = () => {
    const newRecord: RentRecordEntry = {
      id: generateId('rec'),
      amount: requestDetails?.rentAmount ? Number(requestDetails.rentAmount) : '',
      expectedAmount: requestDetails?.rentAmount ? Number(requestDetails.rentAmount) : '',
      isPartial: false,
      paymentDate: '',
      periodStart: '',
      periodEnd: '',
      dueDate: '',
      notes: '',
    }
    setPreviewRecords((prev) => [...prev, newRecord])
  }

  // Remove a record
  const handleRemoveRecord = (id: string) => {
    setPreviewRecords((prev) => prev.filter((r) => r.id !== id))
    // Clear any errors associated with this record
    setValidationErrors((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${id}-`)) delete next[k]
      })
      return next
    })
  }

  // Validate all records before submitting
  const validateRecords = (): boolean => {
    const errors: Record<string, string> = {}

    if (previewRecords.length === 0) {
      error('Please add at least one past rent record.')
      return false
    }

    previewRecords.forEach((record, index) => {
      if (!record.amount || Number(record.amount) <= 0) {
        errors[`${record.id}-amount`] = 'Amount is required'
      }

      if (record.isPartial) {
        if (!record.expectedAmount || Number(record.expectedAmount) <= 0) {
          errors[`${record.id}-expectedAmount`] = 'Agreed rent is required for partial payment'
        } else if (Number(record.amount) > Number(record.expectedAmount)) {
          errors[`${record.id}-amount`] = 'Amount paid exceeds agreed rent'
        }
      }

      if (!record.paymentDate) {
        errors[`${record.id}-paymentDate`] = 'Payment date is required'
      }

      if (record.periodStart && record.periodEnd) {
        if (new Date(record.periodEnd) < new Date(record.periodStart)) {
          errors[`${record.id}-periodEnd`] = 'Period end cannot be before start'
        }
      }
    })

    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      error('Please complete all required fields on each record.')
      return false
    }

    return true
  }

  // Submit records
  const handleSubmitRecords = async () => {
    if (!validateRecords()) return

    setSubmitting(true)
    try {
      const payload = {
        records: previewRecords.map((r) => ({
          amount: Number(r.amount),
          expectedAmount:
            r.isPartial && r.expectedAmount !== '' ? Number(r.expectedAmount) : Number(r.amount),
          isPartial: Boolean(r.isPartial),
          paymentDate: r.paymentDate,
          paidDate: r.paymentDate,
          dueDate: r.dueDate || r.periodStart || r.paymentDate,
          periodStart: r.periodStart || undefined,
          periodEnd: r.periodEnd || undefined,
          notes: r.notes?.trim() || undefined,
        })),
      }

      await api.post(`/public/credibility/request/${uuid}/fulfill`, payload)
      success('Records submitted successfully!')
      setShowSuccess(true)
      setRequestDetails((prev: any) => ({ ...prev, status: 'COMPLETED' }))
    } catch (err: any) {
      error(err?.response?.data?.message || err?.message || 'Failed to submit records.')
    } finally {
      setSubmitting(false)
    }
  }

  // Decline request
  const handleConfirmDecline = async () => {
    setDeclining(true)
    try {
      await api.post(`/public/credibility/request/${uuid}/reject`, {})
      success('Request declined.')
      setIsDeclineModalOpen(false)
      setRequestDetails((prev: any) => ({ ...prev, status: 'CANCELLED' }))
    } catch (err: any) {
      error(err?.response?.data?.message || err?.message || 'Failed to decline request.')
    } finally {
      setDeclining(false)
    }
  }

  // Authenticated-only: Mark as done
  const handleMarkAsDone = async () => {
    setSubmitting(true)
    try {
      await api.patch(`/pm/credibility-requests/${uuid}/done`)
      success('Request marked as done.')
      setShowSuccess(true)
      setRequestDetails((prev: any) => ({ ...prev, status: 'DONE' }))
    } catch (err: any) {
      error(err?.response?.data?.message || err?.message || 'Failed to mark request as done.')
    } finally {
      setSubmitting(false)
    }
  }

  // Account matching detection
  const requestEmail = requestDetails?.email?.trim().toLowerCase()
  const userEmail = user?.email?.trim().toLowerCase()
  const userDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.businessName || user?.email || ''
  const isEmailMismatch = Boolean(
    isLoggedIn && userEmail && requestEmail && userEmail !== requestEmail,
  )
  const isEmailMatch = Boolean(
    isLoggedIn && userEmail && (!requestEmail || userEmail === requestEmail),
  )

  // Seamless redirect to authenticated dashboard when the logged in PM matches the recipient
  useEffect(() => {
    if (isPublic && isEmailMatch && !loading && requestDetails) {
      router.replace(`/requests/${uuid}`)
    }
  }, [isPublic, isEmailMatch, loading, requestDetails, uuid, router])

  // Navigation URLs
  const loginRedirectPath = isPublic ? `/public/requests/${uuid}` : `/requests/${uuid}`
  const pmLoginUrl = Capacitor.isNativePlatform()
    ? '/login'
    : `/pm-login?redirect=${encodeURIComponent(loginRedirectPath)}${
        requestDetails?.email ? `&email=${encodeURIComponent(requestDetails.email)}` : ''
      }`
  const exploreUrl = Capacitor.isNativePlatform() ? '/signup' : '/pm-signup'

  // Account Switching Handlers
  const handleSwitchToTargetAccount = async () => {
    setIsSwitchingAccount(true)
    try {
      const targetUrl = Capacitor.isNativePlatform()
        ? `/login?redirect=${encodeURIComponent(`/requests/${uuid}`)}`
        : `/pm-login?redirect=${encodeURIComponent(`/requests/${uuid}`)}${
            requestDetails?.email ? `&email=${encodeURIComponent(requestDetails.email)}` : ''
          }`
      await logout({ redirectTo: targetUrl })
    } catch (err: any) {
      error(err?.message || 'Failed to switch account.')
      setIsSwitchingAccount(false)
    }
  }

  const handleSignOutAndContinueGuest = async () => {
    setIsSwitchingAccount(true)
    try {
      await logout({ redirectTo: null })
      success('Signed out. You can now complete this request as a guest.')
    } catch (err: any) {
      error(err?.message || 'Failed to sign out.')
    } finally {
      setIsSwitchingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="public-fulfillment">
        <div className="public-fulfillment__container public-fulfillment-skeleton">
          <div className="public-fulfillment__header">
            <div className="skeleton-pulse" style={{ width: 140, height: 32 }} />
            <div
              className="skeleton-pulse"
              style={{ width: 120, height: 24, borderRadius: 9999 }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div
              className="skeleton-pulse"
              style={{ width: '60%', height: 32, marginBottom: 12 }}
            />
            <div className="skeleton-pulse" style={{ width: '85%', height: 18 }} />
          </div>

          <div className="public-fulfillment__context">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div className="skeleton-pulse" style={{ width: 48, height: 48, borderRadius: 12 }} />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton-pulse"
                  style={{ width: 180, height: 20, marginBottom: 8 }}
                />
                <div className="skeleton-pulse" style={{ width: 120, height: 14 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="skeleton-pulse" style={{ height: 40 }} />
              <div className="skeleton-pulse" style={{ height: 40 }} />
            </div>
          </div>

          <div className="record-entry-card" style={{ marginBottom: 16 }}>
            <div className="skeleton-pulse" style={{ height: 32, marginBottom: 20 }} />
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            >
              <div className="skeleton-pulse" style={{ height: 56 }} />
              <div className="skeleton-pulse" style={{ height: 56 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="skeleton-pulse" style={{ height: 56 }} />
              <div className="skeleton-pulse" style={{ height: 56 }} />
              <div className="skeleton-pulse" style={{ height: 56 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // State: Invalid / Expired / 404
  // =========================================================================
  if (loadError || !requestDetails) {
    return (
      <div className="public-fulfillment">
        <div className="public-fulfillment__container">
          {/* Header */}
          <header className="public-fulfillment__header">
            <div className="public-fulfillment__brand">
              <UpwardLogo size={32} color="var(--forest)" />
              <span className="public-fulfillment__brand-name">Upward</span>
            </div>
          </header>

          <div className="public-fulfillment__status-card">
            <div className="public-fulfillment__status-icon public-fulfillment__status-icon--warning">
              <AlertCircle size={36} />
            </div>
            <h1 className="public-fulfillment__status-title">Request Not Found or Expired</h1>
            <p className="public-fulfillment__status-desc">
              This verification link is invalid, has expired, or may have been removed. If you
              believe this is an error, please ask your tenant to generate a new request from
              Upward.
            </p>
            <div className="public-fulfillment__status-actions">
              <button
                type="button"
                className="btn btn--primary public-fulfillment__status-btn public-fulfillment__status-btn--primary"
                onClick={() => router.push(Capacitor.isNativePlatform() ? '/login' : '/pm-login')}
              >
                Go to Upward PM
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // State: Fresh Submission Success
  // =========================================================================
  if (showSuccess) {
    const tenantFullName =
      `${requestDetails.user?.firstName || ''} ${requestDetails.user?.lastName || ''}`.trim() ||
      'Tenant'
    return (
      <div className="public-fulfillment">
        <div className="public-fulfillment__container">
          <header className="public-fulfillment__header">
            <div className="public-fulfillment__brand">
              <UpwardLogo size={32} color="var(--forest)" />
              <span className="public-fulfillment__brand-name">Upward</span>
            </div>
            <div className="public-fulfillment__tag">Verification Complete</div>
          </header>

          <div className="public-fulfillment__status-card">
            <div className="public-fulfillment__status-icon public-fulfillment__status-icon--success">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="public-fulfillment__status-title">Records Submitted Successfully</h1>
            <p className="public-fulfillment__status-desc">
              Thank you for providing the tenant's past rent records. Your response has been
              received and securely updated on Upward.
            </p>

            <div className="public-fulfillment__recap-box">
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Tenant</span>
                <span className="public-fulfillment__recap-val">{tenantFullName}</span>
              </div>
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Property</span>
                <span className="public-fulfillment__recap-val">
                  {requestDetails.propertyAddress}
                </span>
              </div>
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Verified Records</span>
                <span className="public-fulfillment__recap-val">
                  {previewRecords.length} {previewRecords.length === 1 ? 'record' : 'records'}
                </span>
              </div>
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Status</span>
                <span className="public-fulfillment__recap-badge public-fulfillment__recap-badge--verified">
                  <Check size={12} strokeWidth={2.5} />
                  Verified
                </span>
              </div>
            </div>

            {isEmailMismatch ? (
              <div
                className="public-fulfillment__account-banner public-fulfillment__account-banner--mismatch"
                style={{ textAlign: 'left', marginTop: 24, width: '100%' }}
              >
                <div className="public-fulfillment__account-banner-header">
                  <div className="public-fulfillment__account-banner-icon public-fulfillment__account-banner-icon--warning">
                    <AlertCircle size={20} />
                  </div>
                  <div className="public-fulfillment__account-banner-text">
                    <span className="public-fulfillment__account-banner-badge">
                      Different Account Logged In
                    </span>
                    <h3 className="public-fulfillment__account-banner-title">
                      You fulfilled this as {user?.email}
                    </h3>
                    <p className="public-fulfillment__account-banner-desc">
                      This request was originally sent to <strong>{requestDetails.email}</strong>.
                      Would you like to switch to that account on Upward?
                    </p>
                  </div>
                </div>
                <div className="public-fulfillment__account-banner-actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={isSwitchingAccount}
                    onClick={handleSwitchToTargetAccount}
                  >
                    {isSwitchingAccount ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Switching account...
                      </>
                    ) : (
                      <>
                        <LogIn size={14} /> Switch to {requestDetails.email}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    disabled={isSwitchingAccount}
                    onClick={handleSignOutAndContinueGuest}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            ) : isPublic ? (
              <div className="public-fulfillment__status-actions">
                <button
                  type="button"
                  className="btn btn--primary public-fulfillment__status-btn public-fulfillment__status-btn--primary"
                  onClick={() => router.push(exploreUrl)}
                >
                  Explore Upward PM <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  className="btn btn--secondary public-fulfillment__status-btn public-fulfillment__status-btn--secondary"
                  onClick={() => router.push(pmLoginUrl)}
                >
                  <LogIn size={15} /> Log in to PM Portal
                </button>
              </div>
            ) : (
              <div className="public-fulfillment__status-actions">
                <button
                  type="button"
                  className="btn btn--primary public-fulfillment__status-btn public-fulfillment__status-btn--primary"
                  onClick={() => router.push('/requests')}
                >
                  Back to Requests Hub
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // State: Previously Completed / Resolved Request
  // =========================================================================
  if (requestDetails.status === 'COMPLETED' || requestDetails.status === 'DONE') {
    return (
      <div className="public-fulfillment">
        <div className="public-fulfillment__container">
          <header className="public-fulfillment__header">
            <div className="public-fulfillment__brand">
              <UpwardLogo size={32} color="var(--forest)" />
              <span className="public-fulfillment__brand-name">Upward</span>
            </div>
            <div className="public-fulfillment__tag">Request Resolved</div>
          </header>

          <div className="public-fulfillment__status-card">
            <div className="public-fulfillment__status-icon public-fulfillment__status-icon--info">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="public-fulfillment__status-title">Request Already Fulfilled</h1>
            <p className="public-fulfillment__status-desc">
              The past rent records for this request have already been submitted and verified. No
              further action is required.
            </p>

            <div className="public-fulfillment__recap-box">
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Tenant</span>
                <span className="public-fulfillment__recap-val">
                  {requestDetails.user?.firstName} {requestDetails.user?.lastName}
                </span>
              </div>
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Property</span>
                <span className="public-fulfillment__recap-val">
                  {requestDetails.propertyAddress}
                </span>
              </div>
              <div className="public-fulfillment__recap-row">
                <span className="public-fulfillment__recap-label">Current Status</span>
                <span className="public-fulfillment__recap-badge public-fulfillment__recap-badge--verified">
                  <Check size={12} strokeWidth={2.5} />
                  Fulfilled
                </span>
              </div>
            </div>

            <div className="public-fulfillment__status-actions">
              {isPublic ? (
                <button
                  type="button"
                  className="btn btn--primary public-fulfillment__status-btn public-fulfillment__status-btn--primary"
                  onClick={() => router.push(pmLoginUrl)}
                >
                  <LogIn size={15} /> Log in to PM Portal
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary public-fulfillment__status-btn public-fulfillment__status-btn--primary"
                  onClick={() => router.push('/requests')}
                >
                  Back to Requests
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // State: Declined / Cancelled Request
  // =========================================================================
  if (requestDetails.status === 'CANCELLED') {
    return (
      <div className="public-fulfillment">
        <div className="public-fulfillment__container">
          <header className="public-fulfillment__header">
            <div className="public-fulfillment__brand">
              <UpwardLogo size={32} color="var(--forest)" />
              <span className="public-fulfillment__brand-name">Upward</span>
            </div>
            <div className="public-fulfillment__tag">Request Declined</div>
          </header>

          <div className="public-fulfillment__status-card">
            <div className="public-fulfillment__status-icon public-fulfillment__status-icon--warning">
              <XCircle size={40} />
            </div>
            <h1 className="public-fulfillment__status-title">Request Declined</h1>
            <p className="public-fulfillment__status-desc">
              This verification request was declined. The tenant has been notified that rent records
              could not be verified.
            </p>
            <div className="public-fulfillment__status-actions">
              <button
                type="button"
                className="btn btn--primary public-fulfillment__status-btn public-fulfillment__status-btn--primary"
                onClick={() => router.push(isPublic ? pmLoginUrl : '/requests')}
              >
                {isPublic ? 'Log in to PM Portal' : 'Back to Requests'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // Active Form State
  // =========================================================================
  const tenantInitials =
    `${requestDetails.user?.firstName?.[0] || ''}${requestDetails.user?.lastName?.[0] || ''}`.toUpperCase() ||
    'T'
  const tenantFullName =
    `${requestDetails.user?.firstName || ''} ${requestDetails.user?.lastName || ''}`.trim() ||
    'Tenant'

  const formattedRequestedDate = requestDetails.requestedAt
    ? new Date(requestDetails.requestedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent'

  const rentContext = requestDetails.rentAmount
    ? `${formatCurrency(Number(requestDetails.rentAmount), requestDetails.currency || 'NGN')} / ${requestDetails.rentType || 'Annually'}`
    : null

  return (
    <div className="public-fulfillment">
      {/* Decline Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirm={handleConfirmDecline}
        title="Decline Record Verification"
        message="Are you sure you want to decline this request? The tenant will be informed that you are unable to verify past rental payment records for this property."
        confirmText="Yes, Decline Request"
        confirmVariant="danger"
        isLoading={declining}
      />

      <div className="public-fulfillment__container">
        {/* Compact Header */}
        <header className="public-fulfillment__header">
          {isPublic ? (
            <>
              <div className="public-fulfillment__brand">
                <UpwardLogo size={32} color="var(--forest)" />
                <span className="public-fulfillment__brand-name">Upward</span>
              </div>
              <div className="public-fulfillment__header-right">
                {isEmailMismatch ? (
                  <span
                    className="public-fulfillment__header-user-tag"
                    title={`Logged in as ${user?.email}`}
                  >
                    Signed in as <strong>{user?.email}</strong>
                  </span>
                ) : !isLoggedIn ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm public-fulfillment__login-btn"
                    onClick={() => router.push(pmLoginUrl)}
                  >
                    <LogIn size={13} /> Log in
                  </button>
                ) : null}
                <div className="public-fulfillment__tag">
                  <ShieldCheck size={13} />
                  Records Verification
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="public-fulfillment__back-btn"
                onClick={() => router.push('/requests')}
              >
                <ArrowLeft size={16} /> Back to Requests Hub
              </button>
              <div className="public-fulfillment__tag">
                <Receipt size={13} />
                Request Fulfillment
              </div>
            </>
          )}
        </header>

        {/* Request Introduction */}
        <div className="public-fulfillment__intro">
          <h1 className="public-fulfillment__title">Provide past rent records</h1>
          <p className="public-fulfillment__description">
            A tenant has requested verification of their previous rent payments. Please provide the
            available payment records for the property below.
          </p>
        </div>

        {/* Tenant and Property Context Block */}
        <section className="public-fulfillment__context" aria-label="Request Context">
          <div className="public-fulfillment__context-tenant">
            <div className="public-fulfillment__avatar">{tenantInitials}</div>
            <div className="public-fulfillment__tenant-info">
              <h2 className="public-fulfillment__tenant-name">{tenantFullName}</h2>
              <span className="public-fulfillment__tenant-sub">
                Tenant verification request &bull; Upward Credibility
              </span>
            </div>
          </div>

          <div className="public-fulfillment__context-grid">
            <div className="public-fulfillment__context-item">
              <MapPin size={18} className="public-fulfillment__context-icon" />
              <div>
                <div className="public-fulfillment__context-label">Property Address</div>
                <div className="public-fulfillment__context-value">
                  {requestDetails.propertyAddress}
                </div>
              </div>
            </div>

            {rentContext && (
              <div className="public-fulfillment__context-item">
                <Building size={18} className="public-fulfillment__context-icon" />
                <div>
                  <div className="public-fulfillment__context-label">Expected Rent</div>
                  <div className="public-fulfillment__context-value">{rentContext}</div>
                </div>
              </div>
            )}

            <div className="public-fulfillment__context-item">
              <Calendar size={18} className="public-fulfillment__context-icon" />
              <div>
                <div className="public-fulfillment__context-label">Requested Date</div>
                <div className="public-fulfillment__context-value">{formattedRequestedDate}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Rent History Form Section */}
        <section className="public-fulfillment__section" aria-label="Payment Records Entry">
          <div className="public-fulfillment__section-head">
            <div>
              <h2 className="public-fulfillment__section-title">Rent payment history</h2>
              <p className="public-fulfillment__section-desc">
                Add the rent payments you can verify for this tenant. You can add multiple records
                before submitting.
              </p>
            </div>
            {previewRecords.length > 0 && (
              <span className="public-fulfillment__count-chip">
                {previewRecords.length} {previewRecords.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>

          {/* Records List */}
          {previewRecords.length === 0 ? (
            <div className="public-fulfillment__empty-records">
              <div className="public-fulfillment__empty-icon">
                <FileText size={24} />
              </div>
              <h3 className="public-fulfillment__empty-title">No records added yet</h3>
              <p className="public-fulfillment__empty-sub">
                Add the tenant's verified rent payments below to get started.
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleAddRecord}
              >
                <Plus size={14} /> Add First Record
              </button>
            </div>
          ) : (
            <div className="public-fulfillment__records-list">
              {previewRecords.map((record, index) => {
                const amountError = validationErrors[`${record.id}-amount`]
                const expectedAmountError = validationErrors[`${record.id}-expectedAmount`]
                const paymentDateError = validationErrors[`${record.id}-paymentDate`]
                const periodEndError = validationErrors[`${record.id}-periodEnd`]

                return (
                  <div key={record.id} className="record-entry-card">
                    <div className="record-entry-card__top">
                      <span className="record-entry-card__badge">
                        <Receipt size={14} /> Record #{index + 1}
                      </span>
                      <div className="record-entry-card__top-right">
                        <div
                          className="record-entry-card__type-toggle"
                          role="radiogroup"
                          aria-label="Payment Type"
                        >
                          <button
                            type="button"
                            className={`record-entry-card__type-btn ${!record.isPartial ? 'record-entry-card__type-btn--active' : ''}`}
                            onClick={() => {
                              updateRecordField(record.id, 'isPartial', false)
                              if (record.expectedAmount) {
                                updateRecordField(record.id, 'amount', record.expectedAmount)
                              }
                            }}
                          >
                            Full Payment
                          </button>
                          <button
                            type="button"
                            className={`record-entry-card__type-btn ${record.isPartial ? 'record-entry-card__type-btn--active-partial' : ''}`}
                            onClick={() => {
                              updateRecordField(record.id, 'isPartial', true)
                              if (!record.expectedAmount && requestDetails?.rentAmount) {
                                updateRecordField(
                                  record.id,
                                  'expectedAmount',
                                  Number(requestDetails.rentAmount),
                                )
                              }
                            }}
                          >
                            Partial Payment
                          </button>
                        </div>
                        {previewRecords.length > 1 && (
                          <button
                            type="button"
                            className="record-entry-card__delete-btn"
                            onClick={() => handleRemoveRecord(record.id)}
                            aria-label={`Remove record #${index + 1}`}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="record-entry-card__grid">
                      {/* Row 1: Payment Details */}
                      {record.isPartial ? (
                        <>
                          <div className="record-entry-card__row record-entry-card__row--two">
                            <div className="record-field">
                              <label
                                className="record-field__label"
                                htmlFor={`amount-${record.id}`}
                              >
                                <span>
                                  Amount Paid <span className="record-field__required">*</span>
                                </span>
                                <span className="record-field__hint">What tenant paid</span>
                              </label>
                              <div className="record-field__input-wrap">
                                <span className="record-field__currency-prefix">₦</span>
                                <input
                                  id={`amount-${record.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  className={`record-field__input record-field__input--currency ${amountError ? 'record-field__input--error' : ''}`}
                                  placeholder="e.g. 1,500,000"
                                  value={
                                    record.amount !== '' ? formatCurrencyInput(record.amount) : ''
                                  }
                                  onChange={(e) => {
                                    const parsed = parseCurrencyInput(e.target.value)
                                    updateRecordField(
                                      record.id,
                                      'amount',
                                      parsed !== null ? parsed : '',
                                    )
                                  }}
                                />
                              </div>
                              {amountError && (
                                <span className="record-field__error-msg">{amountError}</span>
                              )}
                            </div>

                            <div className="record-field">
                              <label
                                className="record-field__label"
                                htmlFor={`expected-${record.id}`}
                              >
                                <span>
                                  Agreed Rent for Cycle{' '}
                                  <span className="record-field__required">*</span>
                                </span>
                                <span className="record-field__hint">Full agreed amount</span>
                              </label>
                              <div className="record-field__input-wrap">
                                <span className="record-field__currency-prefix">₦</span>
                                <input
                                  id={`expected-${record.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  className={`record-field__input record-field__input--currency ${expectedAmountError ? 'record-field__input--error' : ''}`}
                                  placeholder="e.g. 2,100,000"
                                  value={
                                    record.expectedAmount !== '' &&
                                    record.expectedAmount !== undefined
                                      ? formatCurrencyInput(record.expectedAmount)
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const parsed = parseCurrencyInput(e.target.value)
                                    updateRecordField(
                                      record.id,
                                      'expectedAmount',
                                      parsed !== null ? parsed : '',
                                    )
                                  }}
                                />
                              </div>
                              {expectedAmountError && (
                                <span className="record-field__error-msg">
                                  {expectedAmountError}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Outstanding Balance Breakdown */}
                          <div className="record-entry-card__partial-summary">
                            <span className="record-entry-card__partial-tag">
                              ◐ Partial Payment
                            </span>
                            {record.expectedAmount !== '' &&
                              record.expectedAmount !== undefined &&
                              record.amount !== '' && (
                                <>
                                  <span className="record-entry-card__partial-percent">
                                    Outstanding balance:{' '}
                                    {formatCurrency(
                                      Math.max(
                                        0,
                                        Number(record.expectedAmount) - Number(record.amount),
                                      ),
                                      requestDetails?.currency || 'NGN',
                                    )}
                                  </span>
                                  {Number(record.expectedAmount) > 0 && (
                                    <span className="record-entry-card__partial-percent">
                                      (
                                      {Math.min(
                                        100,
                                        Math.round(
                                          (Number(record.amount) / Number(record.expectedAmount)) *
                                            100,
                                        ),
                                      )}
                                      % paid)
                                    </span>
                                  )}
                                </>
                              )}
                          </div>
                        </>
                      ) : (
                        <div className="record-entry-card__row record-entry-card__row--two">
                          <div className="record-field">
                            <label className="record-field__label" htmlFor={`amount-${record.id}`}>
                              <span>
                                Rent Amount <span className="record-field__required">*</span>
                              </span>
                              <span className="record-field__hint">NGN</span>
                            </label>
                            <div className="record-field__input-wrap">
                              <span className="record-field__currency-prefix">₦</span>
                              <input
                                id={`amount-${record.id}`}
                                type="text"
                                inputMode="numeric"
                                className={`record-field__input record-field__input--currency ${amountError ? 'record-field__input--error' : ''}`}
                                placeholder="e.g. 2,100,000"
                                value={
                                  record.amount !== '' ? formatCurrencyInput(record.amount) : ''
                                }
                                onChange={(e) => {
                                  const parsed = parseCurrencyInput(e.target.value)
                                  updateRecordField(
                                    record.id,
                                    'amount',
                                    parsed !== null ? parsed : '',
                                  )
                                }}
                              />
                            </div>
                            {amountError && (
                              <span className="record-field__error-msg">{amountError}</span>
                            )}
                          </div>

                          <div className="record-field">
                            <label className="record-field__label" htmlFor={`paydate-${record.id}`}>
                              <span>
                                Payment Date <span className="record-field__required">*</span>
                              </span>
                              <span className="record-field__hint">Date received</span>
                            </label>
                            <input
                              id={`paydate-${record.id}`}
                              type="date"
                              className={`record-field__input ${paymentDateError ? 'record-field__input--error' : ''}`}
                              value={record.paymentDate}
                              onChange={(e) =>
                                updateRecordField(record.id, 'paymentDate', e.target.value)
                              }
                            />
                            {paymentDateError && (
                              <span className="record-field__error-msg">{paymentDateError}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment Date Row when Partial */}
                      {record.isPartial && (
                        <div className="record-entry-card__row record-entry-card__row--two">
                          <div className="record-field">
                            <label className="record-field__label" htmlFor={`paydate-${record.id}`}>
                              <span>
                                Payment Date <span className="record-field__required">*</span>
                              </span>
                              <span className="record-field__hint">Date received</span>
                            </label>
                            <input
                              id={`paydate-${record.id}`}
                              type="date"
                              className={`record-field__input ${paymentDateError ? 'record-field__input--error' : ''}`}
                              value={record.paymentDate}
                              onChange={(e) =>
                                updateRecordField(record.id, 'paymentDate', e.target.value)
                              }
                            />
                            {paymentDateError && (
                              <span className="record-field__error-msg">{paymentDateError}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tenancy Period and Due Date */}
                      <div className="record-entry-card__row record-entry-card__row--three">
                        <div className="record-field">
                          <label className="record-field__label" htmlFor={`pstart-${record.id}`}>
                            <span>Period Start</span>
                          </label>
                          <input
                            id={`pstart-${record.id}`}
                            type="date"
                            className="record-field__input"
                            value={record.periodStart}
                            onChange={(e) =>
                              updateRecordField(record.id, 'periodStart', e.target.value)
                            }
                          />
                        </div>

                        <div className="record-field">
                          <label className="record-field__label" htmlFor={`pend-${record.id}`}>
                            <span>Period End</span>
                            <span className="record-field__hint">Auto-calculated</span>
                          </label>
                          <input
                            id={`pend-${record.id}`}
                            type="date"
                            className={`record-field__input ${periodEndError ? 'record-field__input--error' : ''}`}
                            value={record.periodEnd}
                            onChange={(e) =>
                              updateRecordField(record.id, 'periodEnd', e.target.value)
                            }
                          />
                          {periodEndError && (
                            <span className="record-field__error-msg">{periodEndError}</span>
                          )}
                        </div>

                        <div className="record-field">
                          <label className="record-field__label" htmlFor={`due-${record.id}`}>
                            <span>Due Date</span>
                            <span className="record-field__hint">
                              {record.dueDate && record.dueDate === record.periodStart
                                ? 'Auto-filled'
                                : 'Payment deadline'}
                            </span>
                          </label>
                          <input
                            id={`due-${record.id}`}
                            type="date"
                            className="record-field__input"
                            value={record.dueDate}
                            onChange={(e) =>
                              updateRecordField(record.id, 'dueDate', e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* Row 3: Notes */}
                      <div className="record-field">
                        <label className="record-field__label" htmlFor={`notes-${record.id}`}>
                          <span>Notes</span>
                          <span className="record-field__hint">Optional</span>
                        </label>
                        <input
                          id={`notes-${record.id}`}
                          type="text"
                          className="record-field__input"
                          placeholder="e.g. Annual rent payment via bank transfer"
                          value={record.notes}
                          onChange={(e) => updateRecordField(record.id, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add Another Record Button */}
          {previewRecords.length > 0 && (
            <button type="button" className="public-fulfillment__add-btn" onClick={handleAddRecord}>
              <Plus size={16} /> Add another record
            </button>
          )}
        </section>

        {/* Action Controls Bar */}
        <div className="public-fulfillment__actions">
          <div className="public-fulfillment__actions-left">
            <button
              type="button"
              className="public-fulfillment__decline-btn"
              onClick={() => setIsDeclineModalOpen(true)}
              disabled={submitting}
            >
              Decline request
            </button>

            {!isPublic && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleMarkAsDone}
                disabled={submitting}
              >
                Mark as Done
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn--primary public-fulfillment__submit-btn"
            onClick={handleSubmitRecords}
            disabled={submitting || previewRecords.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              `Submit ${previewRecords.length > 0 ? (previewRecords.length === 1 ? 'Record' : `${previewRecords.length} Records`) : 'Records'}`
            )}
          </button>
        </div>

        {/* Contextual PM Discovery (For unauthenticated visitors) */}
        {isPublic && (
          <aside className="public-fulfillment__discovery-card" aria-label="About Upward PM">
            <div>
              <h3 className="public-fulfillment__discovery-title">
                Manage your properties with Upward
              </h3>
              <p className="public-fulfillment__discovery-sub">
                Automate rent tracking, issue automated payment receipts, and verify credible
                tenants in one platform.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => router.push(exploreUrl)}
              style={{ whiteSpace: 'nowrap' }}
            >
              Explore Upward <ArrowRight size={15} />
            </button>
          </aside>
        )}
      </div>
    </div>
  )
}
