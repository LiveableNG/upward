import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Umbrella,
  Wallet,
  X,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import '../styles/finance-console.css'

interface InsuranceLedgerProps {
  token: string
}

interface InsuranceSummary {
  totalPolicies: number
  standaloneCount: number
  rentProtecCount: number
  activePoliciesCount: number
  totalSumAssuredNgn: number
  totalInsurerRemittanceNgn: number
  standalonePremiumCollectedNgn: number
  rentProtecPremiumPayableNgn: number
  rentProtecPremiumRecoveredNgn: number
  rentProtecUnrecoveredPremiumNgn: number
}

interface InsurancePolicyRow {
  policyUuid: string
  source: 'STANDALONE' | 'RENT_PROTEC'
  policyholderName: string
  policyholderEmail: string
  userUuid: string
  annualRentNgn: number
  sumAssuredNgn: number
  premiumRatePct: number
  premiumAmountNgn: number
  premiumRecoveredNgn: number
  unrecoveredPremiumNgn: number
  status: string
  paymentReference: string | null
  landlordName: string | null
  propertyAddress: string | null
  occupation: string | null
  employmentType: string | null
  coverageDate: string | null
  fundingProgressPct?: number
  activationThresholdPct?: number
  createdAt: string
}

interface RecoveryJournalEntry {
  uuid: string
  vaultUuid: string
  policyholderName: string
  entryDate: string
  entryType: string
  principalBaseNgn: number
  grossArmRatePct: number
  customerRatePct: number
  grossArmYieldNgn: number
  customerNetYieldNgn: number
  yieldSpreadNgn: number
  premiumRecoveryAppliedNgn: number
  netMarginDeltaNgn: number
  notes: string | null
}

type DrawerSelection =
  | { kind: 'POLICY'; policy: InsurancePolicyRow }
  | { kind: 'JOURNAL'; entry: RecoveryJournalEntry }

const fmtNgn = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

