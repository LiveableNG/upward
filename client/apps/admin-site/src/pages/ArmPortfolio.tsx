import { useState, useEffect, useMemo } from 'react'
import {
  Landmark,
  Search,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Building2,
  UserCheck,
  CreditCard,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Activity,
  X,
  Copy,
  Check,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface ArmPortfolioProps {
  token: string
  adminRole?: string
}

interface ArmVirtualAccount {
  accountNumber: string
  bankName: string
  bankCode?: string
  customerName: string
  currency: string
  active: boolean
}

interface PortfolioStats {
  partnerName: string
  partnerShortName: string
  productCode: string
  productName?: string
  annualYieldRatePct: number
  liveFundYieldRatePct?: number
  dailyRate: number
  netAssetValue?: string | null
  valuationDate?: string | null
  totalPooledPrincipalNaira: number
  totalAccruedYieldNaira: number
  totalRedeemedNaira: number
  totalCashbackPaidNaira: number
  activeSaversCount: number
  totalEnrolledCustomersCount: number
  activeVaultsCount: number
  settledVaultsCount: number
  lastReconciledAt: string
  armSandbox?: {
    connected: boolean
    baseUrl: string
    merchantId: string | null
    businessName: string | null
    merchantMembershipId: string | null
    merchantType: string | null
    cashWalletBalanceNaira: number
    virtualAccounts: ArmVirtualAccount[]
    onboardedCustomersCount: number
    masterPortfolioUnits: number
    masterPortfolioMarketValueNaira: number
  }
}

interface ArmCustomer {
  customerId: number
  userUuid: string
  source?: 'UPWARD_VAULT' | 'ARM_SANDBOX'
  fullName: string
  email: string
  phone: string | null
  gender: string
  isIdentityVerified: boolean
  savingsWalletEnabled: boolean
  armTrackingId?: string | null
  armCustomerMembershipId: string | null
  armCrmAccountNumber: string | null
  armSyncStatus: string
  armCompletedSections: number
  b2b2cConsentOnRecord: boolean
  vaultId: number
  vaultUuid: string
  lockStatus: string
  productOption: string
  cadence: string
  targetAmountNaira: number
  currentBalanceNaira: number
  currentPrincipalNaira: number
  accruedYieldNaira: number
  annualYieldRatePct: number
  contractualDueDate: string
  unlockDate: string
  daysRemaining: number
  dvaBankName: string
  dvaAccountNumber: string | null
  dvaAccountName: string | null
  dvaAssignmentStatus: string
  armPurchaseId: string | null
  armWithdrawalId: string | null
  transactionsCount: number
  upwardScore: number
  createdAt: string
}

interface ArmTransaction {
  id: number
  uuid: string
  reference: string
  type: string
  flowCategory: string
  amountNaira: number
  principalDeltaNaira: number
  yieldDeltaNaira: number
  balanceAfterNaira: number
  channel: string
  narration: string | null
  customerName: string
  customerEmail: string
  armMembershipId: string
  armAccountNumber?: string | null
  armPurchaseId?: string | null
  armWithdrawalId?: string | null
  armTransactionId?: string | null
  armInstructionId?: string | null
  armLiveStatus?: string | null
  armSyncStatus?: string | null
  linkedJob?: {
    uuid: string
    status: string
    jobType: string
    armInstructionId: string | null
    armTransactionId: string
    attempts: number
    maxAttempts: number
    lastError: string | null
  } | null
  metadata?: Record<string, any> | null
  vaultUuid?: string
  dvaBankName?: string | null
  dvaAccountNumber?: string | null
  createdAt: string
}

interface ArmBackgroundJob {
  id: number
  uuid: string
  idempotencyKey: string
  jobType: 'SUBSCRIBE' | 'REDEEM' | 'ONBOARD' | string
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string
  reference: string
  amountNaira: number
  armMembershipId?: string
  armAccountNumber?: string
  armTransactionId: string
  armInstructionId: string | null
  attempts: number
  maxAttempts: number
  lastError: string | null
  payload?: Record<string, any> | null
  result?: Record<string, any> | null
  customerName: string
  customerEmail: string
  vaultUuid: string | null
  dvaAccountNumber?: string | null
  canRetry: boolean
  notifiedUserAt: string | null
  notifiedAdminAt: string | null
  lockedAt?: string | null
  completedAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt?: string
}

interface ArmJobsSummary {
  queued: number
  processing: number
  completed: number
  failed: number
}

interface ArmJobTypeSummary {
  subscribe: number
  redeem: number
  onboard: number
}

type DetailDrawerState =
  | { kind: 'CUSTOMER'; item: ArmCustomer }
  | { kind: 'TRANSACTION'; item: ArmTransaction }
  | { kind: 'JOB'; item: ArmBackgroundJob }
  | null

interface LiveArmStatusResponse {
  transactionUuid: string
  reference: string
  purchaseId: string | null
  withdrawalId: string | null
  armTransactionId: string | null
  liveItems: Array<{
    status: boolean
    purchaseId?: string
    withdrawalId?: string
    transactionId?: string
    message?: string
    amount?: number
    productCode?: string
    membershipId?: string
    transactionReference?: string
  }>
  checkedAt: string
}

export default function ArmPortfolio({ token }: ArmPortfolioProps) {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'INFLOWS' | 'JOBS' | 'CONSENT'>('CUSTOMERS')
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [customers, setCustomers] = useState<ArmCustomer[]>([])
  const [transactions, setTransactions] = useState<ArmTransaction[]>([])
  const [jobs, setJobs] = useState<ArmBackgroundJob[]>([])
  const [jobsSummary, setJobsSummary] = useState<ArmJobsSummary>({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  })
  const [jobTypeSummary, setJobTypeSummary] = useState<ArmJobTypeSummary>({
    subscribe: 0,
    redeem: 0,
    onboard: 0,
  })
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL')
  const [jobTypeFilter, setJobTypeFilter] = useState('ALL')
  const [jobSearch, setJobSearch] = useState('')
  const [retryingJobUuid, setRetryingJobUuid] = useState<string | null>(null)
  const [detailDrawer, setDetailDrawer] = useState<DetailDrawerState>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [liveTxStatus, setLiveTxStatus] = useState<LiveArmStatusResponse | null>(null)
  const [checkingLiveTx, setCheckingLiveTx] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerStatusFilter, setCustomerStatusFilter] = useState('ALL')
  const [txSearch, setTxSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('ALL')
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string | null>(null)

  const formatNaira = (val: number) =>
    `₦${Number(val || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchData = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const qs = forceRefresh ? '?refresh=true' : ''
      const [statsRes, customersRes, txsRes, jobsRes] = await Promise.all([
        apiService.get(`/admin/arm/stats${qs}`, token),
        apiService.get(`/admin/arm/customers${qs}`, token),
        apiService.get('/admin/arm/transactions?limit=100', token),
        apiService.get('/admin/arm/jobs?limit=50', token).catch(() => null),
      ])

      if (statsRes?.data) {
        setStats(statsRes.data)
      } else if (statsRes && typeof statsRes === 'object') {
        setStats(statsRes)
      }

      if (Array.isArray(customersRes?.data)) {
        setCustomers(customersRes.data)
      } else if (Array.isArray(customersRes)) {
        setCustomers(customersRes)
      }

      if (Array.isArray(txsRes?.data?.items)) {
        setTransactions(txsRes.data.items)
      } else if (Array.isArray(txsRes?.items)) {
        setTransactions(txsRes.items)
      } else if (Array.isArray(txsRes?.data)) {
        setTransactions(txsRes.data)
      }

      const jobsPayload = jobsRes?.data || jobsRes
      if (Array.isArray(jobsPayload?.items)) {
        setJobs(jobsPayload.items)
      }
      if (jobsPayload?.summary) {
        setJobsSummary(jobsPayload.summary)
      }
      if (jobsPayload?.typeSummary) {
        setJobTypeSummary(jobsPayload.typeSummary)
      }
    } catch (err: any) {
      console.error('Failed to load ARM portfolio data:', err)
      setError(err?.message || 'Failed to load ARM portfolio records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailDrawer(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const copyValue = (key: string, value: string) => {
    if (!value) return
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1600)
  }

  const openTransactionDetail = (tx: ArmTransaction) => {
    setLiveTxStatus(null)
    setDetailDrawer({ kind: 'TRANSACTION', item: tx })
  }

  const handleCheckLiveArmStatus = async (txUuid: string) => {
    setCheckingLiveTx(true)
    try {
      const res = await apiService.get(`/admin/arm/transactions/${txUuid}/arm-status`, token)
      setLiveTxStatus(res?.data || res)
    } catch (err: any) {
      setError(err?.message || 'Could not verify live ARM transaction status')
    } finally {
      setCheckingLiveTx(false)
    }
  }

  const omnibusMembershipId = stats?.armSandbox?.merchantMembershipId || '3005679'

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !customerSearch.trim() ||
        c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.armCustomerMembershipId &&
          c.armCustomerMembershipId.toLowerCase().includes(customerSearch.toLowerCase()))

      const matchesStatus =
        customerStatusFilter === 'ALL' || c.lockStatus === customerStatusFilter

      return matchesSearch && matchesStatus
    })
  }, [customers, customerSearch, customerStatusFilter])

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesCustomer =
        !selectedCustomerEmail || t.customerEmail === selectedCustomerEmail

      const matchesType = txTypeFilter === 'ALL' || t.type === txTypeFilter

      const matchesSearch =
        !txSearch.trim() ||
        t.customerName.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.customerEmail.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
        (t.narration && t.narration.toLowerCase().includes(txSearch.toLowerCase())) ||
        t.armMembershipId.toLowerCase().includes(txSearch.toLowerCase())

      return matchesCustomer && matchesType && matchesSearch
    })
  }, [transactions, selectedCustomerEmail, txTypeFilter, txSearch])

  const handleRetryJob = async (jobUuid: string) => {
    setRetryingJobUuid(jobUuid)
    setError(null)
    try {
      await apiService.post(`/admin/arm/jobs/${jobUuid}/retry`, {}, token)
      await fetchData(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to retry ARM background job')
    } finally {
      setRetryingJobUuid(null)
    }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesStatus = jobStatusFilter === 'ALL' || j.status === jobStatusFilter
      const matchesType = jobTypeFilter === 'ALL' || j.jobType === jobTypeFilter
      const matchesSearch =
        !jobSearch.trim() ||
        j.reference.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.customerName.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.customerEmail.toLowerCase().includes(jobSearch.toLowerCase()) ||
        (j.armMembershipId && j.armMembershipId.toLowerCase().includes(jobSearch.toLowerCase())) ||
        (j.armInstructionId &&
          j.armInstructionId.toLowerCase().includes(jobSearch.toLowerCase())) ||
        j.armTransactionId.toLowerCase().includes(jobSearch.toLowerCase())
      return matchesStatus && matchesType && matchesSearch
    })
  }, [jobs, jobStatusFilter, jobTypeFilter, jobSearch])

  // Export CSV of Inflow Statement (Criteria #1 for ARM)
  const exportInflowStatementCsv = () => {
    const headers = [
      'Transaction Reference',
      'ARM Instruction ID',
      'Sender Name',
      'Sender Email',
      'ARM Membership ID',
      'Flow Type',
      'Channel',
      'Amount (NGN)',
      'Balance After (NGN)',
      'Date & Time',
      'Narration',
    ]

    const rows = filteredTransactions.map((tx) => [
      `"${tx.reference}"`,
      `"${tx.armInstructionId || ''}"`,
      `"${tx.customerName}"`,
      `"${tx.customerEmail}"`,
      `"${tx.armMembershipId}"`,
      `"${tx.flowCategory}"`,
      `"${tx.channel}"`,
      tx.amountNaira.toFixed(2),
      tx.balanceAfterNaira.toFixed(2),
      `"${new Date(tx.createdAt).toLocaleString('en-NG')}"`,
      `"${(tx.narration || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `ARM_MMF_Inflow_Statement_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SETTLEMENT_READY':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Clock size={11} /> Settlement Ready
          </span>
        )
      case 'LOCKED':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ShieldCheck size={11} /> Locked & Earning 16%
          </span>
        )
      case 'SETTLED':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircle2 size={11} /> Settled / Redeemed
          </span>
        )
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#64748b',
            }}
          >
            {status}
          </span>
        )
    }
  }

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-faint, rgba(194, 80, 31, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #c2501f)',
              }}
            >
              <Landmark size={20} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              ARM Subscriptions & Redemption Portfolio
            </h1>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '20px',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              B2B2C Live MMF Position
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Asset & Resource Management Holding Company (ARM) • Product:{' '}
            <strong>
              {stats?.productCode || 'ARMMMF'} (
              {stats?.liveFundYieldRatePct
                ? `${stats.liveFundYieldRatePct.toFixed(2)}% Live NAV / `
                : ''}
              16.0% p.a. Daily Compounding)
            </strong>{' '}
            • Inflow access statement
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportInflowStatementCsv}
            disabled={filteredTransactions.length === 0}
            style={{
              height: '38px',
              gap: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Inflow Statement (CSV)</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchData(true)}
            disabled={loading}
            style={{
              height: '38px',
              gap: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'loader' : ''} />
            <span>Sync Live ARM</span>
          </button>
        </div>
      </div>

      {stats?.armSandbox && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: stats.armSandbox.connected ? '#f0fdf4' : 'var(--surface)',
            borderColor: stats.armSandbox.connected ? '#bbf7d0' : 'var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: stats.armSandbox.connected ? '#059669' : '#64748b',
                color: '#ffffff',
              }}
            >
              {stats.armSandbox.connected ? 'ARM API LIVE' : 'LOCAL LEDGER'}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
              Merchant: <strong>{stats.armSandbox.businessName || 'GoodTenant'}</strong> (
              <code>{stats.armSandbox.merchantId || 'ESTHER'}</code> • Membership{' '}
              <code>{stats.armSandbox.merchantMembershipId || '3005679'}</code> •{' '}
              {stats.armSandbox.merchantType || 'B2B2C'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px' }}>
            {stats.armSandbox.virtualAccounts.map((va) => (
              <span key={va.accountNumber} style={{ color: 'var(--text-muted)' }}>
                {va.bankName}: <strong style={{ color: 'var(--text)' }}>{va.accountNumber}</strong>
              </span>
            ))}
            {stats.netAssetValue && (
              <span style={{ color: 'var(--text-muted)' }}>
                Fund NAV: <strong style={{ color: '#059669' }}>₦{stats.netAssetValue}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            padding: '16px',
            marginBottom: '20px',
            borderColor: 'var(--danger, #ef4444)',
            color: 'var(--danger, #ef4444)',
            fontSize: '13.5px',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Summary KPI Cards ───────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Total Pooled Principal (MMF)
            </span>
            <Building2 size={18} color="var(--primary, #c2501f)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            {formatNaira(stats?.totalPooledPrincipalNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={13} />
            <span>Active Master Fund Position</span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Compounding Yield Accrued
            </span>
            <TrendingUp size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>
            +{formatNaira(stats?.totalAccruedYieldNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            16.0% p.a. daily compounding return
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Redemptions Disbursed
            </span>
            <CreditCard size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            {formatNaira(stats?.totalRedeemedNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Paid to registered bank accounts at maturity
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Enrolled ARM Savers
            </span>
            <UserCheck size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            {stats?.activeSaversCount || 0} active{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
              ({stats?.totalEnrolledCustomersCount || 0} registered)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={13} />
            <span>100% Auto-Consent on Record</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'CUSTOMERS' ? 700 : 500,
            color: activeTab === 'CUSTOMERS' ? 'var(--primary, #c2501f)' : 'var(--text-muted)',
            borderBottom: activeTab === 'CUSTOMERS' ? '2.5px solid var(--primary, #c2501f)' : 'none',
            cursor: 'pointer',
          }}
        >
          ARM Customers & Subscribers ({customers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INFLOWS')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'INFLOWS' ? 700 : 500,
            color: activeTab === 'INFLOWS' ? 'var(--primary, #c2501f)' : 'var(--text-muted)',
            borderBottom: activeTab === 'INFLOWS' ? '2.5px solid var(--primary, #c2501f)' : 'none',
            cursor: 'pointer',
          }}
        >
          Inflow Statement & Units Schedule ({transactions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('JOBS')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'JOBS' ? 700 : 500,
            color: activeTab === 'JOBS' ? 'var(--primary, #c2501f)' : 'var(--text-muted)',
            borderBottom: activeTab === 'JOBS' ? '2.5px solid var(--primary, #c2501f)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Activity size={14} />
          <span>Background Jobs ({jobs.length})</span>
          {jobsSummary.failed > 0 && (
            <span
              style={{
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
              }}
            >
              {jobsSummary.failed} failed
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONSENT')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'CONSENT' ? 700 : 500,
            color: activeTab === 'CONSENT' ? 'var(--primary, #c2501f)' : 'var(--text-muted)',
            borderBottom: activeTab === 'CONSENT' ? '2.5px solid var(--primary, #c2501f)' : 'none',
            cursor: 'pointer',
          }}
        >
          B2B2C Auto-Consent Verification Ledger
        </button>
      </div>

      {/* ── TAB 1: CUSTOMERS / SUBSCRIBERS ──────────────────────── */}
      {activeTab === 'CUSTOMERS' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search customer name, email, or ARM ID..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    background: 'var(--surface)',
                  }}
                />
              </div>

              <select
                value={customerStatusFilter}
                onChange={(e) => setCustomerStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  background: 'var(--surface)',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="LOCKED">Locked & Accumulating</option>
                <option value="SETTLEMENT_READY">Settlement Ready</option>
                <option value="SETTLED">Settled</option>
              </select>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {filteredCustomers.length} of {customers.length} subscribers
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-sunken, #f8f6f3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Subscriber / Tenant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ARM Membership / CRM</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Target Rent</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Principal Saved</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Accrued Yield (16%)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Total Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Dedicated Inflow DVA</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Lock Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Inflows</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No customers match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr
                      key={c.vaultUuid}
                      onClick={() => setDetailDrawer({ kind: 'CUSTOMER', item: c })}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                        cursor: 'pointer',
                      }}
                      title="Click to inspect full customer & ARM details"
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.fullName}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{c.email}</div>
                        {c.email.includes('arm-') && (
                          <span
                            style={{
                              marginTop: 3,
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#fef3c7',
                              color: '#92400e',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                          >
                            DEMO ACCOUNT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary, #c2501f)' }}>
                          {c.armCustomerMembershipId || omnibusMembershipId}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {c.armCrmAccountNumber || `${c.armCustomerMembershipId || omnibusMembershipId}-ARMMMF-01`} • {c.armSyncStatus} • Sec:{' '}
                          {c.armCompletedSections}/63
                        </div>
                        {(c.armPurchaseId || c.armWithdrawalId) && (
                          <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#059669', marginTop: 2 }}>
                            {c.armWithdrawalId
                              ? `WDL: ${c.armWithdrawalId.slice(0, 14)}…`
                              : `PUR: ${c.armPurchaseId!.slice(0, 14)}…`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{formatNaira(c.targetAmountNaira)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.cadence}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {formatNaira(c.currentPrincipalNaira)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>
                        +{formatNaira(c.accruedYieldNaira)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>
                        {formatNaira(c.currentBalanceNaira)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{c.dvaAccountNumber || 'Pending'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.dvaBankName}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(c.lockStatus)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomerEmail(c.email)
                            setActiveTab('INFLOWS')
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--primary, #c2501f)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{c.transactionsCount} Inflows</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: INFLOW STATEMENT & UNITS SCHEDULE ────────────── */}
      {activeTab === 'INFLOWS' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search sender, reference, or narration..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    background: 'var(--surface)',
                  }}
                />
              </div>

              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  background: 'var(--surface)',
                }}
              >
                <option value="ALL">All Flow Categories</option>
                <option value="DEPOSIT">Subscription Inflows (Deposits)</option>
                <option value="YIELD_ACCRUAL">Compounding NAV Yield</option>
                <option value="SETTLEMENT_DISBURSEMENT">Redemptions (Payouts)</option>
                <option value="CASHBACK">Cashback Bonus</option>
              </select>

              {selectedCustomerEmail && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'var(--primary-faint, rgba(194, 80, 31, 0.1))',
                    color: 'var(--primary, #c2501f)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>Filtering: {selectedCustomerEmail}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerEmail(null)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      color: 'var(--primary, #c2501f)',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {filteredTransactions.length} transaction records
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-sunken, #f8f6f3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Sender / Customer</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ARM Membership</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Flow Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Channel</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount (NGN)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Balance After</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No transaction records match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.uuid}
                      onClick={() => openTransactionDetail(tx)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                        cursor: 'pointer',
                      }}
                      title="Click to inspect full transaction & live ARM details"
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <div>{tx.reference}</div>
                        {tx.armInstructionId && (
                          <div style={{ fontSize: '10.5px', color: '#059669', marginTop: 2 }}>
                            ARM: {tx.armInstructionId.slice(0, 18)}
                            {tx.armInstructionId.length > 18 ? '…' : ''}
                            {tx.armLiveStatus ? ` (${tx.armLiveStatus})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{tx.customerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.customerEmail}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary, #c2501f)' }}>
                        {tx.armMembershipId}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              tx.type === 'DEPOSIT'
                                ? '#ecfdf5'
                                : tx.type === 'YIELD_ACCRUAL'
                                  ? '#eff6ff'
                                  : tx.type === 'SETTLEMENT_DISBURSEMENT'
                                    ? '#fef2f2'
                                    : '#fdf4ff',
                            color:
                              tx.type === 'DEPOSIT'
                                ? '#059669'
                                : tx.type === 'YIELD_ACCRUAL'
                                  ? '#2563eb'
                                  : tx.type === 'SETTLEMENT_DISBURSEMENT'
                                    ? '#dc2626'
                                    : '#9333ea',
                          }}
                        >
                          {tx.flowCategory}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {tx.channel}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: tx.type === 'SETTLEMENT_DISBURSEMENT' ? '#dc2626' : '#059669',
                        }}
                      >
                        {tx.type === 'SETTLEMENT_DISBURSEMENT' ? '-' : '+'}
                        {formatNaira(tx.amountNaira)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {formatNaira(tx.balanceAfterNaira)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleString('en-NG')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: BULLMQ BACKGROUND JOBS QUEUE ────────────────── */}
      {activeTab === 'JOBS' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#ecfdf5',
                  color: '#059669',
                }}
              >
                Subscriptions: {jobTypeSummary.subscribe}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#fff7ed',
                  color: '#c2501f',
                }}
              >
                Redemptions: {jobTypeSummary.redeem}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#eef2ff',
                  color: '#4338ca',
                }}
              >
                Onboarding: {jobTypeSummary.onboard}
              </span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#eff6ff',
                  color: '#2563eb',
                }}
              >
                Queued: {jobsSummary.queued}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#fef3c7',
                  color: '#b45309',
                }}
              >
                Processing: {jobsSummary.processing}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#ecfdf5',
                  color: '#059669',
                }}
              >
                Completed: {jobsSummary.completed}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: jobsSummary.failed > 0 ? '#fef2f2' : '#f1f5f9',
                  color: jobsSummary.failed > 0 ? '#dc2626' : '#64748b',
                }}
              >
                Failed: {jobsSummary.failed}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '200px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search ref, customer, ARM ID..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  style={{
                    padding: '7px 10px 7px 30px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    background: 'var(--surface)',
                  }}
                />
              </div>

              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  background: 'var(--surface)',
                }}
              >
                <option value="ALL">All Job Types</option>
                <option value="SUBSCRIBE">Subscriptions (SUBSCRIBE)</option>
                <option value="REDEEM">Redemptions (REDEEM)</option>
                <option value="ONBOARD">Onboarding (ONBOARD)</option>
              </select>

              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  background: 'var(--surface)',
                }}
              >
                <option value="ALL">All Job Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed (Action Required)</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-sunken, #f8f6f3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Job / Reference</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer & ARM ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type & Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status & Attempts</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ARM Instruction / Error</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Alerts Sent</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No ARM background jobs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr
                      key={job.uuid}
                      onClick={() => setDetailDrawer({ kind: 'JOB', item: job })}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      title="Click to inspect full job payload, ARM result, and audit timestamps"
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{job.reference}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          Tx: {job.armTransactionId.slice(0, 18)}…
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {new Date(job.createdAt).toLocaleString('en-NG')}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{job.customerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {job.customerEmail || '—'}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #c2501f)', marginTop: 2 }}>
                          ARM ID: {job.armMembershipId || omnibusMembershipId}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              job.jobType === 'REDEEM'
                                ? '#fff7ed'
                                : job.jobType === 'ONBOARD'
                                  ? '#eef2ff'
                                  : '#ecfdf5',
                            color:
                              job.jobType === 'REDEEM'
                                ? '#c2501f'
                                : job.jobType === 'ONBOARD'
                                  ? '#4338ca'
                                  : '#059669',
                          }}
                        >
                          {job.jobType}
                        </span>
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: job.jobType === 'REDEEM' ? '#dc2626' : '#059669',
                            fontWeight: 700,
                            marginTop: 4,
                          }}
                        >
                          {job.amountNaira > 0
                            ? `${job.jobType === 'REDEEM' ? '-' : '+'}${formatNaira(job.amountNaira)}`
                            : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              job.status === 'COMPLETED'
                                ? '#ecfdf5'
                                : job.status === 'FAILED'
                                  ? '#fef2f2'
                                  : job.status === 'PROCESSING'
                                    ? '#fef3c7'
                                    : '#eff6ff',
                            color:
                              job.status === 'COMPLETED'
                                ? '#059669'
                                : job.status === 'FAILED'
                                  ? '#dc2626'
                                  : job.status === 'PROCESSING'
                                    ? '#b45309'
                                    : '#2563eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {job.status === 'FAILED' && <AlertTriangle size={11} />}
                          {job.status === 'COMPLETED' && <CheckCircle2 size={11} />}
                          {job.status}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 3 }}>
                          Attempts: {job.attempts}/{job.maxAttempts}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        {job.armInstructionId ? (
                          <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#059669' }}>
                            {job.armInstructionId}
                          </div>
                        ) : job.lastError ? (
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: '#dc2626',
                              wordBreak: 'break-word',
                            }}
                          >
                            {job.lastError}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Awaiting ARM execution…
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11.5px' }}>
                        <div style={{ color: job.notifiedUserAt ? '#059669' : 'var(--text-muted)' }}>
                          User: {job.notifiedUserAt ? 'Sent' : '—'}
                        </div>
                        <div style={{ color: job.notifiedAdminAt ? '#059669' : 'var(--text-muted)' }}>
                          Admin: {job.notifiedAdminAt ? 'Sent' : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {job.canRetry ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryJob(job.uuid)
                            }}
                            disabled={retryingJobUuid === job.uuid}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>{retryingJobUuid === job.uuid ? 'Retrying…' : 'Retry'}</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--primary, #c2501f)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                            }}
                          >
                            <Eye size={12} /> Details
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: B2B2C CONSENT & COMPLIANCE LEDGER ────────────── */}
      {activeTab === 'CONSENT' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ maxWidth: '800px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
              B2B2C Customer Transact Consent Ledger (ARM Acceptance Criteria #2)
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Under the B2B2C partnership scope with Asset & Resource Management Holding Company (ARM),
              GoodTenant holds express auto-signed customer consent granting authority to transact (subscribe
              pooled funds into ARMMMF and execute redemptions to registered commercial bank accounts) on their behalf.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-sunken, #f8f6f3)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer Email</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>ARM Customer Membership ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Consent Form Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>SEC Suitability (Bitmask)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.userUuid}
                  onClick={() => setDetailDrawer({ kind: 'CUSTOMER', item: c })}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  title="Click to inspect full customer & consent details"
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.fullName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary, #c2501f)' }}>
                    {c.armCustomerMembershipId || omnibusMembershipId}
                  </td>
                  <td style={{ padding: '12px 16px' }}>Auto-Signed Digital Mandate (ARM B2B2C)</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#eff6ff',
                        color: '#2563eb',
                      }}
                    >
                      {c.armCompletedSections || 63}/63 Sections Verified
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#ecfdf5',
                        color: '#059669',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <ShieldCheck size={12} /> Auto-Consent Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SLIDE-OVER DETAIL DRAWER (CUSTOMER / TRANSACTION / JOB) ── */}
      {detailDrawer && (
        <div
          onClick={() => setDetailDrawer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              height: '100%',
              background: 'var(--surface, #ffffff)',
              boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.14)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'var(--surface-sunken, #f8f6f3)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--primary, #c2501f)',
                    marginBottom: 2,
                  }}
                >
                  {detailDrawer.kind === 'CUSTOMER'
                    ? 'ARM Subscriber & Vault Record'
                    : detailDrawer.kind === 'TRANSACTION'
                      ? 'ARM Ledger Transaction Record'
                      : `ARM Background Job (${detailDrawer.item.jobType})`}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {detailDrawer.kind === 'CUSTOMER'
                    ? detailDrawer.item.fullName
                    : detailDrawer.kind === 'TRANSACTION'
                      ? detailDrawer.item.reference
                      : detailDrawer.item.reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailDrawer(null)}
                aria-label="Close detail view"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface, #ffffff)',
                  borderRadius: '8px',
                  width: '34px',
                  height: '34px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {(() => {
                const renderCopyRow = (label: string, value: string | null | undefined, keyId: string, highlight = false) => {
                  const display = value || '—'
                  return (
                    <div
                      key={keyId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '12.5px',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, justifyContent: 'flex-end' }}>
                        <span
                          style={{
                            fontFamily: value ? 'monospace' : 'inherit',
                            fontWeight: highlight ? 700 : 600,
                            color: highlight ? '#059669' : 'var(--text)',
                            wordBreak: 'break-all',
                            textAlign: 'right',
                          }}
                        >
                          {display}
                        </span>
                        {value && (
                          <button
                            type="button"
                            onClick={() => copyValue(keyId, value)}
                            title={`Copy ${label}`}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: '2px',
                              cursor: 'pointer',
                              color: copiedKey === keyId ? '#059669' : 'var(--text-muted)',
                              flexShrink: 0,
                            }}
                          >
                            {copiedKey === keyId ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }

                if (detailDrawer.kind === 'CUSTOMER') {
                  const c = detailDrawer.item
                  const resolvedMemId = c.armCustomerMembershipId || omnibusMembershipId
                  const isOmnibus = resolvedMemId === omnibusMembershipId
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL BALANCE</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{formatNaira(c.currentBalanceNaira)}</div>
                        </div>
                        <div style={{ padding: '12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>ACCRUED YIELD ({c.annualYieldRatePct}%)</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: 2 }}>+{formatNaira(c.accruedYieldNaira)}</div>
                        </div>
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PRINCIPAL SAVED</div>
                          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: 2 }}>{formatNaira(c.currentPrincipalNaira)}</div>
                        </div>
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TARGET RENT ({c.cadence})</div>
                          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: 2 }}>{formatNaira(c.targetAmountNaira)}</div>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          ARM Connect Identity & Positions
                        </h4>
                        {renderCopyRow(
                          'ARM Membership ID',
                          `${resolvedMemId}${isOmnibus ? ' (Merchant Omnibus)' : ' (Individual B2B2C)'}`,
                          'cust-mem',
                          true,
                        )}
                        {renderCopyRow(
                          'ARM Product Account / CRM',
                          c.armCrmAccountNumber || `${resolvedMemId}-ARMMMF-01`,
                          'cust-crm',
                        )}
                        {renderCopyRow('ARM Tracking ID', c.armTrackingId, 'cust-track')}
                        {renderCopyRow('ARM Sync Status', `${c.armSyncStatus} (${c.armCompletedSections}/63 sections)`, 'cust-sync')}
                        {renderCopyRow('Latest ARM Purchase ID', c.armPurchaseId, 'cust-pur', Boolean(c.armPurchaseId))}
                        {renderCopyRow('Latest ARM Withdrawal ID', c.armWithdrawalId, 'cust-wdl', Boolean(c.armWithdrawalId))}
                      </div>

                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          Subscriber & Vault Details
                        </h4>
                        {renderCopyRow('Email', c.email, 'cust-email')}
                        {renderCopyRow('Phone', c.phone, 'cust-phone')}
                        {renderCopyRow('User UUID', c.userUuid, 'cust-uu')}
                        {renderCopyRow('Vault UUID', c.vaultUuid, 'cust-vu')}
                        {renderCopyRow('Lock Status', c.lockStatus, 'cust-lock')}
                        {renderCopyRow('Product Option', c.productOption, 'cust-prod')}
                        {renderCopyRow('Due / Unlock Date', `${c.contractualDueDate} (Unlocks ${c.unlockDate}, ${c.daysRemaining}d left)`, 'cust-dates')}
                        {renderCopyRow('Dedicated Inflow DVA', c.dvaAccountNumber ? `${c.dvaAccountNumber} (${c.dvaBankName})` : 'Pending', 'cust-dva')}
                        {renderCopyRow('DVA Account Name', c.dvaAccountName, 'cust-dvaname')}
                        {renderCopyRow('Upward Savings Score', `${c.upwardScore} / 100`, 'cust-score')}
                        {renderCopyRow('Created At', new Date(c.createdAt).toLocaleString('en-NG'), 'cust-created')}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedCustomerEmail(c.email)
                            setActiveTab('INFLOWS')
                            setDetailDrawer(null)
                          }}
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <ExternalLink size={14} />
                          <span>View Customer Inflows ({c.transactionsCount})</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setJobSearch(c.email)
                            setActiveTab('JOBS')
                            setDetailDrawer(null)
                          }}
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Activity size={14} />
                          <span>View Background Jobs</span>
                        </button>
                      </div>
                    </>
                  )
                }

                if (detailDrawer.kind === 'TRANSACTION') {
                  const tx = detailDrawer.item
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ padding: '12px', borderRadius: '8px', background: tx.type === 'SETTLEMENT_DISBURSEMENT' ? '#fef2f2' : '#ecfdf5', border: `1px solid ${tx.type === 'SETTLEMENT_DISBURSEMENT' ? '#fecaca' : '#a7f3d0'}` }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: tx.type === 'SETTLEMENT_DISBURSEMENT' ? '#dc2626' : '#059669' }}>
                            {tx.flowCategory.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '19px', fontWeight: 800, color: tx.type === 'SETTLEMENT_DISBURSEMENT' ? '#dc2626' : '#059669', marginTop: 2 }}>
                            {tx.type === 'SETTLEMENT_DISBURSEMENT' ? '-' : '+'}{formatNaira(tx.amountNaira)}
                          </div>
                        </div>
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BALANCE AFTER</div>
                          <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{formatNaira(tx.balanceAfterNaira)}</div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                            ARM Connect Execution & Status
                          </h4>
                          {(tx.armPurchaseId || tx.armTransactionId) && (
                            <button
                              type="button"
                              onClick={() => handleCheckLiveArmStatus(tx.uuid)}
                              disabled={checkingLiveTx}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #a7f3d0',
                                background: '#ecfdf5',
                                color: '#059669',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <RefreshCw size={11} className={checkingLiveTx ? 'loader' : ''} />
                              <span>{checkingLiveTx ? 'Checking ARM…' : 'Verify Live on ARM'}</span>
                            </button>
                          )}
                        </div>
                        {renderCopyRow('ARM Membership ID', tx.armMembershipId, 'tx-mem', true)}
                        {renderCopyRow('ARM Account Number', tx.armAccountNumber || `${tx.armMembershipId}-ARMMMF-01`, 'tx-acct')}
                        {renderCopyRow('ARM Purchase ID', tx.armPurchaseId, 'tx-pur', Boolean(tx.armPurchaseId))}
                        {renderCopyRow('ARM Withdrawal ID', tx.armWithdrawalId, 'tx-wdl', Boolean(tx.armWithdrawalId))}
                        {renderCopyRow('ARM Transaction ID', tx.armTransactionId, 'tx-armtx')}
                        {renderCopyRow('ARM Live / Sync Status', tx.armLiveStatus || tx.armSyncStatus || 'N/A', 'tx-status')}
                      </div>

                      {liveTxStatus && (
                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669', marginBottom: 6 }}>
                            Live ARM API Response (checked {new Date(liveTxStatus.checkedAt).toLocaleTimeString('en-NG')})
                          </div>
                          {liveTxStatus.liveItems.length === 0 ? (
                            <div style={{ fontSize: '12px', color: '#475569' }}>
                              ARM returned no settlement records yet for this ID (withdrawals or queued T+1 sandbox batches may take until settlement cut-off).
                            </div>
                          ) : (
                            <pre style={{ margin: 0, fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(liveTxStatus.liveItems, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}

                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          Ledger & Customer Details
                        </h4>
                        {renderCopyRow('Reference', tx.reference, 'tx-ref')}
                        {renderCopyRow('Transaction UUID', tx.uuid, 'tx-uuid')}
                        {renderCopyRow('Vault UUID', tx.vaultUuid, 'tx-vuuid')}
                        {renderCopyRow('Customer', `${tx.customerName} (${tx.customerEmail})`, 'tx-cust')}
                        {renderCopyRow('Channel', tx.channel, 'tx-chan')}
                        {renderCopyRow('Principal / Yield Delta', `${formatNaira(tx.principalDeltaNaira)} / ${formatNaira(tx.yieldDeltaNaira)}`, 'tx-deltas')}
                        {renderCopyRow('DVA Account', tx.dvaAccountNumber ? `${tx.dvaAccountNumber}${tx.dvaBankName ? ` (${tx.dvaBankName})` : ''}` : null, 'tx-dva')}
                        {renderCopyRow('Timestamp', new Date(tx.createdAt).toLocaleString('en-NG'), 'tx-date')}
                        {renderCopyRow('Narration', tx.narration, 'tx-narr')}
                      </div>

                      {tx.linkedJob && (
                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '12px', fontWeight: 700 }}>Linked BullMQ Job ({tx.linkedJob.jobType})</span>
                            <button
                              type="button"
                              onClick={() => {
                                const fullJob = jobs.find((j) => j.uuid === tx.linkedJob?.uuid)
                                if (fullJob) {
                                  setDetailDrawer({ kind: 'JOB', item: fullJob })
                                } else {
                                  setJobSearch(tx.reference)
                                  setActiveTab('JOBS')
                                  setDetailDrawer(null)
                                }
                              }}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: 'var(--primary, #c2501f)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Open Job →
                            </button>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Status: <strong>{tx.linkedJob.status}</strong> • Attempts: {tx.linkedJob.attempts}/{tx.linkedJob.maxAttempts}
                          </div>
                        </div>
                      )}

                      {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                            Raw Metadata
                          </h4>
                          <pre
                            style={{
                              margin: 0,
                              padding: '12px',
                              borderRadius: '8px',
                              background: '#0f172a',
                              color: '#e2e8f0',
                              fontSize: '11.5px',
                              overflowX: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {JSON.stringify(tx.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  )
                }

                // JOB detail view
                const job = detailDrawer.item
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>JOB TYPE & STATUS</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, marginTop: 2 }}>
                          {job.jobType} • <span style={{ color: job.status === 'COMPLETED' ? '#059669' : job.status === 'FAILED' ? '#dc2626' : '#2563eb' }}>{job.status}</span>
                        </div>
                      </div>
                      <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-sunken, #f8f6f3)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>AMOUNT & ATTEMPTS</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, marginTop: 2 }}>
                          {job.amountNaira > 0 ? formatNaira(job.amountNaira) : '—'} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>({job.attempts}/{job.maxAttempts})</span>
                        </div>
                      </div>
                    </div>

                    {job.lastError && (
                      <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12.5px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={14} /> Last Error
                        </div>
                        <div style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>{job.lastError}</div>
                      </div>
                    )}

                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                        Execution & Idempotency Identifiers
                      </h4>
                      {renderCopyRow('ARM Instruction ID', job.armInstructionId, 'job-inst', Boolean(job.armInstructionId))}
                      {renderCopyRow('ARM Transaction ID', job.armTransactionId, 'job-armtx')}
                      {renderCopyRow('ARM Membership ID', job.armMembershipId || omnibusMembershipId, 'job-mem', true)}
                      {renderCopyRow('ARM Account Number', job.armAccountNumber || `${job.armMembershipId || omnibusMembershipId}-ARMMMF-01`, 'job-acct')}
                      {renderCopyRow('Reference', job.reference, 'job-ref')}
                      {renderCopyRow('Idempotency Key', job.idempotencyKey, 'job-idem')}
                      {renderCopyRow('Job UUID', job.uuid, 'job-uuid')}
                      {renderCopyRow('Customer', `${job.customerName} (${job.customerEmail || '—'})`, 'job-cust')}
                      {renderCopyRow('Vault UUID', job.vaultUuid, 'job-vu')}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                        Lifecycle & Notification Audit
                      </h4>
                      {renderCopyRow('Created At', new Date(job.createdAt).toLocaleString('en-NG'), 'job-c')}
                      {renderCopyRow('Locked At', job.lockedAt ? new Date(job.lockedAt).toLocaleString('en-NG') : null, 'job-l')}
                      {renderCopyRow('Completed At', job.completedAt ? new Date(job.completedAt).toLocaleString('en-NG') : null, 'job-comp')}
                      {renderCopyRow('Failed At', job.failedAt ? new Date(job.failedAt).toLocaleString('en-NG') : null, 'job-fail')}
                      {renderCopyRow('User Notified At', job.notifiedUserAt ? new Date(job.notifiedUserAt).toLocaleString('en-NG') : 'Not Sent', 'job-nu')}
                      {renderCopyRow('Admin Notified At', job.notifiedAdminAt ? new Date(job.notifiedAdminAt).toLocaleString('en-NG') : 'Not Sent', 'job-na')}
                    </div>

                    {job.canRetry && (
                      <button
                        type="button"
                        onClick={() => handleRetryJob(job.uuid)}
                        disabled={retryingJobUuid === job.uuid}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <RotateCcw size={14} />
                        <span>{retryingJobUuid === job.uuid ? 'Re-queuing safely…' : 'Safely Retry Failed ARM Job'}</span>
                      </button>
                    )}

                    {job.result && (
                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          ARM Execution Result
                        </h4>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px',
                            borderRadius: '8px',
                            background: '#0f172a',
                            color: '#86efac',
                            fontSize: '11.5px',
                            overflowX: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {JSON.stringify(job.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {job.payload && (
                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          Queued Job Payload
                        </h4>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px',
                            borderRadius: '8px',
                            background: '#0f172a',
                            color: '#e2e8f0',
                            fontSize: '11.5px',
                            overflowX: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {JSON.stringify(job.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
