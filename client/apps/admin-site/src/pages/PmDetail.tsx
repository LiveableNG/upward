import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Activity,
  Home,
  Send,
  Edit2,
  Users,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Award,
  Wallet,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Copy,
  Check,
  Clock,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { useAuth } from '../contexts/AuthContext'
import { ConfirmModal } from '../components/common/modal/ConfirmModal'

interface PmDetailProps {
  token: string
}

interface PmDetailData {
  type: 'PM'
  id: string
  uuid: string
  email: string
  personalEmail?: string | null
  personalPhone?: string | null
  firstName: string
  lastName: string
  businessName: string
  phone: string
  isVerified: boolean
  isBlocked: boolean
  isManuallyBlocked: boolean
  createdAt: string
  updatedAt: string
  properties: any[]
  tenants: any[]
  rentPayments: any[]
  activityLogs: any[]
  verification?: {
    idType: string
    idNumber: string
    idImage?: string
    status: string
    rejectionReason?: string
  }
  subscription?: {
    tier: 'FREE' | 'TIER_2' | 'TIER_3'
    status: string
    unitBillingMode?: 'ACTIVE' | 'ALL'
    anniversaryDate?: number | null
    priceMonthly?: number
    priceYearly?: number
  }
  subscriptionLogs?: any[]
  wallet?: {
    balance: number
    currency: string
    isActive: boolean
  }
  dedicatedVirtualAccount?: {
    accountNumber: string
    accountName: string
    bankName: string
    bankCode: string
  } | null
  walletTransactions?: Array<{
    id: number
    uuid: string
    type: string
    status: string
    amount: number
    reference?: string | null
    narration?: string | null
    createdAt: string
  }>
  subscriptionInvoices?: Array<{
    id: number
    uuid: string
    unitCount: number
    amount: number
    invoiceDate: string
    deductionDate: string
    paymentStatus: string
    createdAt: string
  }>
  billingSummary?: {
    totalUnitsCount: number
    occupiedUnitsCount: number
    billableUnits: number
    yearlyRate: number
    monthlySpend: number
    yearlySpend: number
    coverageMonths: number | null
    walletStatus: string
    nextBillingDate: string | null
    daysUntilNextBilling: number | null
  } | null
}

