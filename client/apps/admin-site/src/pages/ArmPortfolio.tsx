import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { InternalLedgerTab } from '../components/arm/InternalLedgerTab'
import { ActivationCashbackTab } from '../components/arm/ActivationCashbackTab'
import {
  Landmark,
  Search,
  RefreshCw,
  FileSpreadsheet,
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
  FileText,
  FileCheck2,
  Home,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import '../styles/finance-console.css'

const ADMIN_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

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
  consentUuid?: string | null
  consentAcceptedAt?: string | null
  consentTermsVersion?: string | null
  consentDocVersion?: string | null
  consentIpAddress?: string | null
  hasConsentDocument?: boolean
  maskedBvn?: string | null
  maskedNin?: string | null
  meansOfIdType?: string | null
  meansOfIdNumberMasked?: string | null
  meansOfIdFileName?: string | null
  hasIdDocument?: boolean
  residentialAddress?: string | null
  utilityBillFileName?: string | null
  hasUtilityBillDocument?: boolean
  addressVerificationStatus?: string | null
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
  const [activeTab, setActiveTab] = useState<
    'CUSTOMERS' | 'INFLOWS' | 'JOBS' | 'CONSENT' | 'LEDGER' | 'CASHBACK'
  >('CUSTOMERS')
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

  const openCustomerDocument = async (
    userUuid: string,
    docType: 'consent' | 'id_card' | 'utility_bill',
  ) => {
    setError(null)
    try {
      const path =
        docType === 'consent'
          ? `/admin/arm/customers/${encodeURIComponent(userUuid)}/consent-document`
          : `/admin/arm/customers/${encodeURIComponent(userUuid)}/kyc-document/${docType}`
      const response = await fetch(`${ADMIN_API_BASE}${path}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Could not load ${docType.replace('_', ' ')} document (${response.status})`)
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch (err: any) {
      setError(err?.message || 'Failed to open customer document')
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
          <span className="fin-pill fin-pill--green">
            <span className="fin-pill__dot" /> Settlement Ready
          </span>
        )
      case 'LOCKED':
        return (
          <span className="fin-pill fin-pill--blue">
            <span className="fin-pill__dot" /> Locked &amp; Earning
          </span>
        )
      case 'SETTLED':
        return (
          <span className="fin-pill fin-pill--neutral">
            <span className="fin-pill__dot" /> Settled
          </span>
        )
      default:
        return (
          <span className="fin-pill fin-pill--neutral">
            <span className="fin-pill__dot" /> {status}
          </span>
        )
    }
  }

  return (
    <div className="fin-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="fin-header">
        <div className="fin-header__left">
          <div className="fin-header__title-row">
            <span className="fin-header__icon">
              <Landmark size={19} />
            </span>
            <h1 className="fin-header__title">Rent Savings &amp; ARM Portfolio</h1>
            <span className="fin-pill fin-pill--green">
              <span className="fin-pill__dot" />
              {stats?.productCode || 'ARMMMF'}
              {stats?.liveFundYieldRatePct
                ? ` · ${stats.liveFundYieldRatePct.toFixed(2)}% Live NAV`
                : ' · Live MMF'}
            </span>
          </div>
          <p className="fin-header__subtitle">
            Pooled ARM Money Market Fund positions, subscriber vaults, inflow statements, background
            jobs, and dual-ledger economics.
          </p>
        </div>

        <div className="fin-header__actions">
          <button
            type="button"
            className="fin-btn fin-btn--ghost"
            onClick={() => fetchData(true)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'loader' : ''} />
            <span>Sync Live ARM</span>
          </button>
          <button
            type="button"
            className="fin-btn fin-btn--primary"
            onClick={exportInflowStatementCsv}
            disabled={filteredTransactions.length === 0}
          >
            <FileSpreadsheet size={14} />
            <span>Export Inflows CSV</span>
          </button>
        </div>
      </div>

      {/* ── Compact ARM Connection Strip ───────────────────────── */}
      {stats?.armSandbox && (
        <div className={`fin-banner ${stats.armSandbox.connected ? 'fin-banner--live' : ''}`}>
          <div className="fin-banner__group">
            <span
              className={`fin-pill ${
                stats.armSandbox.connected ? 'fin-pill--green' : 'fin-pill--neutral'
              }`}
            >
              <span className="fin-pill__dot" />
              {stats.armSandbox.connected ? 'ARM API Live' : 'Local Ledger'}
            </span>
            <span className="fin-banner__item">
              Merchant: <strong>{stats.armSandbox.businessName || 'GoodTenant'}</strong>
              <span className="fin-banner__code">{stats.armSandbox.merchantId || 'ESTHER'}</span>
              <span className="fin-banner__code">
                #{stats.armSandbox.merchantMembershipId || '3005679'}
              </span>
            </span>
          </div>

          <div className="fin-banner__group">
            {stats.armSandbox.virtualAccounts.map((va) => (
              <span key={va.accountNumber} className="fin-banner__item">
                {va.bankName}: <strong className="fin-mono">{va.accountNumber}</strong>
              </span>
            ))}
            {stats.netAssetValue && (
              <span className="fin-banner__item">
                NAV: <strong className="fin-text-green">₦{stats.netAssetValue}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="fin-alert fin-alert--error">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary KPI Strip ──────────────────────────────────── */}
      <div className="fin-kpi-grid">
        <div className="fin-kpi fin-kpi--dark">
          <div className="fin-kpi__top">
            <span className="fin-kpi__label">Pooled Principal (MMF)</span>
            <Building2 size={16} className="fin-kpi__icon" />
          </div>
          <div className="fin-kpi__value">
            {formatNaira(stats?.totalPooledPrincipalNaira || 0)}
          </div>
          <div className="fin-kpi__sub">
            <TrendingUp size={13} color="#4ade80" />
            <span>Active Master Fund Position</span>
          </div>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi__top">
            <span className="fin-kpi__label">Compounding Yield Accrued</span>
            <TrendingUp size={16} color="#10b981" />
          </div>
          <div className="fin-kpi__value fin-kpi__value--green">
            +{formatNaira(stats?.totalAccruedYieldNaira || 0)}
          </div>
          <div className="fin-kpi__sub">Daily compounding across active vaults</div>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi__top">
            <span className="fin-kpi__label">Redemptions Disbursed</span>
            <CreditCard size={16} className="fin-kpi__icon" />
          </div>
          <div className="fin-kpi__value">{formatNaira(stats?.totalRedeemedNaira || 0)}</div>
          <div className="fin-kpi__sub">Settled to registered bank accounts</div>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi__top">
            <span className="fin-kpi__label">Enrolled Savers</span>
            <UserCheck size={16} className="fin-kpi__icon" />
          </div>
          <div className="fin-kpi__value">
            {stats?.activeSaversCount || 0}{' '}
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#64748b' }}>
              / {stats?.totalEnrolledCustomersCount || 0} registered
            </span>
          </div>
          <div className="fin-kpi__sub">
            <ShieldCheck size={13} color="#059669" />
            <span>
              {customers.filter((c) => c.b2b2cConsentOnRecord).length}/{customers.length} consent
              signed
            </span>
          </div>
        </div>
      </div>

      {/* ── Segmented Tab Navigation ───────────────────────────── */}
      <div className="fin-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`fin-tab ${activeTab === 'CUSTOMERS' ? 'fin-tab--active' : ''}`}
        >
          <span>Savers</span>
          <span className="fin-tab__count">{customers.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INFLOWS')}
          className={`fin-tab ${activeTab === 'INFLOWS' ? 'fin-tab--active' : ''}`}
        >
          <span>Inflows &amp; Units</span>
          <span className="fin-tab__count">{transactions.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('JOBS')}
          className={`fin-tab ${activeTab === 'JOBS' ? 'fin-tab--active' : ''}`}
        >
          <Activity size={14} />
          <span>Jobs</span>
          <span className="fin-tab__count">{jobs.length}</span>
          {jobsSummary.failed > 0 && (
            <span className="fin-tab__alert">{jobsSummary.failed} failed</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LEDGER')}
          className={`fin-tab ${activeTab === 'LEDGER' ? 'fin-tab--active' : ''}`}
        >
          <span>Dual Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONSENT')}
          className={`fin-tab ${activeTab === 'CONSENT' ? 'fin-tab--active' : ''}`}
        >
          <span>Consent</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CASHBACK')}
          className={`fin-tab ${activeTab === 'CASHBACK' ? 'fin-tab--active' : ''}`}
        >
          <span>Cashback</span>
        </button>
      </div>

      {/* ── TAB 1: CUSTOMERS / SUBSCRIBERS ──────────────────────── */}
      {activeTab === 'CUSTOMERS' && (
        <div className="fin-panel">
          <div className="fin-panel__head">
            <div className="fin-toolbar">
              <div className="fin-search">
                <Search size={14} className="fin-search__icon" />
                <input
                  type="text"
                  className="fin-input"
                  placeholder="Search saver name, email, or ARM ID…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>

              <select
                className="fin-select"
                value={customerStatusFilter}
                onChange={(e) => setCustomerStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="LOCKED">Locked &amp; Accumulating</option>
                <option value="SETTLEMENT_READY">Settlement Ready</option>
                <option value="SETTLED">Settled</option>
              </select>
            </div>

            <span className="fin-panel__meta">
              {filteredCustomers.length} of {customers.length} savers
            </span>
          </div>

          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Subscriber</th>
                  <th>ARM Account</th>
                  <th className="fin-num">Target Rent</th>
                  <th className="fin-num">Principal</th>
                  <th className="fin-num">Accrued Yield</th>
                  <th className="fin-num">Total Balance</th>
                  <th>Inflow DVA</th>
                  <th>Status</th>
                  <th className="fin-num">Inflows</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="fin-empty">
                      No savers match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr
                      key={c.vaultUuid}
                      className="fin-table__row--clickable"
                      onClick={() => setDetailDrawer({ kind: 'CUSTOMER', item: c })}
                      title="Click to inspect full customer & ARM details"
                    >
                      <td>
                        <div className="fin-cell-primary">{c.fullName}</div>
                        <div className="fin-cell-sub">{c.email}</div>
                        {c.email.includes('arm-') && (
                          <span
                            className="fin-pill fin-pill--amber"
                            style={{ marginTop: 4, fontSize: '10px', padding: '1px 6px' }}
                          >
                            Demo Account
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fin-cell-primary fin-text-clay">
                          {c.armCustomerMembershipId || omnibusMembershipId}
                        </div>
                        <div className="fin-cell-sub">
                          {c.armSyncStatus} · KYC {c.armCompletedSections}/63
                        </div>
                        {(c.armPurchaseId || c.armWithdrawalId) && (
                          <div className="fin-cell-sub fin-mono fin-text-green">
                            {c.armWithdrawalId
                              ? `WDL: ${c.armWithdrawalId.slice(0, 14)}…`
                              : `PUR: ${c.armPurchaseId!.slice(0, 14)}…`}
                          </div>
                        )}
                      </td>
                      <td className="fin-num">
                        <div className="fin-cell-primary">{formatNaira(c.targetAmountNaira)}</div>
                        <div className="fin-cell-sub">{c.cadence}</div>
                      </td>
                      <td className="fin-num">{formatNaira(c.currentPrincipalNaira)}</td>
                      <td className="fin-num fin-text-green">+{formatNaira(c.accruedYieldNaira)}</td>
                      <td className="fin-num fin-cell-primary">
                        {formatNaira(c.currentBalanceNaira)}
                      </td>
                      <td>
                        <div className="fin-cell-primary fin-mono">
                          {c.dvaAccountNumber || 'Pending'}
                        </div>
                        <div className="fin-cell-sub">{c.dvaBankName}</div>
                      </td>
                      <td>{getStatusBadge(c.lockStatus)}</td>
                      <td className="fin-num">
                        <button
                          type="button"
                          className="fin-btn fin-btn--ghost fin-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomerEmail(c.email)
                            setActiveTab('INFLOWS')
                          }}
                        >
                          <span>{c.transactionsCount}</span>
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
        <div className="fin-panel">
          <div className="fin-panel__head">
            <div className="fin-toolbar">
              <div className="fin-search">
                <Search size={14} className="fin-search__icon" />
                <input
                  type="text"
                  className="fin-input"
                  placeholder="Search sender, reference, or narration…"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />
              </div>

              <select
                className="fin-select"
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
              >
                <option value="ALL">All Flow Categories</option>
                <option value="DEPOSIT">Subscription Inflows (Deposits)</option>
                <option value="YIELD_ACCRUAL">Compounding NAV Yield</option>
                <option value="SETTLEMENT_DISBURSEMENT">Redemptions (Payouts)</option>
                <option value="CASHBACK">Cashback Bonus</option>
              </select>

              {selectedCustomerEmail && (
                <span className="fin-filter-tag">
                  <span>{selectedCustomerEmail}</span>
                  <button
                    type="button"
                    className="fin-filter-tag__x"
                    onClick={() => setSelectedCustomerEmail(null)}
                    aria-label="Clear customer filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <span className="fin-panel__meta">{filteredTransactions.length} transactions</span>
          </div>

          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>ARM ID</th>
                  <th>Category</th>
                  <th>Channel</th>
                  <th className="fin-num">Amount</th>
                  <th className="fin-num">Balance After</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fin-empty">
                      No transaction records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.uuid}
                      className="fin-table__row--clickable"
                      onClick={() => openTransactionDetail(tx)}
                      title="Click to inspect full transaction & live ARM details"
                    >
                      <td>
                        <div className="fin-mono fin-cell-primary">{tx.reference}</div>
                        {tx.armInstructionId && (
                          <div className="fin-cell-sub fin-mono fin-text-green">
                            ARM: {tx.armInstructionId.slice(0, 18)}
                            {tx.armInstructionId.length > 18 ? '…' : ''}
                            {tx.armLiveStatus ? ` (${tx.armLiveStatus})` : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fin-cell-primary">{tx.customerName}</div>
                        <div className="fin-cell-sub">{tx.customerEmail}</div>
                      </td>
                      <td className="fin-text-clay fin-mono">{tx.armMembershipId}</td>
                      <td>
                        <span
                          className={`fin-pill ${
                            tx.type === 'DEPOSIT'
                              ? 'fin-pill--green'
                              : tx.type === 'YIELD_ACCRUAL'
                                ? 'fin-pill--blue'
                                : tx.type === 'SETTLEMENT_DISBURSEMENT'
                                  ? 'fin-pill--red'
                                  : 'fin-pill--purple'
                          }`}
                        >
                          {tx.flowCategory}
                        </span>
                      </td>
                      <td className="fin-text-muted">{tx.channel}</td>
                      <td
                        className={`fin-num ${
                          tx.type === 'SETTLEMENT_DISBURSEMENT'
                            ? 'fin-text-red'
                            : 'fin-text-green'
                        }`}
                      >
                        {tx.type === 'SETTLEMENT_DISBURSEMENT' ? '−' : '+'}
                        {formatNaira(tx.amountNaira)}
                      </td>
                      <td className="fin-num fin-cell-primary">
                        {formatNaira(tx.balanceAfterNaira)}
                      </td>
                      <td className="fin-text-muted">
                        {new Date(tx.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
        <div className="fin-panel">
          {/* Interactive Quick-Filter Bar (replaces passive noisy badge soup) */}
          <div className="fin-chip-bar">
            <button
              type="button"
              className={`fin-chip ${jobStatusFilter === 'ALL' ? 'fin-chip--active' : ''}`}
              onClick={() => setJobStatusFilter('ALL')}
            >
              All ({jobs.length})
            </button>
            <button
              type="button"
              className={`fin-chip ${jobStatusFilter === 'QUEUED' ? 'fin-chip--active' : ''}`}
              onClick={() =>
                setJobStatusFilter(jobStatusFilter === 'QUEUED' ? 'ALL' : 'QUEUED')
              }
            >
              Queued ({jobsSummary.queued})
            </button>
            <button
              type="button"
              className={`fin-chip ${jobStatusFilter === 'PROCESSING' ? 'fin-chip--active' : ''}`}
              onClick={() =>
                setJobStatusFilter(jobStatusFilter === 'PROCESSING' ? 'ALL' : 'PROCESSING')
              }
            >
              Processing ({jobsSummary.processing})
            </button>
            <button
              type="button"
              className={`fin-chip ${jobStatusFilter === 'COMPLETED' ? 'fin-chip--active' : ''}`}
              onClick={() =>
                setJobStatusFilter(jobStatusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')
              }
            >
              Completed ({jobsSummary.completed})
            </button>
            <button
              type="button"
              className={`fin-chip ${jobsSummary.failed > 0 ? 'fin-chip--danger' : ''} ${
                jobStatusFilter === 'FAILED' ? 'fin-chip--active' : ''
              }`}
              onClick={() =>
                setJobStatusFilter(jobStatusFilter === 'FAILED' ? 'ALL' : 'FAILED')
              }
            >
              Failed ({jobsSummary.failed})
            </button>

            <span className="fin-chip-sep" />

            <button
              type="button"
              className={`fin-chip ${jobTypeFilter === 'SUBSCRIBE' ? 'fin-chip--active' : ''}`}
              onClick={() =>
                setJobTypeFilter(jobTypeFilter === 'SUBSCRIBE' ? 'ALL' : 'SUBSCRIBE')
              }
            >
              Subscriptions ({jobTypeSummary.subscribe})
            </button>
            <button
              type="button"
              className={`fin-chip ${jobTypeFilter === 'REDEEM' ? 'fin-chip--active' : ''}`}
              onClick={() =>
                setJobTypeFilter(jobTypeFilter === 'REDEEM' ? 'ALL' : 'REDEEM')
              }
            >
              Redemptions ({jobTypeSummary.redeem})
            </button>
            <button
              type="button"
              className={`fin-chip ${jobTypeFilter === 'ONBOARD' ? 'fin-chip--active' : ''}`}
              onClick={() =>
                setJobTypeFilter(jobTypeFilter === 'ONBOARD' ? 'ALL' : 'ONBOARD')
              }
            >
              Onboarding ({jobTypeSummary.onboard})
            </button>
          </div>

          <div className="fin-panel__head">
            <div className="fin-toolbar">
              <div className="fin-search">
                <Search size={14} className="fin-search__icon" />
                <input
                  type="text"
                  className="fin-input"
                  placeholder="Search reference, customer, or ARM ID…"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                />
              </div>

              {(jobTypeFilter !== 'ALL' || jobStatusFilter !== 'ALL' || jobSearch.trim()) && (
                <button
                  type="button"
                  className="fin-btn fin-btn--ghost fin-btn--sm"
                  onClick={() => {
                    setJobTypeFilter('ALL')
                    setJobStatusFilter('ALL')
                    setJobSearch('')
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <span className="fin-panel__meta">
              {filteredJobs.length} of {jobs.length} jobs
            </span>
          </div>

          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Job / Reference</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th className="fin-num">Amount</th>
                  <th>Status</th>
                  <th>ARM Result / Error</th>
                  <th>Alerts</th>
                  <th className="fin-num">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fin-empty">
                      No ARM background jobs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr
                      key={job.uuid}
                      className="fin-table__row--clickable"
                      onClick={() => setDetailDrawer({ kind: 'JOB', item: job })}
                      title="Click to inspect full job payload, ARM result, and audit timestamps"
                    >
                      <td>
                        <div className="fin-mono fin-cell-primary">{job.reference}</div>
                        <div className="fin-cell-sub fin-mono">
                          Tx: {job.armTransactionId.slice(0, 16)}… ·{' '}
                          {new Date(job.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="fin-cell-primary">{job.customerName}</div>
                        <div className="fin-cell-sub">
                          {job.customerEmail || '—'} ·{' '}
                          <span className="fin-text-clay">
                            {job.armMembershipId || omnibusMembershipId}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`fin-pill ${
                            job.jobType === 'REDEEM'
                              ? 'fin-pill--clay'
                              : job.jobType === 'ONBOARD'
                                ? 'fin-pill--purple'
                                : 'fin-pill--green'
                          }`}
                        >
                          {job.jobType}
                        </span>
                      </td>
                      <td
                        className={`fin-num ${
                          job.amountNaira > 0
                            ? job.jobType === 'REDEEM'
                              ? 'fin-text-red'
                              : 'fin-text-green'
                            : 'fin-text-muted'
                        }`}
                      >
                        {job.amountNaira > 0
                          ? `${job.jobType === 'REDEEM' ? '−' : '+'}${formatNaira(job.amountNaira)}`
                          : '—'}
                      </td>
                      <td>
                        <span
                          className={`fin-pill ${
                            job.status === 'COMPLETED'
                              ? 'fin-pill--green'
                              : job.status === 'FAILED'
                                ? 'fin-pill--red'
                                : job.status === 'PROCESSING'
                                  ? 'fin-pill--amber'
                                  : 'fin-pill--blue'
                          }`}
                        >
                          <span className="fin-pill__dot" />
                          {job.status}
                        </span>
                        <div className="fin-cell-sub">
                          Try {job.attempts}/{job.maxAttempts}
                        </div>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        {job.armInstructionId ? (
                          <div className="fin-mono fin-text-green">{job.armInstructionId}</div>
                        ) : job.lastError ? (
                          <div
                            className="fin-text-red"
                            style={{ fontSize: '11.5px', wordBreak: 'break-word' }}
                          >
                            {job.lastError}
                          </div>
                        ) : (
                          <span className="fin-text-muted">Awaiting ARM…</span>
                        )}
                      </td>
                      <td>
                        <div className="fin-cell-sub" style={{ marginTop: 0 }}>
                          User:{' '}
                          <strong style={{ color: job.notifiedUserAt ? '#047857' : '#94a3b8' }}>
                            {job.notifiedUserAt ? 'Sent' : '—'}
                          </strong>
                        </div>
                        <div className="fin-cell-sub">
                          Admin:{' '}
                          <strong style={{ color: job.notifiedAdminAt ? '#047857' : '#94a3b8' }}>
                            {job.notifiedAdminAt ? 'Sent' : '—'}
                          </strong>
                        </div>
                      </td>
                      <td className="fin-num">
                        {job.canRetry ? (
                          <button
                            type="button"
                            className="fin-btn fin-btn--danger-soft fin-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryJob(job.uuid)
                            }}
                            disabled={retryingJobUuid === job.uuid}
                          >
                            <RotateCcw size={12} />
                            <span>{retryingJobUuid === job.uuid ? 'Retrying…' : 'Retry'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="fin-btn fin-btn--ghost fin-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailDrawer({ kind: 'JOB', item: job })
                            }}
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>
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
        <div className="fin-panel">
          <div className="fin-panel__head">
            <div>
              <div className="fin-panel__title">B2B2C Customer Transact Consent Ledger</div>
              <div className="fin-cell-sub">
                Express auto-signed customer mandate authorizing ARMMMF subscriptions and
                redemptions.
              </div>
            </div>
            <span className="fin-panel__meta">
              {customers.filter((c) => c.b2b2cConsentOnRecord).length}/{customers.length} signed
            </span>
          </div>

          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>ARM ID</th>
                  <th>Mandate Version</th>
                  <th>Signed At</th>
                  <th>KYC Documents</th>
                  <th>Status</th>
                  <th className="fin-num">Document</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.userUuid}
                    className="fin-table__row--clickable"
                    onClick={() => setDetailDrawer({ kind: 'CUSTOMER', item: c })}
                    title="Click to inspect full customer, KYC documents & consent details"
                  >
                    <td>
                      <div className="fin-cell-primary">{c.fullName}</div>
                      <div className="fin-cell-sub">{c.email}</div>
                    </td>
                    <td className="fin-mono fin-text-clay">
                      {c.armCustomerMembershipId || omnibusMembershipId}
                    </td>
                    <td>
                      {c.b2b2cConsentOnRecord ? (
                        <>
                          <div className="fin-cell-primary">
                            {c.consentDocVersion || 'ARM-B2B2C-2026-v1'}
                          </div>
                          <div className="fin-cell-sub">
                            T&amp;C {c.consentTermsVersion || '2026-11-v1'}
                          </div>
                        </>
                      ) : (
                        <span className="fin-text-muted">Not signed</span>
                      )}
                    </td>
                    <td className="fin-text-muted">
                      {c.consentAcceptedAt
                        ? new Date(c.consentAcceptedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <span
                          className={`fin-pill ${
                            c.maskedNin ? 'fin-pill--green' : 'fin-pill--amber'
                          }`}
                        >
                          {c.maskedNin ? 'BVN+NIN' : 'BVN Only'}
                        </span>
                        <span
                          className={`fin-pill ${
                            c.hasUtilityBillDocument ? 'fin-pill--blue' : 'fin-pill--red'
                          }`}
                        >
                          {c.hasUtilityBillDocument ? 'Utility Bill' : 'No Bill'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`fin-pill ${
                          c.b2b2cConsentOnRecord ? 'fin-pill--green' : 'fin-pill--amber'
                        }`}
                      >
                        <span className="fin-pill__dot" />
                        {c.b2b2cConsentOnRecord ? 'Signed' : 'Pending'}
                      </span>
                    </td>
                    <td className="fin-num">
                      {c.hasConsentDocument ? (
                        <button
                          type="button"
                          className="fin-btn fin-btn--ghost fin-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openCustomerDocument(c.userUuid, 'consent')
                          }}
                        >
                          <FileCheck2 size={13} />
                          <span>PDF</span>
                        </button>
                      ) : (
                        <span className="fin-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'LEDGER' && <InternalLedgerTab token={token} />}

      {activeTab === 'CASHBACK' && <ActivationCashbackTab token={token} />}

      {/* ── SLIDE-OVER DETAIL DRAWER (CUSTOMER / TRANSACTION / JOB) ── */}
      {detailDrawer &&
        createPortal(
          <div
            onClick={() => setDetailDrawer(null)}
            style={{
              position: 'fixed',
              inset: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(15, 23, 42, 0.48)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '580px',
                height: '100vh',
                background: 'var(--surface, #ffffff)',
                boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.16)',
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
                          KYC, Proof of Address &amp; Consent Compliance
                        </h4>
                        {renderCopyRow('BVN (Masked)', c.maskedBvn, 'cust-bvn')}
                        {renderCopyRow('NIN (Masked)', c.maskedNin, 'cust-nin')}
                        {renderCopyRow(
                          'Valid Means of ID',
                          c.meansOfIdType
                            ? `${c.meansOfIdType}${c.meansOfIdNumberMasked ? ` (${c.meansOfIdNumberMasked})` : ''}`
                            : null,
                          'cust-id-type',
                        )}
                        {renderCopyRow('Residential Address', c.residentialAddress, 'cust-addr')}
                        {renderCopyRow(
                          'Address Verification',
                          c.addressVerificationStatus || (c.hasUtilityBillDocument ? 'SUBMITTED' : 'MISSING'),
                          'cust-addr-status',
                          Boolean(c.hasUtilityBillDocument),
                        )}
                        {renderCopyRow(
                          'B2B2C Consent Status',
                          c.b2b2cConsentOnRecord
                            ? `Signed ${c.consentAcceptedAt ? new Date(c.consentAcceptedAt).toLocaleString('en-NG') : ''} (${c.consentDocVersion || 'v1'})`
                            : 'Pending',
                          'cust-consent-status',
                          c.b2b2cConsentOnRecord,
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {c.hasIdDocument && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openCustomerDocument(c.userUuid, 'id_card')}
                              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px' }}
                            >
                              <FileText size={13} />
                              <span>View ID Document</span>
                            </button>
                          )}
                          {c.hasUtilityBillDocument && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openCustomerDocument(c.userUuid, 'utility_bill')}
                              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px' }}
                            >
                              <Home size={13} />
                              <span>View Utility Bill</span>
                            </button>
                          )}
                          {c.hasConsentDocument && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openCustomerDocument(c.userUuid, 'consent')}
                              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px' }}
                            >
                              <FileCheck2 size={13} />
                              <span>Download Consent PDF</span>
                            </button>
                          )}
                        </div>
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
        </div>,
          document.body,
        )}
    </div>
  )
}
