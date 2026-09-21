import React, { useState, useEffect } from 'react'
import {
  Landmark,
  Search,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Wallet,
  Check,
  FileText,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { Modal } from '../components/common/modal/Modal'

interface SettlementStats {
  totalSettledVolume: number
  pendingSettlementVolume: number
  settledTransactionsCount: number
  flaggedCount: number
  totalBatches: number
  lastBatch: {
    id: number
    uuid: string
    totalAmount: number
    status: string
    transferReference: string | null
    createdAt: string
  } | null
}

interface FlaggedTransaction {
  transactionId: number
  transactionUuid: string
  reference: string
  amount: number
  settlementStatus: string
  paidAt: string
  paymentRequestId: number | null
  propertyAddress: string
  tenant: {
    id?: number
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  missingReason: string
  availableAccounts: Array<{
    id: number
    accountName: string
    accountNumber: string
    bankName: string
    bankCode?: string
    source: string
  }>
}

interface SettlementBatch {
  id: number
  uuid: string
  totalAmount: number
  status: string
  transferReference: string | null
  createdAt: string
  updatedAt: string
  transactionCount: number
  destination: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
    type: string
  } | null
  transactions: Array<{
    id: number
    reference: string
    amount: number
    paidAt: string
    tenant: {
      name: string
      email: string
    }
  }>
}

interface SettlementTransaction {
  id: number
  uuid: string
  reference: string
  amount: number
  settlementStatus: string
  status: string
  paymentType: string | null
  isManual?: boolean
  propertyAddress: string | null
  paidAt: string
  settlementBatch: {
    id: number
    uuid: string
    transferReference: string | null
    status: string
  } | null
  destination: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
    type: string
  } | null
  tenant: {
    id?: number
    name: string
    email: string
    phone?: string
  }
}

interface SettlementsProps {
  token: string
}

