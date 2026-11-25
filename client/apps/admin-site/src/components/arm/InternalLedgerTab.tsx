import React, { useEffect, useState } from 'react'
import { Download, RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { apiService } from '../../services/api.service'

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

const fmtNgn = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const InternalLedgerTab: React.FC<InternalLedgerTabProps> = ({ token }) => {
  const [loading, setLoading] = useState(true)
  const [productFilter, setProductFilter] = useState<string>('ALL')
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [vaults, setVaults] = useState<LedgerVaultRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchLedger = async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = productFilter !== 'ALL' ? `?productOption=${productFilter}` : ''
      const res = await apiService.get(`/admin/arm/internal-ledger${qs}`, token)
      const data = res?.data || res
      setSummary(data?.summary || null)
      setVaults(data?.vaults || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load internal savings ledger')
    } finally {
      setLoading(false)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Dual Ledger: Customer Liability vs. Upward Treasury &amp; Premium Recovery
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Customers earn 100% of their advertised rate (10% Rent Protec / 16% Save &amp; Earn)
            with zero visible premium deductions. Upward recovers upfront 2% Rent Protec premiums
            strictly from the internal ARM yield spread.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '12px',
            }}
          >
            <option value="ALL">All Plans</option>
            <option value="RENT_PROTEC">Rent Protec (10%)</option>
            <option value="SAVE_AND_EARN">Save &amp; Earn (16%)</option>
          </select>
          <button type="button" className="btn btn-secondary" onClick={fetchLedger}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportCsv}
            disabled={!vaults.length}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
          }}
        >
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <Wallet size={14} /> Ledger 1: Customer Liability
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px' }}>
              {fmtNgn(summary.totalCustomerLiabilityNgn)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Principal {fmtNgn(summary.totalCustomerPrincipalNgn)} + Yield{' '}
              {fmtNgn(summary.totalCustomerYieldNgn)}
            </div>
          </div>

          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ledger 2: Gross ARM Yield
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#047857' }}>
              {fmtNgn(summary.totalGrossArmYieldNgn)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Yield Spread: {fmtNgn(summary.totalPlatformSpreadNgn)}
            </div>
          </div>

          <div className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <ShieldCheck size={14} /> Upfront 2% Premiums
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px' }}>
              {fmtNgn(summary.totalUpfrontPremiumObligationNgn)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Recovered {fmtNgn(summary.totalPremiumRecoveredNgn)} · Unrecovered{' '}
              <strong style={{ color: '#c2501f' }}>
                {fmtNgn(summary.totalUnrecoveredPremiumNgn)}
              </strong>
            </div>
          </div>

          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Net Upward Margin
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#059669' }}>
              {fmtNgn(summary.totalNetPlatformMarginNgn)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {summary.rentProtecCount} Rent Protec · {summary.saveAndEarnCount} Save &amp; Earn
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Cust. Principal</th>
              <th>Cust. Yield</th>
              <th>Gross ARM Yield</th>
              <th>Yield Spread</th>
              <th>2% Premium Oblig.</th>
              <th>Recovered / Unrec.</th>
              <th>Net Margin</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading dual ledger...
                </td>
              </tr>
            ) : vaults.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No savings vaults found for this filter.
                </td>
              </tr>
            ) : (
              vaults.map((v) => (
                <tr key={v.vaultUuid}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{v.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.customerEmail}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background:
                          v.productOption === 'RENT_PROTEC'
                            ? 'rgba(194, 80, 31, 0.12)'
                            : 'rgba(5, 150, 105, 0.12)',
                        color: v.productOption === 'RENT_PROTEC' ? '#c2501f' : '#047857',
                      }}
                    >
                      {v.productOption === 'RENT_PROTEC' ? 'Rent Protec' : 'Save & Earn'} (
                      {v.appliedAnnualRatePct}%)
                    </span>
                  </td>
                  <td>{fmtNgn(v.customerPrincipalNgn)}</td>
                  <td style={{ color: '#047857', fontWeight: 600 }}>
                    {fmtNgn(v.customerAccruedYieldNgn)}
                  </td>
                  <td>{fmtNgn(v.grossArmYieldNgn)}</td>
                  <td style={{ fontWeight: 600 }}>{fmtNgn(v.platformSpreadNgn)}</td>
                  <td>{fmtNgn(v.upfrontPremiumObligationNgn)}</td>
                  <td>
                    <div>{fmtNgn(v.premiumRecoveredNgn)} ({v.premiumRecoveryPct}%)</div>
                    {v.unrecoveredPremiumNgn > 0 && (
                      <div style={{ fontSize: '11px', color: '#c2501f' }}>
                        Rem: {fmtNgn(v.unrecoveredPremiumNgn)}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, color: '#059669' }}>
                    {fmtNgn(v.netPlatformMarginNgn)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
