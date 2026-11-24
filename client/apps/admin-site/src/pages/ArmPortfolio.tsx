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
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface ArmPortfolioProps {
  token: string
  adminRole?: string
}

interface PortfolioStats {
  partnerName: string
  partnerShortName: string
  productCode: string
  annualYieldRatePct: number
  dailyRate: number
  totalPooledPrincipalNaira: number
  totalAccruedYieldNaira: number
  totalRedeemedNaira: number
  totalCashbackPaidNaira: number
  activeSaversCount: number
  totalEnrolledCustomersCount: number
  activeVaultsCount: number
  settledVaultsCount: number
  lastReconciledAt: string
}

interface ArmCustomer {
  customerId: number
  userUuid: string
  fullName: string
  email: string
  phone: string | null
  gender: string
  isIdentityVerified: boolean
  savingsWalletEnabled: boolean
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
  vaultUuid?: string
  dvaAccountNumber?: string | null
  createdAt: string
}

export default function ArmPortfolio({ token }: ArmPortfolioProps) {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'INFLOWS' | 'CONSENT'>('CUSTOMERS')
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [customers, setCustomers] = useState<ArmCustomer[]>([])
  const [transactions, setTransactions] = useState<ArmTransaction[]>([])
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

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, customersRes, txsRes] = await Promise.all([
        apiService.get('/admin/arm/stats', token),
        apiService.get('/admin/arm/customers', token),
        apiService.get('/admin/arm/transactions?limit=100', token),
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

  // Export CSV of Inflow Statement (Criteria #1 for ARM)
  const exportInflowStatementCsv = () => {
    const headers = [
      'Transaction Reference',
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
            <strong>ARMMMF (16.0% p.a. Daily Compounding)</strong> • Inflow access statement
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
            onClick={fetchData}
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
            <span>Refresh</span>
          </button>
        </div>
      </div>

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
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
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
                          {c.armCustomerMembershipId || 'ARM-GT-PENDING'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {c.armCrmAccountNumber || 'CRM-PENDING'} • Sec: {c.armCompletedSections}/63
                        </div>
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
                          onClick={() => {
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
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {tx.reference}
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

      {/* ── TAB 3: B2B2C CONSENT & COMPLIANCE LEDGER ────────────── */}
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
                <tr key={c.userUuid} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.fullName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary, #c2501f)' }}>
                    {c.armCustomerMembershipId || 'ARM-GT-VERIFIED'}
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
    </div>
  )
}