export const Settlements: React.FC<SettlementsProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'flagged' | 'batches' | 'transactions'>('flagged')
  const [stats, setStats] = useState<SettlementStats | null>(null)
  const [flaggedData, setFlaggedData] = useState<{
    count: number
    flagged: FlaggedTransaction[]
    allManualAccounts: Array<{
      id: number
      accountName: string
      accountNumber: string
      bankName: string
      bankCode?: string
      pmName: string
    }>
  }>({ count: 0, flagged: [], allManualAccounts: [] })
  
  const [batches, setBatches] = useState<SettlementBatch[]>([])
  const [batchPagination, setBatchPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null)

  const [transactions, setTransactions] = useState<SettlementTransaction[]>([])
  const [txPagination, setTxPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [txStatusFilter, setTxStatusFilter] = useState('ALL')
  const [txSearch, setTxSearch] = useState('')

  const [loading, setLoading] = useState(false)
  const [resolvingTx, setResolvingTx] = useState<FlaggedTransaction | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('')
  const [manualNote, setManualNote] = useState('')
  const [resolveMode, setResolveMode] = useState<'bind' | 'mark_settled'>('bind')
  const [submittingResolve, setSubmittingResolve] = useState(false)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/settlements/stats', token)
      if (res) setStats(res)
    } catch (err) {
      console.error('Failed to fetch settlement stats:', err)
    }
  }

  const fetchFlagged = async () => {
    try {
      const res = await apiService.get('/admin/settlements/flagged', token)
      if (res) {
        setFlaggedData(res)
      }
    } catch (err) {
      console.error('Failed to fetch flagged settlements:', err)
    }
  }

  const fetchBatches = async (page = 1) => {
    try {
      const res = await apiService.get(`/admin/settlements/batches?page=${page}&limit=15`, token)
      if (res) {
        setBatches(res.batches || [])
        setBatchPagination({
          page: res.pagination?.page || 1,
          totalPages: res.pagination?.totalPages || 1,
          total: res.pagination?.total || 0,
        })
      }
    } catch (err) {
      console.error('Failed to fetch settlement batches:', err)
    }
  }

  const fetchTransactions = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(txStatusFilter !== 'ALL' ? { status: txStatusFilter } : {}),
        ...(txSearch ? { search: txSearch } : {}),
      })
      const res = await apiService.get(`/admin/settlements/transactions?${params.toString()}`, token)
      if (res) {
        setTransactions(res.transactions || [])
        setTxPagination({
          page: res.pagination?.page || 1,
          totalPages: res.pagination?.totalPages || 1,
          total: res.pagination?.total || 0,
        })
      }
    } catch (err) {
      console.error('Failed to fetch settlement transactions:', err)
    }
  }

  const refreshAll = async () => {
    setLoading(true)
    await Promise.all([
      fetchStats(),
      fetchFlagged(),
      fetchBatches(batchPagination.page),
      fetchTransactions(txPagination.page),
    ])
    setLoading(false)
  }

  useEffect(() => {
    refreshAll()
  }, [])

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches(batchPagination.page)
    } else if (activeTab === 'transactions') {
      fetchTransactions(txPagination.page)
    } else if (activeTab === 'flagged') {
      fetchFlagged()
    }
  }, [activeTab, txStatusFilter])

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingTx) return
    setSubmittingResolve(true)

    try {
      if (resolveMode === 'bind') {
        if (!selectedAccountId) {
          alert('Please select a destination account')
          setSubmittingResolve(false)
          return
        }

        const res = await apiService.post(
          '/admin/settlements/resolve-flagged',
          {
            transactionId: resolvingTx.transactionId,
            paymentRequestId: resolvingTx.paymentRequestId,
            manualAccountId: Number(selectedAccountId),
            action: 'BIND_MANUAL_ACCOUNT',
          },
          token
        )

        setActionSuccessMessage(res.message || 'Settlement destination attached successfully!')
      } else {
        const res = await apiService.post(
          '/admin/settlements/resolve-flagged',
          {
            transactionId: resolvingTx.transactionId,
            action: 'MARK_MANUALLY_SETTLED',
            note: manualNote,
          },
          token
        )

        setActionSuccessMessage(res.message || 'Transaction marked as manually settled.')
      }

      setTimeout(() => {
        setResolvingTx(null)
        setActionSuccessMessage(null)
        setSelectedAccountId('')
        setManualNote('')
        refreshAll()
      }, 1500)
    } catch (err: any) {
      console.error('Failed to resolve flagged settlement:', err)
      alert(err.message || 'Failed to resolve flagged transaction')
    } finally {
      setSubmittingResolve(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SETTLED':
      case 'COMPLETED':
      case 'SUCCESS':
        return 'badge--success'
      case 'VERIFIED':
      case 'PROCESSING':
        return 'badge--info'
      case 'PENDING':
        return 'badge--warning'
      case 'FAILED':
        return 'badge--danger'
      default:
        return 'badge--default'
    }
  }

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark size={26} style={{ color: 'var(--accent)' }} />
            Settlements & Payouts Engine
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Monitor automated hourly rent settlements, Paystack payout transfers, and unrouted transactions.
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={loading}
          className="btn btn--secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer' }}
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Total Settled Volume */}
        <div className="card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Settled Payouts
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {stats ? formatNaira(stats.totalSettledVolume) : '...'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats?.settledTransactionsCount ?? 0} settled transactions
          </div>
        </div>

        {/* Pending Settleable Volume */}
        <div className="card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Inbound Pool
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {stats ? formatNaira(stats.pendingSettlementVolume) : '...'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Awaiting next hourly transfer cycle
          </div>
        </div>

        {/* Flagged for Review Card */}
        <div
          onClick={() => setActiveTab('flagged')}
          className="card"
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: stats && stats.flaggedCount > 0 ? '1px solid #EF4444' : '1px solid var(--border)',
            background: stats && stats.flaggedCount > 0 ? 'rgba(239, 68, 68, 0.04)' : 'var(--surface)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: stats && stats.flaggedCount > 0 ? '#EF4444' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Flagged For Review
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: stats && stats.flaggedCount > 0 ? '#EF4444' : 'var(--text-primary)' }}>
            {stats?.flaggedCount ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: stats && stats.flaggedCount > 0 ? '#DC2626' : 'var(--text-muted)', marginTop: '4px', fontWeight: stats && stats.flaggedCount > 0 ? '600' : 'normal' }}>
            {stats && stats.flaggedCount > 0 ? 'Requires destination account assignment' : 'All transactions routable'}
          </div>
        </div>

        {/* Last Batch Run */}
        <div className="card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Last Settlement Run
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {stats?.lastBatch ? (
              <>
                <span className={`badge ${getStatusBadgeClass(stats.lastBatch.status)}`}>
                  {stats.lastBatch.status}
                </span>
                <span>{formatNaira(stats.lastBatch.totalAmount)}</span>
              </>
            ) : (
              'No batches yet'
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {stats?.lastBatch ? new Date(stats.lastBatch.createdAt).toLocaleString() : 'Cron runs every hour'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('flagged')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'flagged' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'flagged' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'flagged' ? '600' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <AlertTriangle size={16} color={flaggedData.count > 0 ? '#EF4444' : undefined} />
          Flagged for Review
          {flaggedData.count > 0 && (
            <span style={{ background: '#EF4444', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
              {flaggedData.count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'batches' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'batches' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'batches' ? '600' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <Landmark size={16} />
          Settlement Batches ({batchPagination.total})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'transactions' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'transactions' ? '600' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <FileText size={16} />
          Transaction Audit Log
        </button>
      </div>

      {/* Tab 1: Flagged for Review */}
      {activeTab === 'flagged' && (
        <div>
          {flaggedData.count === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Check size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                All Transactions Are Routable
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
                No payments are currently stuck or missing a destination account. The hourly settlement cron will process verified payments automatically.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={22} style={{ color: '#EF4444', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: '1.5' }}>
                  <strong>{flaggedData.count} transaction(s) flagged</strong> because their payment requests have no bound settlement bank destination. Click <strong>Resolve Destination</strong> to bind an account or mark as manually settled.
                </div>
              </div>

              <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>TX REFERENCE</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>TENANT</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>PROPERTY</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>AMOUNT</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>PAID AT</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>FLAG REASON</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedData.flagged.map((item) => (
                      <tr key={item.transactionId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>
                          {item.reference}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                            {item.tenant.firstName} {item.tenant.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.tenant.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {item.propertyAddress}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {formatNaira(item.amount)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(item.paidAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '12px', color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: '500' }}>
                            {item.missingReason}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setResolvingTx(item)
                              setSelectedAccountId(item.availableAccounts[0]?.id || '')
                            }}
                            className="btn btn--primary"
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Resolve Destination
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Settlement Batches */}
      {activeTab === 'batches' && (
        <div>
          <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>BATCH UUID / REF</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>PAYSTACK TRANSFER REF</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>DESTINATION BANK ACCOUNT</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>TOTAL PAYOUT</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>TX COUNT</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>DATE</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'right' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      No settlement batches recorded yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => {
                    const isExpanded = expandedBatchId === batch.id
                    return (
                      <React.Fragment key={batch.id}>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>
                            {batch.uuid.slice(0, 8)}...
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: batch.transferReference ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {batch.transferReference || 'N/A'}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                            {batch.destination ? (
                              <div>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                  {batch.destination.bankName} • {batch.destination.accountNumber}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {batch.destination.accountName}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Bundled destinations</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {formatNaira(batch.totalAmount)}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className={`badge ${getStatusBadgeClass(batch.status)}`}>
                              {batch.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                            {batch.transactionCount} payments
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(batch.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                              className="btn btn--secondary"
                              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: 'var(--surface-subtle)' }}>
                            <td colSpan={8} style={{ padding: '16px 24px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Transactions in Batch #{batch.id}:
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                {batch.transactions.map((tx) => (
                                  <div key={tx.id} style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '12px' }}>{tx.reference}</span>
                                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{formatNaira(tx.amount)}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      Tenant: {tx.tenant.name} ({tx.tenant.email})
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {batchPagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Page {batchPagination.page} of {batchPagination.totalPages}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={batchPagination.page <= 1}
                  onClick={() => fetchBatches(batchPagination.page - 1)}
                  className="btn btn--secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Previous
                </button>
                <button
                  disabled={batchPagination.page >= batchPagination.totalPages}
                  onClick={() => fetchBatches(batchPagination.page + 1)}
                  className="btn btn--secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transaction Audit Log */}
      {activeTab === 'transactions' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTransactions(1)}
                placeholder="Search reference or property..."
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', padding: '10px 0', fontSize: '13px' }}
              />
            </div>

            <select
              value={txStatusFilter}
              onChange={(e) => setTxStatusFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '13px', color: 'var(--text-primary)' }}
            >
              <option value="ALL">All Settlement Statuses</option>
              <option value="VERIFIED">VERIFIED (Ready)</option>
              <option value="SETTLED">SETTLED (Paid Out)</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>TX REFERENCE</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>TENANT</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>PROPERTY ADDRESS</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>AMOUNT</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>SETTLEMENT STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>BOUND DESTINATION</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>DATE PAID</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      No transactions found matching the filter.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>
                        {tx.reference}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{tx.tenant.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.tenant.email}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {tx.propertyAddress || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {formatNaira(tx.amount)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${getStatusBadgeClass(tx.settlementStatus)}`}>
                          {tx.settlementStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        {tx.destination?.type === 'MANUAL_PAYMENT' || tx.isManual ? (
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                                Manual Proof
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Settled Off-Platform (Direct)
                            </div>
                          </div>
                        ) : tx.destination ? (
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {tx.destination.bankName} • {tx.destination.accountNumber}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {tx.destination.accountName}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: '500' }}>
                            Unbound (No Destination)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(tx.paidAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {txPagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Page {txPagination.page} of {txPagination.totalPages}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={txPagination.page <= 1}
                  onClick={() => fetchTransactions(txPagination.page - 1)}
                  className="btn btn--secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Previous
                </button>
                <button
                  disabled={txPagination.page >= txPagination.totalPages}
                  onClick={() => fetchTransactions(txPagination.page + 1)}
                  className="btn btn--secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolution Modal */}
      {resolvingTx && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!submittingResolve) setResolvingTx(null)
          }}
          title="Resolve Flagged Settlement Destination"
        >
          <form onSubmit={handleResolveSubmit}>
            {actionSuccessMessage ? (
              <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#065F46', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }}>
                <CheckCircle2 size={24} style={{ margin: '0 auto 8px auto', display: 'block', color: '#10B981' }} />
                {actionSuccessMessage}
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reference:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{resolvingTx.reference}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tenant:</span>
                    <span style={{ fontWeight: '600' }}>{resolvingTx.tenant.firstName} {resolvingTx.tenant.lastName} ({resolvingTx.tenant.email})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatNaira(resolvingTx.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payment Request ID:</span>
                    <span style={{ fontWeight: '600' }}>#{resolvingTx.paymentRequestId || 'None'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setResolveMode('bind')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: resolveMode === 'bind' ? 'var(--accent)' : 'var(--surface)',
                      color: resolveMode === 'bind' ? '#fff' : 'var(--text-primary)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Bind Settlement Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolveMode('mark_settled')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: resolveMode === 'mark_settled' ? 'var(--accent)' : 'var(--surface)',
                      color: resolveMode === 'mark_settled' ? '#fff' : 'var(--text-primary)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Mark Manually Settled
                  </button>
                </div>

                {resolveMode === 'bind' ? (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Select Settlement Destination:
                    </label>

                    {resolvingTx.availableAccounts.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Recommended accounts from linked property/PM:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {resolvingTx.availableAccounts.map((acc) => (
                            <label
                              key={acc.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: selectedAccountId === acc.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                background: selectedAccountId === acc.id ? 'var(--accent-faint)' : 'var(--surface)',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="radio"
                                name="settlement_account"
                                checked={selectedAccountId === acc.id}
                                onChange={() => setSelectedAccountId(acc.id)}
                              />
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                  {acc.bankName} • {acc.accountNumber} ({acc.accountName})
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Source: {acc.source}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Or select from all manual settlement accounts:</div>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '13px' }}
                      >
                        <option value="">Select an account...</option>
                        {flaggedData.allManualAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.bankName} - {acc.accountNumber} ({acc.accountName}) [{acc.pmName}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Settlement Note / Reference:
                    </label>
                    <textarea
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder="e.g. Paid ₦200,000 via offline GTBank transfer on 2026-09-16 (Ref: GTB-883921)"
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '13px' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setResolvingTx(null)}
                    disabled={submittingResolve}
                    className="btn btn--secondary"
                    style={{ padding: '8px 16px', borderRadius: '6px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResolve}
                    className="btn btn--primary"
                    style={{ padding: '8px 16px', borderRadius: '6px' }}
                  >
                    {submittingResolve ? 'Processing...' : resolveMode === 'bind' ? 'Bind & Queue For Settlement' : 'Mark As Settled'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Settlements
