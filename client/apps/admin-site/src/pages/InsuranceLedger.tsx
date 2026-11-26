import { useEffect, useState } from 'react'
import { Download, Play, RefreshCw, Search, ShieldCheck, Umbrella, Wallet } from 'lucide-react'
import { apiService } from '../services/api.service'

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

const fmtNgn = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

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
      setPolicies(data?.policies || [])
      setRecoveryJournal(data?.recentRecoveryJournal || [])
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

  const getStatusStyle = (status: string) => {
    const s = status.toUpperCase()
    if (s === 'ACTIVE' || s === 'PAID' || s === 'MATURED') {
      return { bg: 'rgba(16, 185, 129, 0.14)', color: '#047857' }
    }
    if (s.includes('CANCEL') || s === 'FAILED') {
      return { bg: 'rgba(239, 68, 68, 0.14)', color: '#b91c1c' }
    }
    return { bg: 'rgba(217, 119, 6, 0.14)', color: '#b45309' }
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Umbrella size={22} color="#c2501f" /> Insurance Policy &amp; Remittance Ledger
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Unified view of Standalone Rent Support Insurance policies and Bundled Rent Protec
            (Savings + Insurance) policies, 2% insurer remittance obligations, and spread recovery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isSandbox && (
            <>
              {[1, 30, 90, 180].map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn btn-secondary"
                  disabled={simulatingDays !== null}
                  onClick={() => handleSimulateAccrual(d)}
                >
                  <Play size={13} /> {simulatingDays === d ? 'Running...' : `+${d}d`}
                </button>
              ))}
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchLedger}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportCsv}
            disabled={!policies.length}
          >
            <Download size={14} /> Export Insurer CSV
          </button>
        </div>
      </div>

      {simMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#047857',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {simMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <ShieldCheck size={14} /> Total Sum Assured
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px' }}>
              {fmtNgn(summary.totalSumAssuredNgn)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {summary.activePoliciesCount} active policies ({summary.rentProtecCount} Rent Protec ·{' '}
              {summary.standaloneCount} Standalone)
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <Wallet size={14} /> Total Insurer Remittance (2%)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#c2501f' }}>
              {fmtNgn(summary.totalInsurerRemittanceNgn)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Standalone: {fmtNgn(summary.standalonePremiumCollectedNgn)} · Rent Protec:{' '}
              {fmtNgn(summary.rentProtecPremiumPayableNgn)}
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Rent Protec Premium Recovered
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#047857' }}>
              {fmtNgn(summary.rentProtecPremiumRecoveredNgn)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Recovered via internal ARM yield spread &amp; early exits
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Unrecovered Rent Protec Exposure
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#b45309' }}>
              {fmtNgn(summary.rentProtecUnrecoveredPremiumNgn)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Upfront 2% premiums still accruing back via spread
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
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
            placeholder="Search policyholder, email, landlord, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchLedger()
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
            }}
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '12px',
          }}
        >
          <option value="ALL">All Policy Types</option>
          <option value="RENT_PROTEC">Rent Protec (Bundled)</option>
          <option value="STANDALONE">Standalone Rent Insurance</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '12px',
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active (Coverage Bound)</option>
          <option value="PENDING_ACTIVATION">Pending Activation (&lt;20% Funded)</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="MATURED">Matured</option>
          <option value="CANCELLED_EARLY_EXIT">Cancelled (Early Exit)</option>
        </select>

        <button type="button" className="btn btn-secondary" onClick={fetchLedger}>
          Apply
        </button>
      </div>

      {/* Policies Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
          <thead>
            <tr>
              <th>Policyholder</th>
              <th>Source</th>
              <th>Sum Assured</th>
              <th>2% Premium</th>
              <th>Recovered / Unrec.</th>
              <th>Status</th>
              <th>Coverage / Due Date</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading insurance ledger...
                </td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No insurance policies found for this filter.
                </td>
              </tr>
            ) : (
              policies.map((p) => {
                const st = getStatusStyle(p.status)
                return (
                  <tr key={`${p.source}-${p.policyUuid}`}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.policyholderName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.policyholderEmail}
                      </div>
                      {p.landlordName && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Landlord: {p.landlordName}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background:
                            p.source === 'RENT_PROTEC'
                              ? 'rgba(194, 80, 31, 0.12)'
                              : 'rgba(59, 130, 246, 0.12)',
                          color: p.source === 'RENT_PROTEC' ? '#c2501f' : '#1d4ed8',
                        }}
                      >
                        {p.source === 'RENT_PROTEC' ? 'Rent Protec' : 'Standalone'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmtNgn(p.sumAssuredNgn)}</td>
                    <td style={{ fontWeight: 700 }}>
                      {p.status === 'PENDING_ACTIVATION' ? (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                          ₦0.00 (Unbound)
                        </span>
                      ) : (
                        fmtNgn(p.premiumAmountNgn)
                      )}
                    </td>
                    <td>
                      {p.source === 'STANDALONE' ? (
                        <span style={{ color: '#047857' }}>Direct Paid</span>
                      ) : p.status === 'PENDING_ACTIVATION' ? (
                        <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                          Funded {p.fundingProgressPct ?? 0}% / {p.activationThresholdPct ?? 20}% min
                        </span>
                      ) : (
                        <>
                          <div>Rec: {fmtNgn(p.premiumRecoveredNgn)}</div>
                          {p.unrecoveredPremiumNgn > 0 && (
                            <div style={{ fontSize: '11px', color: '#c2501f' }}>
                              Rem: {fmtNgn(p.unrecoveredPremiumNgn)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: st.bg,
                          color: st.color,
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>{p.coverageDate || '—'}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {recoveryJournal.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px' }}>
            Rent Protec Premium Recovery Journal ({recoveryJournal.length})
          </div>
          <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Policyholder</th>
                <th>Event</th>
                <th>Balance Base</th>
                <th>Gross ARM Yield</th>
                <th>Customer 10% Yield</th>
                <th>Recovered Toward 2%</th>
                <th>Net Margin</th>
              </tr>
            </thead>
            <tbody>
              {recoveryJournal.map((j) => (
                <tr key={j.uuid}>
                  <td>{new Date(j.entryDate).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{j.policyholderName}</td>
                  <td>{j.entryType}</td>
                  <td>{fmtNgn(j.principalBaseNgn)}</td>
                  <td>{fmtNgn(j.grossArmYieldNgn)}</td>
                  <td>{fmtNgn(j.customerNetYieldNgn)}</td>
                  <td style={{ color: '#047857', fontWeight: 700 }}>
                    +{fmtNgn(j.premiumRecoveryAppliedNgn)}
                  </td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>
                    {fmtNgn(j.netMarginDeltaNgn)}
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