function getStatusPillClass(status: string): string {
  const s = status.toUpperCase()
  if (s === 'ACTIVE' || s === 'PAID' || s === 'MATURED') return 'fin-pill fin-pill--green'
  if (s.includes('CANCEL') || s === 'FAILED') return 'fin-pill fin-pill--red'
  return 'fin-pill fin-pill--amber'
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function InsuranceLedger({ token }: InsuranceLedgerProps) {
  const [loading, setLoading] = useState(true)
  const [isSandbox, setIsSandbox] = useState(false)
  const [simulatingDays, setSimulatingDays] = useState<number | null>(null)
  const [simMessage, setSimMessage] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<InsuranceSummary | null>(null)
  const [policies, setPolicies] = useState<InsurancePolicyRow[]>([])
  const [recoveryJournal, setRecoveryJournal] = useState<RecoveryJournalEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewTab, setViewTab] = useState<'POLICIES' | 'JOURNAL'>('POLICIES')
  const [drawer, setDrawer] = useState<DrawerSelection | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500)
    } catch {
      // ignore clipboard failures
    }
  }

  useEffect(() => {
    if (!drawer) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawer])

  const fetchLedger = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await apiService.get(`/admin/arm/insurance-ledger${qs}`, token)
      const data = res?.data || res
      setIsSandbox(Boolean(data?.isSandbox))
      setSummary(data?.summary || null)
      const nextPolicies: InsurancePolicyRow[] = data?.policies || []
      const nextJournal: RecoveryJournalEntry[] = data?.recentRecoveryJournal || []
      setPolicies(nextPolicies)
      setRecoveryJournal(nextJournal)

      // Keep open drawer synced after refresh / accrual simulation
      setDrawer((prev) => {
        if (!prev) return null
        if (prev.kind === 'POLICY') {
          const updated = nextPolicies.find(
            (p) => p.policyUuid === prev.policy.policyUuid && p.source === prev.policy.source,
          )
          return updated ? { kind: 'POLICY', policy: updated } : prev
        }
        const updatedEntry = nextJournal.find((j) => j.uuid === prev.entry.uuid)
        return updatedEntry ? { kind: 'JOURNAL', entry: updatedEntry } : prev
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load insurance ledger')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateAccrual = async (days: number) => {
    try {
      setSimulatingDays(days)
      setError(null)
      setSimMessage(null)
      const res = await apiService.post('/admin/arm/simulate-accrual', { days }, token)
      setSimMessage(res?.message || `Simulated ${days} day(s) of accrual.`)
      await fetchLedger()
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate daily accrual')
    } finally {
      setSimulatingDays(null)
    }
  }

  useEffect(() => {
    fetchLedger()
  }, [token, sourceFilter, statusFilter])

  const exportCsv = () => {
    if (!policies.length) return
    const headers = [
      'Policy UUID',
      'Source',
      'Policyholder',
      'Email',
      'Annual Rent / Sum Assured (NGN)',
      'Premium Rate (%)',
      '2% Premium Payable (NGN)',
      'Recovered (NGN)',
      'Unrecovered (NGN)',
      'Status',
      'Reference',
      'Landlord',
      'Coverage / Due Date',
      'Created At',
    ]
    const lines = [
      headers.join(','),
      ...policies.map((p) =>
        [
          p.policyUuid,
          p.source,
          `"${p.policyholderName.replace(/"/g, '""')}"`,
          `"${p.policyholderEmail}"`,
          p.sumAssuredNgn.toFixed(2),
          p.premiumRatePct,
          p.premiumAmountNgn.toFixed(2),
          p.premiumRecoveredNgn.toFixed(2),
          p.unrecoveredPremiumNgn.toFixed(2),
          p.status,
          p.paymentReference || '',
          `"${(p.landlordName || '').replace(/"/g, '""')}"`,
          p.coverageDate || '',
          p.createdAt,
        ].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `upward-insurance-ledger-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const recoveryRatePct =
    summary && summary.rentProtecPremiumPayableNgn > 0
      ? Math.min(
          100,
          Math.round(
            (summary.rentProtecPremiumRecoveredNgn / summary.rentProtecPremiumPayableNgn) * 100,
          ),
        )
      : 0

  const renderCopyRow = (
    label: string,
    value: string | null | undefined,
    copyKey?: string,
    mono = false,
  ) => (
    <div className="fin-kv-row">
      <span className="fin-kv-row__label">{label}</span>
      <span className={`fin-kv-row__val ${mono ? 'fin-mono' : ''}`}>
        <span>{value || '—'}</span>
        {value && copyKey && (
          <button
            type="button"
            className="fin-copy-btn"
            onClick={() => handleCopy(copyKey, value)}
            title="Copy to clipboard"
          >
            {copiedKey === copyKey ? <Check size={12} color="#047857" /> : <Copy size={12} />}
          </button>
        )}
      </span>
    </div>
  )

  return (
    <div className="fin-page">
      {/* Header */}
      <div className="fin-header">
        <div className="fin-header__left">
          <div className="fin-header__title-row">
            <span className="fin-header__icon">
              <Umbrella size={19} />
            </span>
            <h1 className="fin-header__title">Insurance &amp; Remittance Ledger</h1>
            {isSandbox && (
              <span className="fin-pill fin-pill--amber">
                <span className="fin-pill__dot" /> Sandbox
              </span>
            )}
          </div>
          <p className="fin-header__subtitle">
            Standalone Rent Support and bundled Rent Protec policies, 2% insurer remittance, and
            ARM spread recovery. Click any row to inspect full details.
          </p>
        </div>

        <div className="fin-header__actions">
          {isSandbox && (
            <div className="fin-sim-group" title="Simulate daily ARM yield accrual">
              <span className="fin-sim-group__label">
                <Play size={11} /> Accrue
              </span>
              {[1, 30, 90, 180].map((d) => (
                <button
                  key={d}
                  type="button"
                  className="fin-sim-group__btn"
                  disabled={simulatingDays !== null}
                  onClick={() => handleSimulateAccrual(d)}
                >
                  {simulatingDays === d ? '…' : `+${d}d`}
                </button>
              ))}
            </div>
          )}

          <button type="button" className="fin-btn fin-btn--ghost" onClick={fetchLedger}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="fin-btn fin-btn--primary"
            onClick={exportCsv}
            disabled={!policies.length}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {simMessage && (
        <div className="fin-alert fin-alert--success">
          <CheckCircle2 size={15} />
          <span>{simMessage}</span>
        </div>
      )}

      {error && (
        <div className="fin-alert fin-alert--error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Strip */}
      {summary && (
        <div className="fin-kpi-grid">
          <div className="fin-kpi fin-kpi--dark">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Total Sum Assured</span>
              <ShieldCheck size={16} className="fin-kpi__icon" />
            </div>
            <div className="fin-kpi__value">{fmtNgn(summary.totalSumAssuredNgn)}</div>
            <div className="fin-kpi__sub">
              {summary.activePoliciesCount} active · {summary.rentProtecCount} Rent Protec ·{' '}
              {summary.standaloneCount} Standalone
            </div>
          </div>

          <div className="fin-kpi">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Insurer Remittance (2%)</span>
              <Wallet size={16} className="fin-kpi__icon" />
            </div>
            <div className="fin-kpi__value fin-kpi__value--clay">
              {fmtNgn(summary.totalInsurerRemittanceNgn)}
            </div>
            <div className="fin-kpi__sub">
              Rent Protec {fmtNgn(summary.rentProtecPremiumPayableNgn)} · Standalone{' '}
              {fmtNgn(summary.standalonePremiumCollectedNgn)}
            </div>
          </div>

          <div className="fin-kpi">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Premium Recovered</span>
              <TrendingUp size={16} color="#10b981" />
            </div>
            <div className="fin-kpi__value fin-kpi__value--green">
              {fmtNgn(summary.rentProtecPremiumRecoveredNgn)}
            </div>
            <div className="fin-kpi__sub">
              {recoveryRatePct}% recovered from internal ARM yield spread
            </div>
          </div>

          <div className="fin-kpi">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Unrecovered Exposure</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div className="fin-kpi__value fin-kpi__value--amber">
              {fmtNgn(summary.rentProtecUnrecoveredPremiumNgn)}
            </div>
            <div className="fin-kpi__sub">Accruing back via daily 6.55% spread</div>
          </div>
        </div>
      )}

      {/* Segmented View Switcher */}
      <div className="fin-tabs">
        <button
          type="button"
          className={`fin-tab ${viewTab === 'POLICIES' ? 'fin-tab--active' : ''}`}
          onClick={() => setViewTab('POLICIES')}
        >
          <span>Policies</span>
          <span className="fin-tab__count">{policies.length}</span>
        </button>
        <button
          type="button"
          className={`fin-tab ${viewTab === 'JOURNAL' ? 'fin-tab--active' : ''}`}
          onClick={() => setViewTab('JOURNAL')}
        >
          <span>Recovery Journal</span>
          <span className="fin-tab__count">{recoveryJournal.length}</span>
        </button>
      </div>

      {/* Policies Panel */}
      {viewTab === 'POLICIES' && (
        <div className="fin-panel">
          <div className="fin-panel__head">
            <div className="fin-toolbar">
              <div className="fin-search">
                <Search size={14} className="fin-search__icon" />
                <input
                  type="text"
                  className="fin-input"
                  placeholder="Search policyholder, email, landlord, or ref…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchLedger()
                  }}
                />
              </div>

              <select
                className="fin-select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="ALL">All Policy Types</option>
                <option value="RENT_PROTEC">Rent Protec (Bundled)</option>
                <option value="STANDALONE">Standalone Insurance</option>
              </select>

              <select
                className="fin-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Bound)</option>
                <option value="PENDING_ACTIVATION">Pending Activation</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="MATURED">Matured</option>
                <option value="CANCELLED_EARLY_EXIT">Cancelled (Early Exit)</option>
              </select>

              <button type="button" className="fin-btn fin-btn--ghost" onClick={fetchLedger}>
                Apply
              </button>
            </div>

            <span className="fin-panel__meta">
              {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
            </span>
          </div>

          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Policyholder</th>
                  <th>Source</th>
                  <th className="fin-num">Sum Assured</th>
                  <th className="fin-num">2% Premium</th>
                  <th>Recovery Progress</th>
                  <th>Status</th>
                  <th>Coverage Date</th>
                  <th className="fin-num">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}>
                        <div className="fin-skeleton" style={{ width: `${70 + (i % 3) * 10}%` }} />
                      </td>
                    </tr>
                  ))
                ) : policies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fin-empty">
                      No insurance policies match the selected filter.
                    </td>
                  </tr>
                ) : (
                  policies.map((p) => {
                    const pct =
                      p.premiumAmountNgn > 0
                        ? Math.min(
                            100,
                            Math.round((p.premiumRecoveredNgn / p.premiumAmountNgn) * 100),
                          )
                        : 0
                    return (
                      <tr
                        key={`${p.source}-${p.policyUuid}`}
                        className="fin-table__row--clickable"
                        onClick={() => setDrawer({ kind: 'POLICY', policy: p })}
                        title="Click to view policy details and recovery ledger"
                      >
                        <td>
                          <div className="fin-cell-primary">{p.policyholderName}</div>
                          <div className="fin-cell-sub">{p.policyholderEmail}</div>
                          {p.landlordName && (
                            <div className="fin-cell-sub">Landlord: {p.landlordName}</div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`fin-pill ${
                              p.source === 'RENT_PROTEC' ? 'fin-pill--clay' : 'fin-pill--blue'
                            }`}
                          >
                            {p.source === 'RENT_PROTEC' ? 'Rent Protec' : 'Standalone'}
                          </span>
                        </td>
                        <td className="fin-num fin-cell-primary">{fmtNgn(p.sumAssuredNgn)}</td>
                        <td className="fin-num">
                          {p.status === 'PENDING_ACTIVATION' ? (
                            <span className="fin-text-muted">Unbound</span>
                          ) : (
                            <strong>{fmtNgn(p.premiumAmountNgn)}</strong>
                          )}
                        </td>
                        <td style={{ minWidth: '175px' }}>
                          {p.source === 'STANDALONE' ? (
                            <span className="fin-text-green">Direct Paid</span>
                          ) : p.status === 'PENDING_ACTIVATION' ? (
                            <div>
                              <div
                                className="fin-cell-sub"
                                style={{ color: '#b45309', marginTop: 0 }}
                              >
                                Funded {p.fundingProgressPct ?? 0}% /{' '}
                                {p.activationThresholdPct ?? 20}% min
                              </div>
                              <div className="fin-progress">
                                <div
                                  className="fin-progress__fill fin-progress__fill--clay"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round(
                                        ((p.fundingProgressPct ?? 0) /
                                          Math.max(1, p.activationThresholdPct ?? 20)) *
                                          100,
                                      ),
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '11.5px',
                                  gap: '8px',
                                }}
                              >
                                <span className="fin-text-green">{pct}%</span>
                                <span className="fin-text-muted">
                                  {p.unrecoveredPremiumNgn > 0
                                    ? `${fmtNgn(p.unrecoveredPremiumNgn)} left`
                                    : 'Fully recovered'}
                                </span>
                              </div>
                              <div className="fin-progress">
                                <div
                                  className="fin-progress__fill"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={getStatusPillClass(p.status)}>
                            <span className="fin-pill__dot" />
                            {formatStatusLabel(p.status)}
                          </span>
                        </td>
                        <td className="fin-text-muted">{p.coverageDate || '—'}</td>
                        <td className="fin-num">
                          <button
                            type="button"
                            className="fin-btn fin-btn--ghost fin-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDrawer({ kind: 'POLICY', policy: p })
                            }}
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recovery Journal Panel */}
      {viewTab === 'JOURNAL' && (
        <div className="fin-panel">
          <div className="fin-panel__head">
            <span className="fin-panel__title">Rent Protec Premium Recovery Journal</span>
            <span className="fin-panel__meta">{recoveryJournal.length} entries</span>
          </div>
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Policyholder</th>
                  <th>Event</th>
                  <th className="fin-num">Balance Base</th>
                  <th className="fin-num">Gross ARM Yield</th>
                  <th className="fin-num">Customer 10%</th>
                  <th className="fin-num">Recovered</th>
                  <th className="fin-num">Net Margin</th>
                </tr>
              </thead>
              <tbody>
                {recoveryJournal.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fin-empty">
                      No recovery journal entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  recoveryJournal.map((j) => (
                    <tr
                      key={j.uuid}
                      className="fin-table__row--clickable"
                      onClick={() => setDrawer({ kind: 'JOURNAL', entry: j })}
                      title="Click to inspect journal calculation details"
                    >
                      <td className="fin-text-muted">
                        {new Date(j.entryDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="fin-cell-primary">{j.policyholderName}</td>
                      <td>
                        <span className="fin-pill fin-pill--neutral">
                          {formatStatusLabel(j.entryType)}
                        </span>
                      </td>
                      <td className="fin-num">{fmtNgn(j.principalBaseNgn)}</td>
                      <td className="fin-num">{fmtNgn(j.grossArmYieldNgn)}</td>
                      <td className="fin-num">{fmtNgn(j.customerNetYieldNgn)}</td>
                      <td className="fin-num fin-text-green">
                        +{fmtNgn(j.premiumRecoveryAppliedNgn)}
                      </td>
                      <td className="fin-num fin-text-green">{fmtNgn(j.netMarginDeltaNgn)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-Over Policy / Journal Detail Drawer ──────────── */}
      {drawer &&
        createPortal(
          <div className="fin-drawer-backdrop" onClick={() => setDrawer(null)}>
            <div className="fin-drawer" onClick={(e) => e.stopPropagation()}>
              {drawer.kind === 'POLICY' ? (
                (() => {
                  const p = drawer.policy
                  const pct =
                    p.premiumAmountNgn > 0
                      ? Math.min(100, Math.round((p.premiumRecoveredNgn / p.premiumAmountNgn) * 100))
                      : 0
                  const linkedEntries = recoveryJournal.filter((j) => j.vaultUuid === p.policyUuid)
                  return (
                    <>
                      <div className="fin-drawer__head">
                        <div style={{ minWidth: 0 }}>
                          <div className="fin-drawer__kicker">
                            <span>
                              {p.source === 'RENT_PROTEC'
                                ? 'Rent Protec Bundled Policy'
                                : 'Standalone Rent Support Policy'}
                            </span>
                          </div>
                          <h3 className="fin-drawer__title">{p.policyholderName}</h3>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginTop: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span className={getStatusPillClass(p.status)}>
                              <span className="fin-pill__dot" />
                              {formatStatusLabel(p.status)}
                            </span>
                            <span className="fin-pill fin-pill--neutral">
                              Rate: {p.premiumRatePct}% p.a.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="fin-drawer__close"
                          onClick={() => setDrawer(null)}
                          aria-label="Close policy details"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="fin-drawer__body">
                        {/* Coverage & Premium Summary Hero */}
                        <div className="fin-drawer__hero">
                          <div className="fin-drawer__hero-grid">
                            <div>
                              <div className="fin-drawer__hero-label">Sum Assured</div>
                              <div className="fin-drawer__hero-val">{fmtNgn(p.sumAssuredNgn)}</div>
                            </div>
                            <div>
                              <div className="fin-drawer__hero-label">
                                {p.premiumRatePct}% Insurer Premium
                              </div>
                              <div className="fin-drawer__hero-val" style={{ color: '#fdba74' }}>
                                {p.status === 'PENDING_ACTIVATION'
                                  ? 'Unbound (₦0)'
                                  : fmtNgn(p.premiumAmountNgn)}
                              </div>
                            </div>
                          </div>

                          {p.source === 'RENT_PROTEC' && (
                            <div style={{ marginTop: '14px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '12px',
                                  color: '#cbd5e1',
                                }}
                              >
                                {p.status === 'PENDING_ACTIVATION' ? (
                                  <>
                                    <span>Activation Deposit Progress</span>
                                    <strong>
                                      {p.fundingProgressPct ?? 0}% / {p.activationThresholdPct ?? 20}
                                      % floor
                                    </strong>
                                  </>
                                ) : (
                                  <>
                                    <span>Spread Recovery Progress</span>
                                    <strong>
                                      {pct}% ({fmtNgn(p.premiumRecoveredNgn)} recovered)
                                    </strong>
                                  </>
                                )}
                              </div>
                              <div className="fin-progress" style={{ background: 'rgba(255,255,255,0.16)' }}>
                                <div
                                  className={`fin-progress__fill ${
                                    p.status === 'PENDING_ACTIVATION'
                                      ? 'fin-progress__fill--clay'
                                      : ''
                                  }`}
                                  style={{
                                    width: `${
                                      p.status === 'PENDING_ACTIVATION'
                                        ? Math.min(
                                            100,
                                            Math.round(
                                              ((p.fundingProgressPct ?? 0) /
                                                Math.max(1, p.activationThresholdPct ?? 20)) *
                                                100,
                                            ),
                                          )
                                        : pct
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Policy & Identifiers */}
                        <div className="fin-drawer__section">
                          <div className="fin-drawer__section-title">Policy &amp; Identifiers</div>
                          <div className="fin-kv-list">
                            {renderCopyRow('Policy / Vault UUID', p.policyUuid, 'policyUuid', true)}
                            {renderCopyRow(
                              p.source === 'RENT_PROTEC' ? 'ARM Membership Ref' : 'Payment Ref',
                              p.paymentReference,
                              'paymentRef',
                              true,
                            )}
                            {renderCopyRow('Email', p.policyholderEmail, 'email')}
                            {renderCopyRow('Annual Rent', fmtNgn(p.annualRentNgn))}
                            {renderCopyRow('Coverage / Due Date', p.coverageDate)}
                            {renderCopyRow(
                              'Created',
                              new Date(p.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }),
                            )}
                          </div>
                        </div>

                        {/* Underwriting / Property Info */}
                        {(p.landlordName ||
                          p.propertyAddress ||
                          p.occupation ||
                          p.employmentType ||
                          p.source === 'RENT_PROTEC') && (
                          <div className="fin-drawer__section">
                            <div className="fin-drawer__section-title">
                              {p.source === 'RENT_PROTEC'
                                ? 'Coverage Activation & Recovery'
                                : 'Underwriting & Tenancy Details'}
                            </div>
                            <div className="fin-kv-list">
                              {p.source === 'RENT_PROTEC' ? (
                                <>
                                  {renderCopyRow(
                                    'Activation Threshold',
                                    `${p.activationThresholdPct ?? 20}% of annual rent`,
                                  )}
                                  {renderCopyRow(
                                    'Current Vault Funding',
                                    `${p.fundingProgressPct ?? 0}%`,
                                  )}
                                  {renderCopyRow(
                                    'Recovered via Spread',
                                    fmtNgn(p.premiumRecoveredNgn),
                                  )}
                                  {renderCopyRow(
                                    'Remaining Unrecovered',
                                    fmtNgn(p.unrecoveredPremiumNgn),
                                  )}
                                </>
                              ) : (
                                <>
                                  {renderCopyRow('Landlord Name', p.landlordName)}
                                  {renderCopyRow('Property Address', p.propertyAddress)}
                                  {renderCopyRow('Occupation', p.occupation)}
                                  {renderCopyRow('Employment Type', p.employmentType)}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Linked Recovery Journal Entries */}
                        {p.source === 'RENT_PROTEC' && (
                          <div className="fin-drawer__section">
                            <div className="fin-drawer__section-title">
                              Spread Recovery History ({linkedEntries.length})
                            </div>
                            {linkedEntries.length === 0 ? (
                              <div className="fin-journal-item">
                                <span className="fin-text-muted" style={{ fontSize: '12px' }}>
                                  No daily spread recovery entries recorded for this vault yet.
                                </span>
                              </div>
                            ) : (
                              linkedEntries.map((entry) => (
                                <div key={entry.uuid} className="fin-journal-item">
                                  <div className="fin-journal-item__top">
                                    <span className="fin-pill fin-pill--neutral">
                                      {formatStatusLabel(entry.entryType)}
                                    </span>
                                    <span className="fin-text-muted">
                                      {new Date(entry.entryDate).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <div className="fin-journal-item__nums">
                                    <div>
                                      <div className="fin-cell-sub" style={{ marginTop: 0 }}>
                                        Gross ARM ({entry.grossArmRatePct.toFixed(2)}%)
                                      </div>
                                      <strong>{fmtNgn(entry.grossArmYieldNgn)}</strong>
                                    </div>
                                    <div>
                                      <div className="fin-cell-sub" style={{ marginTop: 0 }}>
                                        Customer ({entry.customerRatePct.toFixed(1)}%)
                                      </div>
                                      <strong>{fmtNgn(entry.customerNetYieldNgn)}</strong>
                                    </div>
                                    <div>
                                      <div className="fin-cell-sub" style={{ marginTop: 0 }}>
                                        Recovered / Margin
                                      </div>
                                      <strong className="fin-text-green">
                                        +{fmtNgn(entry.premiumRecoveryAppliedNgn)}
                                      </strong>
                                    </div>
                                  </div>
                                  {entry.notes && (
                                    <div className="fin-cell-sub">{entry.notes}</div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="fin-drawer__footer">
                        {p.userUuid ? (
                          <Link
                            to={`/users/${p.userUuid}`}
                            className="fin-btn fin-btn--primary"
                            style={{ textDecoration: 'none' }}
                          >
                            <span>Open User Profile</span>
                            <ExternalLink size={13} />
                          </Link>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          className="fin-btn fin-btn--ghost"
                          onClick={() => setDrawer(null)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )
                })()
              ) : (
                (() => {
                  const j = drawer.entry
                  const parentPolicy = policies.find((p) => p.policyUuid === j.vaultUuid)
                  return (
                    <>
                      <div className="fin-drawer__head">
                        <div style={{ minWidth: 0 }}>
                          <div className="fin-drawer__kicker">
                            <span>Spread Recovery Journal Entry</span>
                          </div>
                          <h3 className="fin-drawer__title">{j.policyholderName}</h3>
                          <div style={{ marginTop: '8px' }}>
                            <span className="fin-pill fin-pill--green">
                              <span className="fin-pill__dot" />
                              {formatStatusLabel(j.entryType)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="fin-drawer__close"
                          onClick={() => setDrawer(null)}
                          aria-label="Close journal entry details"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="fin-drawer__body">
                        <div className="fin-drawer__hero">
                          <div className="fin-drawer__hero-grid">
                            <div>
                              <div className="fin-drawer__hero-label">Applied to 2% Recovery</div>
                              <div className="fin-drawer__hero-val" style={{ color: '#86efac' }}>
                                +{fmtNgn(j.premiumRecoveryAppliedNgn)}
                              </div>
                            </div>
                            <div>
                              <div className="fin-drawer__hero-label">Net Platform Margin</div>
                              <div className="fin-drawer__hero-val">
                                {fmtNgn(j.netMarginDeltaNgn)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="fin-drawer__section">
                          <div className="fin-drawer__section-title">Yield Spread Calculation</div>
                          <div className="fin-kv-list">
                            {renderCopyRow('Journal UUID', j.uuid, 'journalUuid', true)}
                            {renderCopyRow('Vault / Policy UUID', j.vaultUuid, 'vaultUuid', true)}
                            {renderCopyRow(
                              'Entry Timestamp',
                              new Date(j.entryDate).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }),
                            )}
                            {renderCopyRow('Principal Base', fmtNgn(j.principalBaseNgn))}
                            {renderCopyRow(
                              'Gross ARM Yield',
                              `${fmtNgn(j.grossArmYieldNgn)} (${j.grossArmRatePct.toFixed(2)}% p.a.)`,
                            )}
                            {renderCopyRow(
                              'Customer Net Yield',
                              `${fmtNgn(j.customerNetYieldNgn)} (${j.customerRatePct.toFixed(1)}% p.a.)`,
                            )}
                            {renderCopyRow('Total Yield Spread', fmtNgn(j.yieldSpreadNgn))}
                            {j.notes && renderCopyRow('Notes', j.notes)}
                          </div>
                        </div>
                      </div>

                      <div className="fin-drawer__footer">
                        {parentPolicy ? (
                          <button
                            type="button"
                            className="fin-btn fin-btn--primary"
                            onClick={() => setDrawer({ kind: 'POLICY', policy: parentPolicy })}
                          >
                            <span>View Parent Policy</span>
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          className="fin-btn fin-btn--ghost"
                          onClick={() => setDrawer(null)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )
                })()
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