const PmDetail: React.FC<PmDetailProps> = ({ token }) => {
  const { uuid } = useParams<{ uuid: string }>()
  const { auth } = useAuth()
  const isDeveloper = auth?.user?.role === 'DEVELOPER'
  const [loading, setLoading] = useState(true)
  const [pm, setPm] = useState<PmDetailData | null>(null)

  // Verification Toggle State
  const [updatingVerification, setUpdatingVerification] = useState(false)

  // Block Access Toggle State
  const [updatingBlock, setUpdatingBlock] = useState(false)
  const [updatingManualBlock, setUpdatingManualBlock] = useState(false)

  // Notification Form State
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)

  // Edit Profile Form State
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPersonalEmail, setEditPersonalEmail] = useState('')
  const [editPersonalPhone, setEditPersonalPhone] = useState('')
  const [editBusinessName, setEditBusinessName] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Subscription & Financial State
  const [subTier, setSubTier] = useState<'FREE' | 'TIER_2' | 'TIER_3'>('FREE')
  const [subStatus, setSubStatus] = useState<string>('ACTIVE')
  const [subReason, setSubReason] = useState<string>('')
  const [updatingSubscription, setUpdatingSubscription] = useState(false)
  const [billingTab, setBillingTab] = useState<'transactions' | 'invoices' | 'logs'>('transactions')
  const [copiedDva, setCopiedDva] = useState(false)
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  const handleCopyText = (text: string, isDva = false) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    if (isDva) {
      setCopiedDva(true)
      setTimeout(() => setCopiedDva(false), 2000)
    } else {
      setCopiedRef(text)
      setTimeout(() => setCopiedRef(null), 2000)
    }
  }

  // Alliance Management State
  const [allianceProfile, setAllianceProfile] = useState<{
    isEnabled: boolean
    enabledAt?: string
    disabledAt?: string
    pmTitle?: string
    bio?: string
    qualifications?: Array<{
      id: number
      uuid: string
      slug: string
      name: string
      description?: string
      assignedAt: string
    }>
  } | null>(null)
  const [allQualifications, setAllQualifications] = useState<
    Array<{ id: number; uuid: string; slug: string; name: string; description?: string; isActive: boolean }>
  >([])
  const [selectedQualId, setSelectedQualId] = useState<string>('')
  const [updatingAlliance, setUpdatingAlliance] = useState(false)
  const [assigningQual, setAssigningQual] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  // Custom Qualification Creation State
  const [isCreatingCustomQual, setIsCreatingCustomQual] = useState(false)
  const [customQualName, setCustomQualName] = useState('')
  const [customQualSlug, setCustomQualSlug] = useState('')
  const [customQualDesc, setCustomQualDesc] = useState('')
  const [creatingCustomQual, setCreatingCustomQual] = useState(false)

  const fetchAllianceData = async () => {
    if (!uuid) return
    try {
      const [profileRes, qualsRes] = await Promise.all([
        apiService.get(`/admin/alliance/pms/${uuid}`, token),
        apiService.get(`/admin/alliance/qualifications?includeInactive=false`, token),
      ])
      setAllianceProfile(profileRes.data)
      setAllQualifications(qualsRes.data || [])
    } catch (err) {
      console.error('Failed to load Alliance profile/qualifications', err)
    }
  }

  const fetchPmDetails = async () => {
    if (!uuid) return
    setLoading(true)
    try {
      const res = await apiService.get(`/admin/pms/${uuid}`, token)
      setPm(res.data)
      // Initialize edit fields
      setEditFirstName(res.data.firstName || '')
      setEditLastName(res.data.lastName || '')
      setEditEmail(res.data.email || '')
      setEditPhone(res.data.phone || '')
      setEditPersonalEmail(res.data.personalEmail || '')
      setEditPersonalPhone(res.data.personalPhone || '')
      setEditBusinessName(res.data.businessName || '')
      setSubTier(res.data.subscription?.tier || 'FREE')
      setSubStatus(res.data.subscription?.status || 'ACTIVE')
      await fetchAllianceData()
    } catch (err) {
      console.error(err)
      showToast('Failed to load property manager details', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPmDetails()
  }, [uuid])

  const handleToggleAlliance = (enable: boolean) => {
    if (!uuid) return
    if (!enable) {
      setShowDisableConfirm(true)
      return
    }
    executeAllianceToggle(true)
  }

  const executeAllianceToggle = async (enable: boolean) => {
    if (!uuid) return
    setUpdatingAlliance(true)
    try {
      const res = await apiService.patch(
        `/admin/alliance/pms/${uuid}/enablement`,
        { isEnabled: enable },
        token,
      )
      setAllianceProfile((prev) => (prev ? {
        ...prev,
        isEnabled: res.data.isEnabled,
        enabledAt: res.data.enabledAt,
        disabledAt: res.data.disabledAt,
      } : null))
      showToast(enable ? 'Alliance successfully enabled for this PM' : 'Alliance disabled for this PM')
      await fetchAllianceData()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update Alliance enablement', true)
    } finally {
      setUpdatingAlliance(false)
      setShowDisableConfirm(false)
    }
  }

  const handleAssignQualification = async () => {
    if (!uuid || !selectedQualId) return
    if (selectedQualId === 'NEW_CUSTOM') {
      setIsCreatingCustomQual(true)
      return
    }
    setAssigningQual(true)
    try {
      await apiService.post(
        `/admin/alliance/pms/${uuid}/qualifications`,
        { qualificationId: Number(selectedQualId) },
        token,
      )
      showToast('Qualification assigned successfully')
      setSelectedQualId('')
      await fetchAllianceData()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to assign qualification', true)
    } finally {
      setAssigningQual(false)
    }
  }

  const handleCreateAndAssignCustomQualification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!uuid || !customQualName.trim()) {
      showToast('Qualification name is required', true)
      return
    }

    const slug =
      customQualSlug.trim() ||
      customQualName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    if (!slug) {
      showToast('Valid slug or name is required', true)
      return
    }

    setCreatingCustomQual(true)
    try {
      // 1. Create the qualification in the global catalog
      const createRes = await apiService.post(
        '/admin/alliance/qualifications',
        {
          name: customQualName.trim(),
          slug,
          description: customQualDesc.trim() || undefined,
          isActive: true,
        },
        token,
      )

      const createdQual = createRes.data

      // 2. Assign the newly created qualification to this PM
      await apiService.post(
        `/admin/alliance/pms/${uuid}/qualifications`,
        { qualificationId: createdQual.id },
        token,
      )

      showToast(`"${createdQual.name}" created and assigned successfully!`)
      setIsCreatingCustomQual(false)
      setCustomQualName('')
      setCustomQualSlug('')
      setCustomQualDesc('')
      setSelectedQualId('')
      await fetchAllianceData()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to create and assign custom qualification', true)
    } finally {
      setCreatingCustomQual(false)
    }
  }

  const handleRemoveQualification = async (qualificationId: number) => {
    if (!uuid) return
    try {
      await apiService.delete(
        `/admin/alliance/pms/${uuid}/qualifications/${qualificationId}`,
        token,
      )
      showToast('Qualification removed')
      await fetchAllianceData()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to remove qualification', true)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !notifTitle.trim() || !notifMessage.trim()) return

    setSendingNotif(true)
    try {
      await apiService.post(
        `/admin/pms/${uuid}/notify`,
        {
          title: notifTitle,
          message: notifMessage,
        },
        token,
      )

      showToast('Notification sent successfully!')
      setNotifTitle('')
      setNotifMessage('')
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to send notification', true)
    } finally {
      setSendingNotif(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid) return

    setUpdatingProfile(true)
    try {
      await apiService.patch(
        `/admin/pms/${uuid}`,
        {
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          phone: editPhone,
          personalEmail: editPersonalEmail,
          personalPhone: editPersonalPhone,
          businessName: editBusinessName,
        },
        token,
      )

      showToast('Property manager profile updated successfully!')
      fetchPmDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update property manager', true)
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleToggleVerification = async () => {
    if (!pm || !uuid) return
    setUpdatingVerification(true)
    try {
      const nextVerified = !pm.isVerified
      await apiService.patch(
        `/admin/pms/${uuid}`,
        {
          isVerified: nextVerified,
        },
        token,
      )

      showToast(
        nextVerified
          ? 'Property manager verified successfully!'
          : 'Property manager verification revoked!',
      )
      fetchPmDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update verification status', true)
    } finally {
      setUpdatingVerification(false)
    }
  }

  const handleToggleBlock = async () => {
    if (!pm || !uuid) return
    setUpdatingBlock(true)
    try {
      const nextBlocked = !pm.isBlocked
      await apiService.patch(
        `/admin/pms/${uuid}`,
        {
          isBlocked: nextBlocked,
        },
        token,
      )

      showToast(
        nextBlocked
          ? 'Subscription suspended (Unpaid status active) successfully!'
          : 'Subscription active (Unpaid status cleared) successfully!',
      )
      fetchPmDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update access status', true)
    } finally {
      setUpdatingBlock(false)
    }
  }

  const handleToggleManualBlock = async () => {
    if (!pm || !uuid) return
    setUpdatingManualBlock(true)
    try {
      const nextManualBlocked = !pm.isManuallyBlocked
      await apiService.patch(
        `/admin/pms/${uuid}`,
        {
          isManuallyBlocked: nextManualBlocked,
        },
        token,
      )

      showToast(
        nextManualBlocked
          ? 'Account manually banned and support appeal screen activated!'
          : 'Account ban lifted successfully!',
      )
      fetchPmDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update manual block status', true)
    } finally {
      setUpdatingManualBlock(false)
    }
  }

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid) return

    setUpdatingSubscription(true)
    try {
      await apiService.post(
        `/admin/pms/${uuid}/subscription/manage`,
        {
          tier: subTier,
          status: subStatus,
          reason: subReason,
        },
        token,
      )

      showToast('Property manager subscription updated successfully!')
      setSubReason('')
      fetchPmDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update subscription', true)
    } finally {
      setUpdatingSubscription(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '128px', color: 'var(--text-muted)' }}>
        <div style={{ margin: '0 auto 12px auto' }} className="loader" />
        <span>Loading property manager profile...</span>
      </div>
    )
  }

  if (!pm) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '64px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
        <h3>Property Manager not found</h3>
        <Link to="/metrics" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> Return to Metrics
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      {/* Back & Breadcrumb header */}
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
          <Link to="/metrics" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
          </Link>
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
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Property Manager Detail
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Ecosystem Registry / {pm.businessName || 'Property Manager'} • {pm.email}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Overview & Quick Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'sticky',
            top: '84px',
            alignSelf: 'start',
          }}
        >
          {/* Identity Card */}
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                color: '#6366f1',
                fontSize: '28px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(99, 102, 241, 0.15)',
              }}
            >
              {pm.businessName ? pm.businessName[0] : 'PM'}
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>
              {pm.businessName || `${pm.firstName} ${pm.lastName}`}
            </h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  color: '#6366f1',
                  textTransform: 'uppercase',
                }}
              >
                Upward PM
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: pm.isVerified ? 'var(--success-faint)' : 'var(--danger-faint)',
                  color: pm.isVerified ? 'var(--success)' : 'var(--danger)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {pm.isVerified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {pm.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            {/* Profile Contact info list */}
            <div
              style={{
                marginTop: '24px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                <span>
                  Contact Manager: {pm.firstName} {pm.lastName}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{pm.email}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{pm.phone || 'No phone set'}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{pm.personalEmail || 'No personal email set'}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{pm.personalPhone || 'No personal phone set'}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span>Manager since {new Date(pm.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Verification details */}
            {pm.verification ? (
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px',
                  background: 'var(--surface-hover)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  Verification Details
                </div>
                <div
                  style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>ID Type:</strong>{' '}
                    {pm.verification.idType}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>ID Number:</strong>{' '}
                    {pm.verification.idNumber}
                  </div>
                  {pm.verification.idImage && (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={pm.verification.idImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View Uploaded Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '20px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: '8px',
                  border: '1px dotted rgba(239, 68, 68, 0.2)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textAlign: 'left',
                }}
              >
                No uploaded verification files found for this manager.
              </div>
            )}

            {/* Verification Action Button */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={handleToggleVerification}
                disabled={updatingVerification}
                className="btn"
                style={{
                  width: '100%',
                  height: '38px',
                  justifyContent: 'center',
                  background: pm.isVerified ? 'var(--danger-faint)' : 'var(--success-faint)',
                  color: pm.isVerified ? 'var(--danger)' : 'var(--success)',
                  border: '1px solid transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  gap: '8px',
                }}
              >
                {pm.isVerified ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                {updatingVerification
                  ? 'Processing...'
                  : pm.isVerified
                    ? 'Revoke Verification'
                    : 'Verify Manager'}
              </button>
            </div>
          </div>

          {/* Platform Access Control Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} /> Platform Access Control
            </h4>
            
            {/* Control 1: Subscription Suspension (isBlocked) */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Subscription Status</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                    {pm.isBlocked ? (
                      <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={14} /> Suspended (Unpaid)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleBlock}
                disabled={updatingBlock}
                className="btn"
                style={{
                  width: '100%',
                  height: '38px',
                  justifyContent: 'center',
                  background: pm.isBlocked ? 'var(--success-faint)' : 'var(--danger-faint)',
                  color: pm.isBlocked ? 'var(--success)' : 'var(--danger)',
                  border: '1px solid transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  gap: '8px',
                }}
              >
                {pm.isBlocked ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                {updatingBlock
                  ? 'Processing...'
                  : pm.isBlocked
                    ? 'Activate Subscription'
                    : 'Suspend Subscription (Unpaid)'}
              </button>
            </div>

            {/* Control 2: Administrative Ban (isManuallyBlocked) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Administrative Ban</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                    {pm.isManuallyBlocked ? (
                      <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={14} /> Banned / Restricted
                      </span>
                    ) : (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Allowed / Good Standing
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleManualBlock}
                disabled={updatingManualBlock}
                className="btn"
                style={{
                  width: '100%',
                  height: '38px',
                  justifyContent: 'center',
                  background: pm.isManuallyBlocked ? 'var(--success-faint)' : 'var(--danger-faint)',
                  color: pm.isManuallyBlocked ? 'var(--success)' : 'var(--danger)',
                  border: '1px solid transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  gap: '8px',
                }}
              >
                {pm.isManuallyBlocked ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                {updatingManualBlock
                  ? 'Processing...'
                  : pm.isManuallyBlocked
                    ? 'Unban Account'
                    : 'Ban Account (Manual)'}
              </button>
            </div>
          </div>

          {/* Subscription & PM Wallet Management Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={16} color="var(--accent)" /> Wallet & Subscription
              </h4>
              <span
                className="badge"
                style={{
                  backgroundColor:
                    pm.billingSummary?.walletStatus === 'ACTION_REQUIRED'
                      ? 'var(--danger-faint)'
                      : pm.billingSummary?.walletStatus === 'LOW_BALANCE'
                        ? 'var(--warning-faint)'
                        : 'var(--success-faint)',
                  color:
                    pm.billingSummary?.walletStatus === 'ACTION_REQUIRED'
                      ? 'var(--danger)'
                      : pm.billingSummary?.walletStatus === 'LOW_BALANCE'
                        ? 'var(--warning)'
                        : 'var(--success)',
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                {pm.billingSummary?.walletStatus === 'ACTION_REQUIRED'
                  ? 'Top-Up Required'
                  : pm.billingSummary?.walletStatus === 'LOW_BALANCE'
                    ? 'Low Balance'
                    : 'Wallet Healthy'}
              </span>
            </div>

            {/* Wallet Balance Hero Box */}
            <div
              style={{
                backgroundColor: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Current Wallet Balance
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  ₦{(pm.wallet?.balance ?? 0).toLocaleString()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {pm.wallet?.currency || 'NGN'}
                </span>
              </div>

              {/* Monthly burn / runway indicator */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Runway:</span>
                <strong style={{ color: pm.billingSummary?.coverageMonths && pm.billingSummary.coverageMonths < 2 ? 'var(--danger)' : 'var(--text)' }}>
                  {pm.subscription?.tier === 'FREE'
                    ? 'Paused (Free Plan)'
                    : pm.billingSummary?.coverageMonths !== null && pm.billingSummary?.coverageMonths !== undefined
                      ? `~${pm.billingSummary.coverageMonths} months`
                      : 'N/A'}
                </strong>
              </div>
              {pm.subscription?.tier !== 'FREE' && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Est. Monthly Burn:</span>
                  <span>₦{pm.billingSummary?.monthlySpend?.toLocaleString() || '0'}/mo ({pm.billingSummary?.billableUnits || 0} units)</span>
                </div>
              )}
            </div>

            {/* Next Billing Date Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: pm.subscription?.tier === 'FREE' ? 'var(--surface-hover)' : 'rgba(99, 102, 241, 0.06)',
                border: pm.subscription?.tier === 'FREE' ? '1px solid var(--border)' : '1px solid rgba(99, 102, 241, 0.15)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: pm.subscription?.tier === 'FREE' ? 'var(--surface)' : 'rgba(99, 102, 241, 0.15)',
                  color: pm.subscription?.tier === 'FREE' ? 'var(--text-muted)' : '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Next Billing Date
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '1px' }}>
                  {pm.subscription?.tier === 'FREE'
                    ? 'No scheduled renewals'
                    : pm.billingSummary?.nextBillingDate
                      ? new Date(pm.billingSummary.nextBillingDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Pending Anniversary Setup'}
                </div>
              </div>
              {pm.subscription?.tier !== 'FREE' && pm.billingSummary?.daysUntilNextBilling !== null && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    color: '#6366f1',
                  }}
                >
                  in {pm.billingSummary?.daysUntilNextBilling}d
                </span>
              )}
            </div>

            {/* Dedicated Top-Up Virtual Account */}
            {pm.dedicatedVirtualAccount && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Dedicated Top-Up Account
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(pm.dedicatedVirtualAccount!.accountNumber, true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      color: copiedDva ? 'var(--success)' : 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    {copiedDva ? <Check size={12} /> : <Copy size={12} />}
                    {copiedDva ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.05em' }}>
                  {pm.dedicatedVirtualAccount.accountNumber}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {pm.dedicatedVirtualAccount.bankName} • {pm.dedicatedVirtualAccount.accountName}
                </div>
              </div>
            )}

            {/* Plan Tier & Status Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '4px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Current Plan</div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: pm.subscription?.tier === 'TIER_3' ? '#c084fc' : pm.subscription?.tier === 'TIER_2' ? '#38bdf8' : 'var(--text)' }}>
                  {pm.subscription?.tier || 'FREE'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Account State</div>
                <span className="badge" style={{
                  backgroundColor: pm.subscription?.status === 'ACTIVE' ? 'var(--success-faint)' : 'var(--danger-faint)',
                  color: pm.subscription?.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'
                }}>
                  {pm.subscription?.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Change Plan Tier</label>
                <select 
                  value={subTier} 
                  onChange={(e) => setSubTier(e.target.value as any)} 
                  className="input"
                  style={{ width: '100%', height: '38px', padding: '0 8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                >
                  <option value="FREE">FREE</option>
                  <option value="TIER_2">TIER 2 (Service Charges & Docs)</option>
                  <option value="TIER_3">TIER 3 (Full Access)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Subscription Status</label>
                <select 
                  value={subStatus} 
                  onChange={(e) => setSubStatus(e.target.value)} 
                  className="input"
                  style={{ width: '100%', height: '38px', padding: '0 8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="LOCKED">LOCKED (Suspended/Revoked)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Reason for Change</label>
                <input
                  type="text"
                  value={subReason}
                  onChange={(e) => setSubReason(e.target.value)}
                  placeholder="e.g. Upgrade request, non-payment revoke"
                  className="input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={updatingSubscription}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '38px',
                  backgroundColor: '#6366f1',
                  borderColor: '#6366f1',
                }}
              >
                {updatingSubscription ? 'Updating subscription...' : 'Update Subscription'}
              </button>
            </form>
          </div>

          {/* Upward Alliance Management Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--forest)" /> Upward Alliance
              </h4>
              <span
                className="badge"
                style={{
                  backgroundColor: allianceProfile?.isEnabled ? 'var(--success-faint)' : 'var(--danger-faint)',
                  color: allianceProfile?.isEnabled ? 'var(--success)' : 'var(--danger)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {allianceProfile?.isEnabled ? 'Alliance Enabled' : 'Alliance Disabled'}
              </span>
            </div>

            {/* Enable/Disable Action */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5 }}>
                {allianceProfile?.isEnabled
                  ? `Enabled since ${allianceProfile.enabledAt ? new Date(allianceProfile.enabledAt).toLocaleDateString() : 'Active'}. PM can publish and view Alliance listings.`
                  : 'Alliance is disabled by default. Enable to grant this PM network access and listing distribution.'}
              </div>
              <button
                type="button"
                onClick={() => handleToggleAlliance(!allianceProfile?.isEnabled)}
                disabled={updatingAlliance}
                className="btn"
                style={{
                  width: '100%',
                  height: '38px',
                  justifyContent: 'center',
                  background: allianceProfile?.isEnabled ? 'var(--danger-faint)' : 'var(--success-faint)',
                  color: allianceProfile?.isEnabled ? 'var(--danger)' : 'var(--success)',
                  border: '1px solid transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  gap: '8px',
                }}
              >
                {allianceProfile?.isEnabled ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                {updatingAlliance
                  ? 'Updating Alliance...'
                  : allianceProfile?.isEnabled
                    ? 'Disable Upward Alliance'
                    : 'Enable Upward Alliance'}
              </button>
            </div>

            {/* PM Alliance Profile Meta */}
            {allianceProfile?.pmTitle && (
              <div style={{ marginBottom: '16px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Professional Title: </span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{allianceProfile.pmTitle}</span>
              </div>
            )}

            {/* Qualifications Section */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Assigned Qualifications & Badges
              </div>

              {/* Badges List */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px', minHeight: '32px' }}>
                {allianceProfile?.qualifications && allianceProfile.qualifications.length > 0 ? (
                  allianceProfile.qualifications.map((q) => (
                    <span
                      key={q.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        background: 'rgba(22, 101, 52, 0.08)',
                        color: 'var(--forest)',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid rgba(22, 101, 52, 0.2)',
                      }}
                    >
                      <Award size={12} />
                      {q.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveQualification(q.id)}
                        title="Remove qualification"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <XCircle size={12} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No qualifications assigned yet.
                  </span>
                )}
              </div>

              {/* Assign or Create Qualification Form */}
              {isCreatingCustomQual ? (
                <div
                  style={{
                    background: 'rgba(99, 102, 241, 0.04)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5' }}>
                      Create &amp; Assign Custom Qualification
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCustomQual(false)
                        setSelectedQualId('')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Qualification Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RICS Accredited Surveyor"
                      value={customQualName}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomQualName(val)
                        setCustomQualSlug(
                          val
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                        )
                      }}
                      className="input"
                      style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Identifier / Slug *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. rics-accredited-surveyor"
                      value={customQualSlug}
                      onChange={(e) => setCustomQualSlug(e.target.value)}
                      className="input"
                      style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Licensed chartered surveyor with international standing"
                      value={customQualDesc}
                      onChange={(e) => setCustomQualDesc(e.target.value)}
                      className="input"
                      style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleCreateAndAssignCustomQualification()}
                      disabled={creatingCustomQual || !customQualName.trim()}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        height: '34px',
                        fontSize: '12px',
                        backgroundColor: '#6366f1',
                        borderColor: '#6366f1',
                        justifyContent: 'center',
                      }}
                    >
                      {creatingCustomQual ? 'Creating & Assigning...' : 'Create & Assign'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedQualId}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedQualId(val)
                      if (val === 'NEW_CUSTOM') {
                        setIsCreatingCustomQual(true)
                      }
                    }}
                    className="input"
                    style={{ flex: 1, height: '36px', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                  >
                    <option value="">Select qualification to assign...</option>
                    <option value="NEW_CUSTOM" style={{ fontWeight: 700, color: '#6366f1' }}>
                      + Create new custom qualification...
                    </option>
                    {allQualifications
                      .filter(
                        (q) =>
                          !allianceProfile?.qualifications?.some((assigned) => assigned.id === q.id),
                      )
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name} ({q.slug})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignQualification}
                    disabled={assigningQual || !selectedQualId}
                    className="btn btn-primary"
                    style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
                  >
                    {selectedQualId === 'NEW_CUSTOM'
                      ? 'Create...'
                      : assigningQual
                        ? 'Assigning...'
                        : 'Assign'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contact & In-App Notification Tool */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Send In-App Notification</h4>
            <form
              onSubmit={handleSendNotification}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Enter alert title..."
                  className="input"
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Message
                </label>
                <textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Type notifications detail message..."
                  className="input"
                  style={{ height: '80px', resize: 'none', padding: '8px' }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingNotif}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '38px',
                  backgroundColor: '#6366f1',
                  borderColor: '#6366f1',
                }}
              >
                <Send size={14} /> {sendingNotif ? 'Sending alert...' : 'Dispatch Message'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Details list & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Edit Profile Details */}
          {isDeveloper && (
            <div className="card" style={{ padding: '24px' }}>
              <h4
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Edit2 size={16} /> Edit Manager Profile Details
              </h4>
              <form
                onSubmit={handleUpdateProfile}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
              >
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={editBusinessName}
                    onChange={(e) => setEditBusinessName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Personal Email
                  </label>
                  <input
                    type="email"
                    value={editPersonalEmail}
                    onChange={(e) => setEditPersonalEmail(e.target.value)}
                    className="input"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Personal Phone
                  </label>
                  <input
                    type="text"
                    value={editPersonalPhone}
                    onChange={(e) => setEditPersonalPhone(e.target.value)}
                    className="input"
                    placeholder="Optional"
                  />
                </div>
                <div
                  style={{
                    gridColumn: 'span 2',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '8px',
                  }}
                >
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="btn btn-primary"
                    style={{ height: '38px', backgroundColor: '#6366f1', borderColor: '#6366f1' }}
                  >
                    {updatingProfile ? 'Saving updates...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Managed Properties & Units */}
          <div className="card" style={{ padding: '24px' }}>
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Home size={16} /> Managed Real Estate Properties
            </h4>
            {pm.properties && pm.properties.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {pm.properties.map((prop: any) => (
                  <div
                    key={prop.id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        display: 'block',
                        fontSize: '14px',
                        color: 'var(--text)',
                      }}
                    >
                      {prop.address || 'Property Listing'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '8px',
                      }}
                    >
                      Currency: {prop.currency} • Subaccount: {prop.subaccountId || 'None linked'}
                    </span>

                    {/* Units list */}
                    {prop.units && prop.units.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginTop: '12px',
                        }}
                      >
                        {prop.units.map((unit: any) => (
                          <div
                            key={unit.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                            }}
                          >
                            <div>
                              <strong style={{ color: 'var(--text)' }}>
                                Unit {unit.unitName || unit.name || unit.id}
                              </strong>
                              {unit.unitType && (
                                <span
                                  style={{
                                    color: 'var(--text-muted)',
                                    marginLeft: '6px',
                                    fontSize: '11px',
                                    background: 'var(--surface-hover)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {unit.unitType}
                                </span>
                              )}
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-secondary)',
                                  marginTop: '2px',
                                }}
                              >
                                {unit.tenant ? (
                                  <>
                                    Tenant:{' '}
                                    <Link
                                      to={`/users/${unit.tenant.uuid}`}
                                      style={{
                                        color: 'var(--accent)',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {unit.tenant.firstName} {unit.tenant.lastName}
                                    </Link>
                                  </>
                                ) : (
                                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                    Vacant
                                  </span>
                                )}
                              </div>
                              {unit.rentStartDate && unit.rentDueDate && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Period: {new Date(unit.rentStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — {new Date(unit.rentDueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              ₦{unit.rentAmount ? unit.rentAmount.toLocaleString() : '0'} /{' '}
                              {unit.rentType || 'year'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                        }}
                      >
                        No units added to this property yet.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No active properties listed under this manager.
              </p>
            )}
          </div>

          {/* Invited Tenants Directory */}
          <div className="card" style={{ padding: '24px' }}>
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={16} /> Decrypted Tenant Registry
            </h4>
            {pm.tenants && pm.tenants.length > 0 ? (
              <div
                className="table-container"
                style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Email</th>
                      <th style={{ padding: '8px 12px' }}>Phone</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pm.tenants.map((tenant: any) => (
                      <tr key={tenant.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>
                          <Link
                            to={`/users/${tenant.uuid}`}
                            style={{ color: 'var(--accent)', textDecoration: 'none' }}
                          >
                            {tenant.firstName
                              ? `${tenant.firstName} ${tenant.lastName}`
                              : 'Invite Placeholder'}
                          </Link>
                        </td>
                        <td style={{ padding: '12px' }}>{tenant.email}</td>
                        <td style={{ padding: '12px' }}>{tenant.phone || '—'}</td>
                        <td style={{ padding: '12px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                tenant.inviteStatus === 'ACCEPTED'
                                  ? 'var(--success-faint)'
                                  : 'var(--warning-faint)',
                              color:
                                tenant.inviteStatus === 'ACCEPTED'
                                  ? 'var(--success)'
                                  : 'var(--warning)',
                            }}
                          >
                            {tenant.inviteStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No tenants have been invited or registered by this manager yet.
              </p>
            )}
          </div>

          {/* Subscription Ledger & Financial Invoices Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CreditCard size={16} /> Subscription Ledger & Operations
              </h4>

              {/* Segmented Tab Controls */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--surface-hover)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setBillingTab('transactions')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: billingTab === 'transactions' ? 'var(--white)' : 'transparent',
                    color: billingTab === 'transactions' ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: billingTab === 'transactions' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Transactions ({pm.walletTransactions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setBillingTab('invoices')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: billingTab === 'invoices' ? 'var(--white)' : 'transparent',
                    color: billingTab === 'invoices' ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: billingTab === 'invoices' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Invoices ({pm.subscriptionInvoices?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setBillingTab('logs')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: billingTab === 'logs' ? 'var(--white)' : 'transparent',
                    color: billingTab === 'logs' ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: billingTab === 'logs' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Audit Log ({pm.subscriptionLogs?.length || 0})
                </button>
              </div>
            </div>

            {/* TAB 1: Wallet Transactions */}
            {billingTab === 'transactions' && (
              pm.walletTransactions && pm.walletTransactions.length > 0 ? (
                <div
                  className="table-container"
                  style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '12px',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <th style={{ padding: '8px 12px' }}>Type</th>
                        <th style={{ padding: '8px 12px' }}>Amount</th>
                        <th style={{ padding: '8px 12px' }}>Narration & Ref</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pm.walletTransactions.map((tx: any) => {
                        const isCredit = tx.type?.toUpperCase() === 'CREDIT' || tx.type?.toUpperCase() === 'TOPUP' || tx.type?.toUpperCase() === 'DEPOSIT'
                        return (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px' }}>
                              <span
                                className="badge"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: isCredit ? 'var(--success-faint)' : 'rgba(234, 88, 12, 0.08)',
                                  color: isCredit ? 'var(--success)' : '#ea580c',
                                  fontWeight: 600,
                                }}
                              >
                                {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                {isCredit ? 'Credit (Deposit)' : 'Debit (Deduction)'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px', color: isCredit ? 'var(--success)' : 'var(--text)' }}>
                              {isCredit ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                                {tx.narration || (isCredit ? 'Wallet Top-up' : 'Monthly subscription fee deduction')}
                              </div>
                              {tx.reference && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(tx.reference)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'var(--surface-hover)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    color: copiedRef === tx.reference ? 'var(--success)' : 'var(--text-muted)',
                                    marginTop: '4px',
                                    cursor: 'pointer',
                                  }}
                                  title="Click to copy reference"
                                >
                                  {copiedRef === tx.reference ? <Check size={10} /> : <Copy size={10} />}
                                  {tx.reference.length > 20 ? `${tx.reference.slice(0, 16)}...` : tx.reference}
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor:
                                    tx.status?.toUpperCase() === 'SUCCESS'
                                      ? 'var(--success-faint)'
                                      : tx.status?.toUpperCase() === 'PENDING'
                                        ? 'var(--warning-faint)'
                                        : 'var(--danger-faint)',
                                  color:
                                    tx.status?.toUpperCase() === 'SUCCESS'
                                      ? 'var(--success)'
                                      : tx.status?.toUpperCase() === 'PENDING'
                                        ? 'var(--warning)'
                                        : 'var(--danger)',
                                }}
                              >
                                {tx.status || 'SUCCESS'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Wallet size={28} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                  No wallet ledger transactions recorded for this property manager yet.
                </div>
              )
            )}

            {/* TAB 2: Subscription Invoices */}
            {billingTab === 'invoices' && (
              pm.subscriptionInvoices && pm.subscriptionInvoices.length > 0 ? (
                <div
                  className="table-container"
                  style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '12px',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <th style={{ padding: '8px 12px' }}>Invoice Ref</th>
                        <th style={{ padding: '8px 12px' }}>Units Billed</th>
                        <th style={{ padding: '8px 12px' }}>Amount</th>
                        <th style={{ padding: '8px 12px' }}>Invoice Date</th>
                        <th style={{ padding: '8px 12px' }}>Deduction Date</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pm.subscriptionInvoices.map((inv: any) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px' }}>
                            <button
                              type="button"
                              onClick={() => handleCopyText(inv.uuid)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--surface-hover)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: copiedRef === inv.uuid ? 'var(--success)' : 'var(--text)',
                                cursor: 'pointer',
                              }}
                              title="Click to copy invoice UUID"
                            >
                              {copiedRef === inv.uuid ? <Check size={10} /> : <Copy size={10} />}
                              INV-{inv.uuid.slice(0, 8)}
                            </button>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600 }}>
                            {inv.unitCount} {inv.unitCount === 1 ? 'unit' : 'units'}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px' }}>
                            ₦{Number(inv.amount || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(inv.invoiceDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(inv.deductionDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor:
                                  inv.paymentStatus === 'PAID'
                                    ? 'var(--success-faint)'
                                    : inv.paymentStatus === 'PENDING'
                                      ? 'rgba(59, 130, 246, 0.08)'
                                      : 'var(--danger-faint)',
                                color:
                                  inv.paymentStatus === 'PAID'
                                    ? 'var(--success)'
                                    : inv.paymentStatus === 'PENDING'
                                      ? '#3b82f6'
                                      : 'var(--danger)',
                                fontWeight: 600,
                              }}
                            >
                              {inv.paymentStatus || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Receipt size={28} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                  No subscription invoices generated yet for this manager.
                </div>
              )
            )}

            {/* TAB 3: Plan Audit Log */}
            {billingTab === 'logs' && (
              pm.subscriptionLogs && pm.subscriptionLogs.length > 0 ? (
                <div
                  className="table-container"
                  style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '12px',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <th style={{ padding: '8px 12px' }}>Action</th>
                        <th style={{ padding: '8px 12px' }}>Tier Change</th>
                        <th style={{ padding: '8px 12px' }}>Status Change</th>
                        <th style={{ padding: '8px 12px' }}>Reason</th>
                        <th style={{ padding: '8px 12px' }}>Admin</th>
                        <th style={{ padding: '8px 12px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pm.subscriptionLogs.map((log: any) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor:
                                  log.action === 'REVOKE'
                                    ? 'var(--danger-faint)'
                                    : log.action === 'UPGRADE'
                                      ? 'var(--success-faint)'
                                      : 'var(--warning-faint)',
                                color:
                                  log.action === 'REVOKE'
                                    ? 'var(--danger)'
                                    : log.action === 'UPGRADE'
                                      ? 'var(--success)'
                                      : 'var(--warning)',
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {log.previousTier} &rarr; {log.newTier}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {log.previousStatus} &rarr; {log.newStatus}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                            {log.reason || '—'}
                          </td>
                          <td style={{ padding: '12px', fontStyle: 'italic' }}>
                            {log.admin?.email || 'System'}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Calendar size={28} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                  No subscription plan modification records found.
                </div>
              )
            )}
          </div>

          {/* Activity Log Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Activity size={16} /> App Action Logs
            </h4>
            {pm.activityLogs && pm.activityLogs.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {pm.activityLogs.map((log: any) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{log.action}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleDateString()} •{' '}
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
                      {log.description}
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      IP: {log.ipAddress || 'unknown'} • App: {log.app}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No recorded application events or logins for this manager.
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDisableConfirm}
        title="Disable Upward Alliance"
        message="Are you sure you want to disable Upward Alliance for this property manager? Their existing qualifications and profile settings will be preserved, but their network status will become disabled."
        danger
        onConfirm={() => executeAllianceToggle(false)}
        onCancel={() => setShowDisableConfirm(false)}
      />
    </div>
  )
}

export default PmDetail
