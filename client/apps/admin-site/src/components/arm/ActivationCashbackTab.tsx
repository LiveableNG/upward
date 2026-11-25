import React, { useEffect, useState } from 'react'
import { CheckCircle2, Gift, RefreshCw } from 'lucide-react'
import { apiService } from '../../services/api.service'

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
  createdAt: string
}

interface CashbackGrant {
  uuid: string
  customerName: string
  customerEmail: string
  amountNgn: number
  reference: string
  fundingSource: string
  notes: string | null
  createdAt: string
}

const fmtNgn = (n: number) =>
  `₦${Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

export const ActivationCashbackTab: React.FC<ActivationCashbackTabProps> = ({ token }) => {
  const [loading, setLoading] = useState(true)
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
            Activation Cashback Rewards ({campaign?.code || 'ACTIVATION_DEC_2026'})
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Credit real-money activation cashback (backed by Paystack balance) directly into
            verified savers&apos; Rent Vaults with strict budget cap and 1-per-user enforcement.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchOverview}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            background: message.isError
              ? 'rgba(239, 68, 68, 0.08)'
              : 'rgba(16, 185, 129, 0.1)',
            color: message.isError ? '#b91c1c' : '#047857',
          }}
        >
          {message.text}
        </div>
      )}

      {campaign && (
        <div className="card" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={18} color="#c2501f" />
              <strong style={{ fontSize: '14px' }}>{campaign.name}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#047857' }}>
              {fmtNgn(campaign.rewardAmountNgn)} / saver · {campaign.slotsRemaining} of{' '}
              {campaign.slotsTotal} slots left
            </span>
          </div>

          <div
            style={{
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '12px',
            }}
          >
            <div
              style={{
                width: `${usedPct}%`,
                height: '100%',
                background: '#c2501f',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <span>Disbursed: {fmtNgn(campaign.totalDisbursedNgn)}</span>
            <span>
              Remaining: <strong>{fmtNgn(campaign.remainingBudgetNgn)}</strong> /{' '}
              {fmtNgn(campaign.budgetCapNgn)}
            </span>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px' }}>
          Eligible Opted-In Savers ({eligible.length})
        </div>
        <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
          <thead>
            <tr>
              <th>Saver</th>
              <th>Plan</th>
              <th>Vault Balance</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                  Loading savers...
                </td>
              </tr>
            ) : eligible.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No opted-in savers yet.
                </td>
              </tr>
            ) : (
              eligible.map((s) => (
                <tr key={s.vaultUuid}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.customerEmail}</div>
                  </td>
                  <td>{s.productOption === 'RENT_PROTEC' ? 'Rent Protec' : 'Save & Earn'}</td>
                  <td>{fmtNgn(s.currentPrincipalNgn)}</td>
                  <td>
                    {s.alreadyCredited ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 700 }}>
                        <CheckCircle2 size={14} /> Credited
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Eligible</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                      disabled={
                        s.alreadyCredited ||
                        creditingUuid === s.userUuid ||
                        !campaign ||
                        campaign.remainingBudgetNgn < campaign.rewardAmountNgn
                      }
                      onClick={() => handleCredit(s)}
                    >
                      {s.alreadyCredited
                        ? 'Already Credited'
                        : creditingUuid === s.userUuid
                          ? 'Crediting...'
                          : `Credit ${fmtNgn(campaign?.rewardAmountNgn || 3000)}`}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {grants.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px' }}>
            Credited Cashback Audit Log ({grants.length})
          </div>
          <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Funding Source</th>
                <th>Credited At</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.uuid}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{g.customerEmail}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#047857' }}>{fmtNgn(g.amountNgn)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{g.reference}</td>
                  <td>{g.fundingSource}</td>
                  <td>{new Date(g.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
