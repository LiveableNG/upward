'use client'

import { useState } from 'react'
import { Wallet, TrendingUp, Calendar, Zap, Plus, X, CheckCircle2, Settings, Target, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface RentSavingsCardProps {
  isNewUser?: boolean
  savingsBalance?: number  // in kobo
  savingsGoal?: number     // in kobo
  autoSave?: boolean
  onConfigureGoal?: () => void
}

export default function RentSavingsCard({
  isNewUser = false,
  savingsBalance = 0,
  savingsGoal = 0,
  autoSave = true,
  onConfigureGoal,
}: RentSavingsCardProps) {
  const router = useRouter()
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPostDepositGoalPrompt, setShowPostDepositGoalPrompt] = useState(false)
  const [localSaved, setLocalSaved] = useState(savingsBalance)

  const percentage = savingsGoal > 0 ? Math.min(100, (localSaved / savingsGoal) * 100) : 0
  const depositedAmountKobo = depositAmount ? Number(depositAmount) * 100 : 0

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) return
    setIsDepositing(true)
    await new Promise(r => setTimeout(r, 2000))
    setLocalSaved(s => s + depositedAmountKobo)
    setIsDepositing(false)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setShowDepositModal(false)
      setDepositAmount('')
      // For new users with no goal set, prompt them to set a goal after deposit
      if (isNewUser && savingsGoal === 0) {
        setShowPostDepositGoalPrompt(true)
      }
    }, 2000)
  }

  // ─── POST-DEPOSIT GOAL PROMPT (new user only) ──────────────────────────────
  if (showPostDepositGoalPrompt) {
    return (
      <section className="score-card" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, var(--clay-faint) 0%, transparent 100%)', border: '1px solid rgba(217,119,87,0.2)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(217,119,87,0.3)' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Deposit added!</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>₦{Number(depositAmount).toLocaleString()} saved to your wallet</p>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            Now set a savings goal to track your progress and boost your <strong style={{ color: 'var(--clay)' }}>Discipline Score</strong>.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn--primary"
              style={{ flex: 1, padding: '11px', height: 'auto', fontSize: '13px' }}
              onClick={() => { setShowPostDepositGoalPrompt(false); onConfigureGoal?.() }}
            >
              <Target size={14} /> Set Savings Goal
            </button>
            <button
              onClick={() => setShowPostDepositGoalPrompt(false)}
              style={{ padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font)' }}
            >
              Later
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ── NEW USER VIEW ──────────────────────────────────────────────────────────
  if (isNewUser) {
    return (
      <>
        <section className="score-card" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--clay-faint)', filter: 'blur(40px)', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'var(--clay-faint)', color: 'var(--clay)', padding: '8px', borderRadius: '10px' }}>
                  <Wallet size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Rent Savings</h3>
              </div>
            </div>

            {/* Balance */}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Saved So Far</p>
            <h2 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '4px' }}>
              {formatCurrency(localSaved, 'NGN')}
            </h2>
            {localSaved > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Great start! Set a goal to track your progress.
              </p>
            )}
            {localSaved === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                No savings yet — add your first deposit below.
              </p>
            )}

            {/* Empty progress bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ height: '8px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-solid)' }}>
                <div style={{ height: '100%', width: localSaved > 0 ? '8%' : '0%', background: 'linear-gradient(90deg, var(--clay-hover) 0%, var(--clay) 100%)', borderRadius: '4px', transition: 'width 1s ease' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>No goal set yet</p>
            </div>

            {/* Actions: deposit first, then set goal — equal size */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button
                className="btn btn--primary"
                style={{ flex: 1, padding: '11px 12px', height: 'auto', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setShowDepositModal(true)}
              >
                <Plus size={14} /> Deposit
              </button>
              <button
                onClick={onConfigureGoal}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '11px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border-solid)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 700,
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'; (e.currentTarget as HTMLElement).style.color = 'var(--clay)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                <Target size={14} />
                Set Goal
              </button>
            </div>
          </div>
        </section>

        {/* Deposit Modal */}
        {showDepositModal && (
          <DepositModal
            isDepositing={isDepositing}
            showSuccess={showSuccess}
            depositAmount={depositAmount}
            onAmountChange={setDepositAmount}
            onDeposit={handleDeposit}
            onClose={() => setShowDepositModal(false)}
          />
        )}
      </>
    )
  }

  // ── SARAH (ESTABLISHED USER) VIEW ─────────────────────────────────────────
  return (
    <>
      <section className="score-card" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--clay-faint)', filter: 'blur(40px)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'var(--clay-faint)', color: 'var(--clay)', padding: '8px', borderRadius: '10px' }}>
                <Wallet size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Rent Savings</h3>
            </div>
            <div style={{
              fontSize: '11px', fontWeight: 700,
              color: autoSave ? 'var(--clay)' : 'var(--text-muted)',
              background: autoSave ? 'var(--clay-faint)' : 'var(--surface2)',
              padding: '4px 10px', borderRadius: '99px',
              display: 'flex', alignItems: 'center', gap: '5px',
              border: autoSave ? '1px solid rgba(217,119,87,0.15)' : '1px solid var(--border-solid)'
            }}>
              <Zap size={10} fill={autoSave ? 'var(--clay)' : 'none'} strokeWidth={3} />
              {autoSave ? 'AUTO-SAVE' : 'MANUAL'}
            </div>
          </div>

          {/* Amount Saved */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Amount Saved</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{formatCurrency(localSaved, 'NGN')}</h2>
              <span style={{ fontSize: '12px', color: 'var(--clay)', fontWeight: 700, display: 'flex', alignItems: 'center', background: 'var(--clay-faint)', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(217,119,87,0.15)' }}>
                <TrendingUp size={12} style={{ marginRight: '4px' }} />
                +12.5%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                Goal: <span style={{ color: 'var(--text)' }}>{formatCurrency(savingsGoal, 'NGN')}</span>
              </span>
              <span style={{ fontWeight: 800, color: 'var(--clay)' }}>{Math.round(percentage)}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-solid)' }}>
              <div style={{
                height: '100%', width: `${percentage}%`,
                background: 'linear-gradient(90deg, var(--clay-hover) 0%, var(--clay) 100%)',
                borderRadius: '4px',
                transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 10px var(--clay-glow)'
              }} />
            </div>
            {savingsGoal > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                <Calendar size={11} color="var(--clay)" />
                Next rent due in 5 months
              </p>
            )}
          </div>

          {/* Actions: Deposit + Edit settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn--primary"
              style={{ flex: 1, padding: '11px', height: 'auto', borderRadius: '12px', fontSize: '14px' }}
              onClick={() => setShowDepositModal(true)}
            >
              <Plus size={15} /> Deposit
            </button>
            <button
              onClick={() => router.push('/dashboard/planner')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '11px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border-solid)',
                borderRadius: '12px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '12px', fontWeight: 600,
                fontFamily: 'var(--font)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'; (e.currentTarget as HTMLElement).style.color = 'var(--clay)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >
              <Settings size={13} />
              Edit settings
            </button>
          </div>
        </div>
      </section>

      {showDepositModal && (
        <DepositModal
          isDepositing={isDepositing}
          showSuccess={showSuccess}
          depositAmount={depositAmount}
          onAmountChange={setDepositAmount}
          onDeposit={handleDeposit}
          onClose={() => setShowDepositModal(false)}
        />
      )}
    </>
  )
}

// ─── Shared Deposit Modal ─────────────────────────────────────────────────────
function DepositModal({
  isDepositing,
  showSuccess,
  depositAmount,
  onAmountChange,
  onDeposit,
  onClose,
}: {
  isDepositing: boolean
  showSuccess: boolean
  depositAmount: string
  onAmountChange: (v: string) => void
  onDeposit: () => void
  onClose: () => void
}) {
  const presets = [10000, 25000, 50000, 100000]
  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => !isDepositing && onClose()}>
      <div className="modal-card" style={{ maxWidth: '400px', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} onClick={e => e.stopPropagation()}>
        {!showSuccess ? (
          <>
            <div className="modal-card__header">
              <div>
                <span className="modal-card__badge">Rent Savings</span>
                <h3 className="modal-card__title">Add to Wallet</h3>
              </div>
              <button className="modal-card__close" onClick={onClose} disabled={isDepositing}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-card__body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Funds are locked in your Upward Rent Wallet and applied automatically when rent is due.
              </p>

              {/* Quick presets */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {presets.map(p => (
                  <button
                    key={p}
                    onClick={() => onAmountChange(String(p))}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font)',
                      border: `1px solid ${depositAmount === String(p) ? 'var(--clay)' : 'var(--border-solid)'}`,
                      background: depositAmount === String(p) ? 'var(--clay-faint)' : 'var(--surface)',
                      color: depositAmount === String(p) ? 'var(--clay)' : 'var(--text-secondary)',
                    }}
                  >
                    ₦{p.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Amount (NGN)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={e => onAmountChange(e.target.value)}
                    disabled={isDepositing}
                    style={{
                      width: '100%', padding: '16px 16px 16px 36px',
                      background: 'var(--surface)', border: '1px solid var(--border-solid)',
                      borderRadius: '12px', fontSize: '18px', fontWeight: 700,
                      outline: 'none', color: 'var(--text)'
                    }}
                  />
                </div>
              </div>

              <button
                className={`btn btn--primary btn--full ${isDepositing ? 'loading' : ''}`}
                onClick={onDeposit}
                disabled={isDepositing || !depositAmount || Number(depositAmount) < 100}
              >
                {isDepositing ? 'Processing...' : `Deposit ₦${depositAmount ? Number(depositAmount).toLocaleString() : ''}`}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Deposit Successful!</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Your Discipline Score just improved.</p>
          </div>
        )}
      </div>
    </div>
  )
}