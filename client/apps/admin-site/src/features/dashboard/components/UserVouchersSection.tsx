import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Gift,
  Plus,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Mail,
  Trophy,
  Wallet,
  Lock,
  ShoppingBag,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'
import { Modal } from '../../../components/common'
import { showToast } from '@upward/client-core'

interface VoucherWalletSummary {
  currency: string
  availableBalanceKobo: string
  availableBalanceNaira: number
  reservedBalanceKobo: string
  reservedBalanceNaira: number
  lifetimeEarnedKobo: string
  lifetimeEarnedNaira: number
  lifetimeRedeemedKobo: string
  lifetimeRedeemedNaira: number
}

interface VoucherLedgerItem {
  id: number
  uuid: string
  type:
    | 'CREDIT_SIGNUP_LINK'
    | 'CREDIT_GAMING_REWARD'
    | 'CREDIT_ADMIN_GRANT'
    | 'RESERVE_ORDER'
    | 'REDEEM_ORDER'
    | 'RELEASE_ORDER'
    | 'ADMIN_REVERSAL'
  amountKobo: string
  amountNaira: number
  balanceAfterKobo: string
  balanceAfterNaira: number
  reason?: string | null
  campaign?: {
    id: number
    code: string
    name: string
    type: string
  } | null
  grantedByAdmin?: {
    id: string
    email: string
  } | null
  order?: {
    id: number
    uuid: string
    orderNumber: string
  } | null
  createdAt: string
}

interface UserVouchersSectionProps {
  userUuid: string
  userFirstName: string
  userEmail: string
  token: string
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000]

