import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { apiService } from '../../services/api.service'
import '../../styles/finance-console.css'

interface InternalLedgerTabProps {
  token: string
}

interface LedgerSummary {
  vaultCount: number
  rentProtecCount: number
  saveAndEarnCount: number
  totalCustomerPrincipalNgn: number
  totalCustomerYieldNgn: number
  totalCustomerLiabilityNgn: number
  totalGrossArmYieldNgn: number
  totalPlatformSpreadNgn: number
  totalUpfrontPremiumObligationNgn: number
  totalPremiumRecoveredNgn: number
  totalUnrecoveredPremiumNgn: number
  totalNetPlatformMarginNgn: number
}

interface LedgerVaultRow {
  vaultUuid: string
  customerName: string
  customerEmail: string
  productOption: string
  lockStatus: string
  appliedAnnualRatePct: number
  customerPrincipalNgn: number
  customerAccruedYieldNgn: number
  customerTotalLiabilityNgn: number
  grossArmYieldNgn: number
  platformSpreadNgn: number
  upfrontPremiumObligationNgn: number
  premiumRecoveredNgn: number
  unrecoveredPremiumNgn: number
  netPlatformMarginNgn: number
  premiumRecoveryPct: number
}

interface JournalEntry {
  uuid: string
  vaultUuid: string
  entryDate: string
  entryType: string
  productOption: string
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

const fmtNgn = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

function formatEventLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const InternalLedgerTab: React.FC<InternalLedgerTabProps> = ({ token }) => {
  const [loading, setLoading] = useState(true)
  const [isSandbox, setIsSandbox] = useState(false)
  const [simulatingDays, setSimulatingDays] = useState<number | null>(null)
  const [simMessage, setSimMessage] = useState<string | null>(null)
  const [productFilter, setProductFilter] = useState<string>('ALL')
  const [subTab, setSubTab] = useState<'VAULTS' | 'JOURNAL'>('VAULTS')
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [vaults, setVaults] = useState<LedgerVaultRow[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchLedger = async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = productFilter !== 'ALL' ? `?productOption=${productFilter}` : ''
      const res = await apiService.get(`/admin/arm/internal-ledger${qs}`, token)
      const data = res?.data || res
      setIsSandbox(Boolean(data?.isSandbox))
      setSummary(data?.summary || null)
      setVaults(data?.vaults || [])
      setJournal(data?.recentJournal || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load internal savings ledger')
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
  }, [token, productFilter])

  const exportCsv = () => {
    if (!vaults.length) return
    const headers = [
      'Customer',
      'Email',
      'Product',
      'Status',
      'Customer Rate (%)',
      'Customer Principal (NGN)',
      'Customer Yield (NGN)',
      'Customer Liability (NGN)',
      'Gross ARM Yield (NGN)',
      'Yield Spread (NGN)',
      'Upfront 2% Premium (NGN)',
      'Premium Recovered (NGN)',
      'Unrecovered Premium (NGN)',
      'Net Upward Margin (NGN)',
    ]
    const lines = [
      headers.join(','),
      ...vaults.map((v) =>
        [
          `"${v.customerName.replace(/"/g, '""')}"`,
          `"${v.customerEmail}"`,
          v.productOption,
          v.lockStatus,
          v.appliedAnnualRatePct,
          v.customerPrincipalNgn.toFixed(2),
          v.customerAccruedYieldNgn.toFixed(2),
          v.customerTotalLiabilityNgn.toFixed(2),
          v.grossArmYieldNgn.toFixed(2),
          v.platformSpreadNgn.toFixed(2),
          v.upfrontPremiumObligationNgn.toFixed(2),
          v.premiumRecoveredNgn.toFixed(2),
          v.unrecoveredPremiumNgn.toFixed(2),
          v.netPlatformMarginNgn.toFixed(2),
        ].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `upward-dual-savings-ledger-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fin-stack">
      {/* Sub-header & Controls */}
      <div className="fin-subhead">
        <div>
          <h3 className="fin-subhead__title">Dual Savings Ledger &amp; Unit Economics</h3>
          <p className="fin-subhead__desc">
            Customer liability (100% of advertised yield) vs. internal ARM spread &amp; 2% Rent
            Protec recovery.
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

          <select
            className="fin-select"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="ALL">All Plans</option>
            <option value="RENT_PROTEC">Rent Protec (10%)</option>
            <option value="SAVE_AND_EARN">Save &amp; Earn (12–16%)</option>
          </select>

          <button type="button" className="fin-btn fin-btn--ghost" onClick={fetchLedger}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="fin-btn fin-btn--primary"
            onClick={exportCsv}
            disabled={!vaults.length}
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

      {/* KPI Strip */}
      {summary && (
        <div className="fin-kpi-grid">
          <div className="fin-kpi fin-kpi--dark">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Ledger 1 · Customer Liability</span>
              <Wallet size={15} className="fin-kpi__icon" />
            </div>
            <div className="fin-kpi__value">{fmtNgn(summary.totalCustomerLiabilityNgn)}</div>
            <div className="fin-kpi__sub">
              Principal {fmtNgn(summary.totalCustomerPrincipalNgn)} + Yield{' '}
              {fmtNgn(summary.totalCustomerYieldNgn)}
            </div>
          </div>

          <div className="fin-kpi">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Ledger 2 · Gross ARM Yield</span>
              <TrendingUp size={15} color="#10b981" />
            </div>
            <div className="fin-kpi__value fin-kpi__value--green">
              {fmtNgn(summary.totalGrossArmYieldNgn)}
            </div>
            <div className="fin-kpi__sub">
              Platform Spread: {fmtNgn(summary.totalPlatformSpreadNgn)}
            </div>
          </div>

          <div className="fin-kpi">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Upfront 2% Premiums</span>
              <ShieldCheck size={15} className="fin-kpi__icon" />
            </div>
            <div className="fin-kpi__value">{fmtNgn(summary.totalUpfrontPremiumObligationNgn)}</div>
            <div className="fin-kpi__sub">
              Recovered {fmtNgn(summary.totalPremiumRecoveredNgn)} · Left{' '}
              <strong style={{ color: '#c2501f' }}>
                {fmtNgn(summary.totalUnrecoveredPremiumNgn)}
              </strong>
            </div>
          </div>

          <div className="fin-kpi">
            <div className="fin-kpi__top">
              <span className="fin-kpi__label">Net Upward Margin</span>
              <TrendingUp size={15} color="#059669" />
            </div>
            <div className="fin-kpi__value fin-kpi__value--green">
              {fmtNgn(summary.totalNetPlatformMarginNgn)}
            </div>
            <div className="fin-kpi__sub">
              {summary.rentProtecCount} Rent Protec · {summary.saveAndEarnCount} Save &amp; Earn
            </div>
          </div>
        </div>
      )}

      {/* Sub-view switcher (Vaults vs Daily Journal) */}
      <div className="fin-tabs">
        <button
          type="button"
          className={`fin-tab ${subTab === 'VAULTS' ? 'fin-tab--active' : ''}`}
          onClick={() => setSubTab('VAULTS')}
        >
          <span>Vault Balances</span>
          <span className="fin-tab__count">{vaults.length}</span>
        </button>
        <button
          type="button"
          className={`fin-tab ${subTab === 'JOURNAL' ? 'fin-tab--active' : ''}`}
          onClick={() => setSubTab('JOURNAL')}
        >
          <span>Daily Spread Journal</span>
          <span className="fin-tab__count">{journal.length}</span>
        </button>
      </div>

      {subTab === 'VAULTS' && (
        <div className="fin-panel">
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th className="fin-num">Principal</th>
                  <th className="fin-num">Cust. Yield</th>
                  <th className="fin-num">Gross ARM</th>
                  <th className="fin-num">Spread</th>
                  <th className="fin-num">2% Premium</th>
                  <th>Recovery</th>
                  <th className="fin-num">Net Margin</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9}>
                        <div className="fin-skeleton" style={{ width: `${65 + (i % 3) * 10}%` }} />
                      </td>
                    </tr>
                  ))
                ) : vaults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="fin-empty">
                      No savings vaults match this filter.
                    </td>
                  </tr>
                ) : (
                  vaults.map((v) => (
                    <tr key={v.vaultUuid}>
                      <td>
                        <div className="fin-cell-primary">{v.customerName}</div>
                        <div className="fin-cell-sub">{v.customerEmail}</div>
                      </td>
                      <td>
                        <span
                          className={`fin-pill ${
                            v.productOption === 'RENT_PROTEC'
                              ? 'fin-pill--clay'
                              : 'fin-pill--green'
                          }`}
                        >
                          {v.productOption === 'RENT_PROTEC' ? 'Rent Protec' : 'Save & Earn'} ·{' '}
                          {v.appliedAnnualRatePct}%
                        </span>
                      </td>
                      <td className="fin-num">{fmtNgn(v.customerPrincipalNgn)}</td>
                      <td className="fin-num fin-text-green">
                        +{fmtNgn(v.customerAccruedYieldNgn)}
                      </td>
                      <td className="fin-num">{fmtNgn(v.grossArmYieldNgn)}</td>
                      <td className="fin-num fin-cell-primary">{fmtNgn(v.platformSpreadNgn)}</td>
                      <td className="fin-num">
                        {v.upfrontPremiumObligationNgn > 0
                          ? fmtNgn(v.upfrontPremiumObligationNgn)
                          : '—'}
                      </td>
                      <td style={{ minWidth: '155px' }}>
                        {v.upfrontPremiumObligationNgn > 0 ? (
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '11.5px',
                                gap: '6px',
                              }}
                            >
                              <span className="fin-text-green">{v.premiumRecoveryPct}%</span>
                              <span className="fin-text-muted">
                                {v.unrecoveredPremiumNgn > 0
                                  ? `${fmtNgn(v.unrecoveredPremiumNgn)} left`
                                  : 'Recovered'}
                              </span>
                            </div>
                            <div className="fin-progress">
                              <div
                                className="fin-progress__fill"
                                style={{ width: `${Math.min(100, v.premiumRecoveryPct)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="fin-text-muted">N/A</span>
                        )}
                      </td>
                      <td className="fin-num fin-text-green">{fmtNgn(v.netPlatformMarginNgn)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'JOURNAL' && (
        <div className="fin-panel">
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Plan</th>
                  <th>Rates (ARM / Cust)</th>
                  <th className="fin-num">Gross ARM</th>
                  <th className="fin-num">Cust. Yield</th>
                  <th className="fin-num">To Recovery</th>
                  <th className="fin-num">Net Margin</th>
                </tr>
              </thead>
              <tbody>
                {journal.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fin-empty">
                      No daily spread journal entries yet.
                    </td>
                  </tr>
                ) : (
                  journal.map((j) => (
                    <tr key={j.uuid}>
                      <td className="fin-text-muted">
                        {new Date(j.entryDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span className="fin-pill fin-pill--neutral">
                          {formatEventLabel(j.entryType)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`fin-pill ${
                            j.productOption === 'RENT_PROTEC'
                              ? 'fin-pill--clay'
                              : 'fin-pill--green'
                          }`}
                        >
                          {j.productOption === 'RENT_PROTEC' ? 'Rent Protec' : 'Save & Earn'}
                        </span>
                      </td>
                      <td className="fin-text-muted">
                        {j.grossArmRatePct.toFixed(2)}% / {j.customerRatePct.toFixed(1)}%
                      </td>
                      <td className="fin-num">{fmtNgn(j.grossArmYieldNgn)}</td>
                      <td className="fin-num">{fmtNgn(j.customerNetYieldNgn)}</td>
                      <td className="fin-num fin-text-clay">
                        {fmtNgn(j.premiumRecoveryAppliedNgn)}
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
    </div>
  )
}
