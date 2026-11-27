import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Gift, RefreshCw } from 'lucide-react'
import { apiService } from '../../services/api.service'
import '../../styles/finance-console.css'

interface ActivationCashbackTabProps {
  token: string
}

interface CashbackCampaign {
  uuid: string
  code: string
  name: string
  rewardAmountNgn: number
  budgetCapNgn: number
  totalDisbursedNgn: number
  remainingBudgetNgn: number
  slotsTotal: number
  slotsUsed: number
  slotsRemaining: number
  reservedCount?: number
  creditedCount?: number
  waitlistedCount?: number
  isActive: boolean
}

interface EligibleSaver {
  userUuid: string
  vaultUuid: string
  customerName: string
  customerEmail: string
  productOption: string
  currentPrincipalNgn: number
  alreadyCredited: boolean
  hasReservedGrant?: boolean
  alreadyAllocated?: boolean
  createdAt: string
}

interface CashbackGrant {
  uuid: string
  customerName: string
  customerEmail: string
  amountNgn: number
  status?: string
  hasVault?: boolean
  reference: string
  fundingSource: string
  notes: string | null
  createdAt: string
}

const fmtNgn = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

export const ActivationCashbackTab: React.FC<ActivationCashbackTabProps> = ({ token }) => {
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'ELIGIBLE' | 'LOG'>('ELIGIBLE')
  const [campaign, setCampaign] = useState<CashbackCampaign | null>(null)
  const [eligible, setEligible] = useState<EligibleSaver[]>([])
  const [grants, setGrants] = useState<CashbackGrant[]>([])
  const [creditingUuid, setCreditingUuid] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null)

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const res = await apiService.get('/admin/arm/cashback', token)
      const data = res?.data || res
      setCampaign(data?.campaign || null)
      setEligible(data?.eligibleSavers || [])
      setGrants(data?.grants || [])
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to load activation cashback data', isError: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [token])

  const handleCredit = async (saver: EligibleSaver) => {
    if (!campaign) return
    try {
      setCreditingUuid(saver.userUuid)
      setMessage(null)
      const res = await apiService.post(
        '/admin/arm/cashback/credit',
        {
          userUuid: saver.userUuid,
          campaignCode: campaign.code,
          amountNgn: campaign.rewardAmountNgn,
          fundingSource: 'PAYSTACK_BALANCE',
          notes: 'Activation event saver cashback',
        },
        token,
      )
      setMessage({
        text: res?.message || `Credited ${fmtNgn(campaign.rewardAmountNgn)} to ${saver.customerName}`,
      })
      await fetchOverview()
    } catch (err: any) {
      setMessage({
        text: err?.message || 'Unable to credit cashback',
        isError: true,
      })
    } finally {
      setCreditingUuid(null)
    }
  }

  const usedPct =
    campaign && campaign.budgetCapNgn > 0
      ? Math.min(100, Math.round((campaign.totalDisbursedNgn / campaign.budgetCapNgn) * 100))
      : 0

  return (
    <div className="fin-stack">
      <div className="fin-subhead">
        <div>
          <h3 className="fin-subhead__title">
            Activation Cashback · <span className="fin-mono">{campaign?.code || 'ACTIVATION_DEC_2026'}</span>
          </h3>
          <p className="fin-subhead__desc">
            Paystack-backed cashback credited directly to verified savers&apos; Rent Vaults
            (1-per-user cap).
          </p>
        </div>

        <button type="button" className="fin-btn fin-btn--ghost" onClick={fetchOverview}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div className={`fin-alert ${message.isError ? 'fin-alert--error' : 'fin-alert--success'}`}>
          {message.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {campaign && (
        <div className="fin-campaign">
          <div className="fin-campaign__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span className="fin-header__icon" style={{ width: 32, height: 32 }}>
                <Gift size={16} />
              </span>
              <div>
                <div className="fin-cell-primary" style={{ fontSize: '14px' }}>
                  {campaign.name}
                </div>
                <div className="fin-cell-sub">
                  {fmtNgn(campaign.rewardAmountNgn)} per saver · {campaign.slotsRemaining} of{' '}
                  {campaign.slotsTotal} slots remaining
                </div>
              </div>
            </div>

            <span className="fin-pill fin-pill--green">
              <span className="fin-pill__dot" />
              {usedPct}% budget used
            </span>
          </div>

          <div className="fin-progress fin-progress--lg">
            <div
              className="fin-progress__fill fin-progress__fill--clay"
              style={{ width: `${usedPct}%` }}
            />
          </div>

          <div className="fin-campaign__meta">
            <span>
              Allocated: {fmtNgn(campaign.totalDisbursedNgn)}
              {typeof campaign.reservedCount === 'number' || typeof campaign.creditedCount === 'number'
                ? ` (${campaign.reservedCount ?? 0} reserved · ${campaign.creditedCount ?? 0} credited${
                    campaign.waitlistedCount ? ` · ${campaign.waitlistedCount} waitlisted` : ''
                  })`
                : ''}
            </span>
            <span>
              Remaining: <strong style={{ color: '#0f172a' }}>{fmtNgn(campaign.remainingBudgetNgn)}</strong>{' '}
              of {fmtNgn(campaign.budgetCapNgn)}
            </span>
          </div>
        </div>
      )}

      <div className="fin-tabs">
        <button
          type="button"
          className={`fin-tab ${subTab === 'ELIGIBLE' ? 'fin-tab--active' : ''}`}
          onClick={() => setSubTab('ELIGIBLE')}
        >
          <span>Eligible Savers</span>
          <span className="fin-tab__count">{eligible.length}</span>
        </button>
        <button
          type="button"
          className={`fin-tab ${subTab === 'LOG' ? 'fin-tab--active' : ''}`}
          onClick={() => setSubTab('LOG')}
        >
          <span>Audit Log</span>
          <span className="fin-tab__count">{grants.length}</span>
        </button>
      </div>

      {subTab === 'ELIGIBLE' && (
        <div className="fin-panel">
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Saver</th>
                  <th>Plan</th>
                  <th className="fin-num">Vault Balance</th>
                  <th>Status</th>
                  <th className="fin-num">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5}>
                        <div className="fin-skeleton" style={{ width: `${65 + i * 10}%` }} />
                      </td>
                    </tr>
                  ))
                ) : eligible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="fin-empty">
                      No opted-in savers yet.
                    </td>
                  </tr>
                ) : (
                  eligible.map((s) => (
                    <tr key={s.vaultUuid}>
                      <td>
                        <div className="fin-cell-primary">{s.customerName}</div>
                        <div className="fin-cell-sub">{s.customerEmail}</div>
                      </td>
                      <td>
                        <span
                          className={`fin-pill ${
                            s.productOption === 'RENT_PROTEC'
                              ? 'fin-pill--clay'
                              : 'fin-pill--green'
                          }`}
                        >
                          {s.productOption === 'RENT_PROTEC' ? 'Rent Protec' : 'Save & Earn'}
                        </span>
                      </td>
                      <td className="fin-num fin-cell-primary">
                        {fmtNgn(s.currentPrincipalNgn)}
                      </td>
                      <td>
                        {s.alreadyCredited ? (
                          <span className="fin-pill fin-pill--green">
                            <span className="fin-pill__dot" /> Credited
                          </span>
                        ) : (
                          <span className="fin-pill fin-pill--neutral">
                            <span className="fin-pill__dot" /> Eligible
                          </span>
                        )}
                      </td>
                      <td className="fin-num">
                        <button
                          type="button"
                          className={`fin-btn fin-btn--sm ${
                            s.alreadyCredited ? 'fin-btn--ghost' : 'fin-btn--brand'
                          }`}
                          disabled={
                            s.alreadyCredited ||
                            creditingUuid === s.userUuid ||
                            !campaign ||
                            campaign.remainingBudgetNgn < campaign.rewardAmountNgn
                          }
                          onClick={() => handleCredit(s)}
                        >
                          {s.alreadyCredited
                            ? 'Credited'
                            : creditingUuid === s.userUuid
                              ? 'Crediting…'
                              : `Credit ${fmtNgn(campaign?.rewardAmountNgn || 3000)}`}
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

      {subTab === 'LOG' && (
        <div className="fin-panel">
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="fin-num">Amount</th>
                  <th>Reference</th>
                  <th>Source</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                {grants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="fin-empty">
                      No cashback grants or interest claims yet.
                    </td>
                  </tr>
                ) : (
                  grants.map((g) => {
                    const statusLabel =
                      g.status === 'RESERVED'
                        ? 'Reserved'
                        : g.status === 'WAITLISTED'
                          ? 'Waitlisted'
                          : g.status === 'REVERSED'
                            ? 'Reversed'
                            : 'Credited'
                    const statusClass =
                      g.status === 'RESERVED'
                        ? 'fin-pill--clay'
                        : g.status === 'WAITLISTED'
                          ? 'fin-pill--neutral'
                          : 'fin-pill--green'
                    return (
                      <tr key={g.uuid}>
                        <td>
                          <div className="fin-cell-primary">{g.customerName}</div>
                          <div className="fin-cell-sub">{g.customerEmail}</div>
                        </td>
                        <td>
                          <span className={`fin-pill ${statusClass}`}>
                            <span className="fin-pill__dot" /> {statusLabel}
                          </span>
                        </td>
                        <td className="fin-num fin-text-green">
                          {g.amountNgn > 0 ? `+${fmtNgn(g.amountNgn)}` : '₦0'}
                        </td>
                        <td className="fin-mono">{g.reference}</td>
                        <td>
                          <span className="fin-pill fin-pill--neutral">{g.fundingSource}</span>
                        </td>
                        <td className="fin-text-muted">
                          {new Date(g.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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
    </div>
  )
}