function formatNaira(amount: number): string {
  const abs = Math.abs(amount)
  return `₦${abs.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function getEntryMeta(type: VoucherLedgerItem['type']) {
  switch (type) {
    case 'CREDIT_SIGNUP_LINK':
      return { label: 'Signup Link', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', isCredit: true }
    case 'CREDIT_GAMING_REWARD':
      return { label: 'Gaming Reward', color: '#c2501f', bg: 'rgba(194, 80, 31, 0.1)', isCredit: true }
    case 'CREDIT_ADMIN_GRANT':
      return { label: 'Admin Credit', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', isCredit: true }
    case 'RESERVE_ORDER':
      return { label: 'Reserved (Pending)', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', isCredit: false }
    case 'REDEEM_ORDER':
      return { label: 'Spent on Order', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', isCredit: false }
    case 'RELEASE_ORDER':
      return { label: 'Released (Cancelled)', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)', isCredit: true }
    case 'ADMIN_REVERSAL':
      return { label: 'Reversal', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', isCredit: false }
    default:
      return { label: type, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', isCredit: false }
  }
}

export const UserVouchersSection: React.FC<UserVouchersSectionProps> = ({
  userUuid,
  userFirstName,
  userEmail,
  token,
}) => {
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<VoucherWalletSummary | null>(null)
  const [ledger, setLedger] = useState<VoucherLedgerItem[]>([])
  const [filterTab, setFilterTab] = useState<'ALL' | 'CREDITS' | 'SPENDING'>('ALL')

  // Award Modal State
  const [showModal, setShowModal] = useState(false)
  const [amountInput, setAmountInput] = useState('500')
  const [entryType, setEntryType] = useState<'CREDIT_GAMING_REWARD' | 'CREDIT_ADMIN_GRANT'>('CREDIT_GAMING_REWARD')
  const [reason, setReason] = useState('Upward Game Night Winner')
  const [sendEmail, setSendEmail] = useState(true)
  const [emailSubject, setEmailSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchSummary = useCallback(async () => {
    if (!userUuid) return
    try {
      setLoading(true)
      const res = await apiService.get(`/admin/vouchers/users/${userUuid}`, token)
      const data = res?.data || res
      setWallet(data?.wallet || null)
      setLedger(data?.ledger || [])
    } catch (err: any) {
      console.error('Failed to load user voucher summary:', err)
    } finally {
      setLoading(false)
    }
  }, [userUuid, token])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const openAwardModal = () => {
    const defaultAmt = '500'
    setAmountInput(defaultAmt)
    setEntryType('CREDIT_GAMING_REWARD')
    setReason('Upward Gaming Event Reward')
    setSendEmail(true)
    setEmailSubject(`Congratulations ${userFirstName || 'Champion'}! You Won a ₦500 Upward Voucher`)
    setCustomMessage(
      `Congratulations on winning at our Upward gaming event! We’ve added ₦500 to your Upward voucher balance. It stacks with your existing credits and automatically discounts your Home Refresh Package in the Upward Pay app.`,
    )
    setIdempotencyKey(`adm-${userUuid.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    setShowModal(true)
  }

  const handleAmountChange = (val: string) => {
    setAmountInput(val)
    const num = Number(val)
    if (!isNaN(num) && num > 0) {
      const fmt = num.toLocaleString('en-NG')
      setEmailSubject(`Congratulations ${userFirstName || 'Champion'}! You Won a ₦${fmt} Upward Voucher`)
      setCustomMessage(
        `Congratulations on winning at our Upward gaming event! We’ve added ₦${fmt} to your Upward voucher balance. It stacks with your existing credits and automatically discounts your Home Refresh Package in the Upward Pay app.`,
      )
    }
  }

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNaira = Number(amountInput)
    if (isNaN(amountNaira) || amountNaira <= 0) {
      showToast('Please enter a valid voucher amount greater than ₦0', true)
      return
    }

    try {
      setSubmitting(true)
      const res = await apiService.post(
        `/admin/vouchers/users/${userUuid}/grant`,
        {
          amountNaira,
          entryType,
          reason: reason.trim() || undefined,
          sendEmail,
          emailSubject: sendEmail ? emailSubject.trim() || undefined : undefined,
          customMessage: sendEmail ? customMessage.trim() || undefined : undefined,
          idempotencyKey,
        },
        token,
      )
      const resultData = res?.data || res
      if (resultData?.wallet) {
        setWallet(resultData.wallet)
      }
      await fetchSummary()
      setShowModal(false)
      showToast(
        `₦${amountNaira.toLocaleString('en-NG')} voucher credited${resultData?.emailDispatched ? ' & email sent' : ''}!`,
      )
    } catch (err: any) {
      showToast(err?.message || 'Failed to credit voucher', true)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLedger = useMemo(() => {
    if (filterTab === 'CREDITS') {
      return ledger.filter(
        (l) =>
          l.type === 'CREDIT_SIGNUP_LINK' ||
          l.type === 'CREDIT_GAMING_REWARD' ||
          l.type === 'CREDIT_ADMIN_GRANT' ||
          l.type === 'RELEASE_ORDER',
      )
    }
    if (filterTab === 'SPENDING') {
      return ledger.filter(
        (l) => l.type === 'RESERVE_ORDER' || l.type === 'REDEEM_ORDER' || l.type === 'ADMIN_REVERSAL',
      )
    }
    return ledger
  }, [ledger, filterTab])

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gift size={18} style={{ color: 'var(--accent)' }} />
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            Vouchers &amp; Gaming Rewards
          </h4>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '100px',
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {ledger.length} entries
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchSummary}
            disabled={loading}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
            title="Refresh voucher balance"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={openAwardModal}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Plus size={14} />
            <span>Award Voucher</span>
          </button>
        </div>
      </div>

      {/* Balance Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            border: '1px solid rgba(22, 163, 74, 0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#15803d', fontWeight: 600, marginBottom: '4px' }}>
            <Wallet size={13} />
            <span>Available Balance</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
            {loading ? '…' : formatNaira(wallet?.availableBalanceNaira ?? 0)}
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-hover)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
            <Lock size={13} />
            <span>Reserved (Pending)</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {loading ? '…' : formatNaira(wallet?.reservedBalanceNaira ?? 0)}
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-hover)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
            <Trophy size={13} />
            <span>Lifetime Earned</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {loading ? '…' : formatNaira(wallet?.lifetimeEarnedNaira ?? 0)}
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-hover)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
            <ShoppingBag size={13} />
            <span>Lifetime Spent</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {loading ? '…' : formatNaira(wallet?.lifetimeRedeemedNaira ?? 0)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
          <History size={14} />
          <span>Balance &amp; Spending History</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'CREDITS', 'SPENDING'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--border)',
                backgroundColor: filterTab === tab ? 'var(--accent)' : 'transparent',
                color: filterTab === tab ? '#fff' : 'var(--text-muted)',
              }}
            >
              {tab === 'ALL' ? 'All' : tab === 'CREDITS' ? 'Earned' : 'Spent / Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger List */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Loading voucher ledger…
        </div>
      ) : filteredLedger.length === 0 ? (
        <div
          style={{
            padding: '22px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '10px',
            border: '1px dashed var(--border)',
          }}
        >
          No voucher activity recorded yet. Click <strong>Award Voucher</strong> to credit a reward.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
          {filteredLedger.map((item) => {
            const meta = getEntryMeta(item.type)
            const isPositive = item.amountNaira >= 0
            return (
              <div
                key={item.uuid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: meta.bg,
                      color: meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {isPositive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          backgroundColor: meta.bg,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                      {item.campaign?.code && (
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {item.campaign.code}
                        </span>
                      )}
                      {item.order?.orderNumber && (
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          Order #{item.order.orderNumber}
                        </span>
                      )}
                    </div>
                    {item.reason && (
                      <div style={{ fontSize: '12px', marginTop: '3px', color: 'var(--text)' }}>
                        {item.reason}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(item.createdAt).toLocaleString()}
                      {item.grantedByAdmin?.email ? ` • By ${item.grantedByAdmin.email}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isPositive ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {isPositive ? '+' : '-'}
                    {formatNaira(item.amountNaira)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Bal: {formatNaira(item.balanceAfterNaira)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Award Voucher Modal (reusable admin Modal via portal) */}
      <Modal
        isOpen={showModal}
        onClose={() => !submitting && setShowModal(false)}
        title="Award Voucher / Gaming Reward"
        description={`Credit any amount to ${userFirstName || userEmail} (${userEmail}). Credits stack automatically on the Home Refresh Package.`}
        icon={<Trophy size={20} />}
        maxWidth="540px"
        footerActions={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={submitting}
              className="btn-secondary"
              style={{ flex: 1, justifyContent: 'center', padding: '10px 14px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="award-voucher-form"
              disabled={submitting}
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '10px 18px', fontSize: '13px', fontWeight: 600 }}
            >
              {submitting ? 'Crediting…' : `Credit ₦${Number(amountInput || 0).toLocaleString('en-NG')}`}
            </button>
          </>
        }
      >
        <form
          id="award-voucher-form"
          onSubmit={handleGrantSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '62vh', overflowY: 'auto', paddingRight: '2px' }}
        >
          {/* Quick Amount Chips + Custom Arbitrary Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Voucher Amount (₦ NGN)
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAmountChange(String(amt))}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    backgroundColor: Number(amountInput) === amt ? 'var(--accent)' : 'var(--surface-hover)',
                    color: Number(amountInput) === amt ? '#fff' : 'var(--text)',
                  }}
                >
                  ₦{amt.toLocaleString('en-NG')}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              step="any"
              required
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter any custom amount (e.g. 750, 1500, 3200)"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Reward Classification */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Reward Type
            </label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            >
              <option value="CREDIT_GAMING_REWARD">Gaming Event Reward</option>
              <option value="CREDIT_ADMIN_GRANT">Manual Admin Credit / Bonus</option>
            </select>
          </div>

          {/* Reason / Event Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Reason / Game Label
            </label>
            <input
              type="text"
              maxLength={240}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Trivia Round 2 Winner, Spin Wheel Prize"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Congratulatory Email Section */}
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              <Mail size={14} style={{ color: 'var(--accent)' }} />
              <span>Send customized congratulatory email</span>
            </label>

            {sendEmail && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Congratulatory Message
                  </label>
                  <textarea
                    rows={4}
                    maxLength={3000}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
