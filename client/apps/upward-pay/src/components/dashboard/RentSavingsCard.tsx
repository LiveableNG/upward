'use client'

import { useState } from 'react'
import { Wallet, TrendingUp, Calendar, Zap, Info, Plus, X, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function RentSavingsCard() {
  const router = useRouter()
  const [saved, setSaved] = useState(12500000)
  const [goal, setGoal] = useState(45000000)
  const [autoDeduct, setAutoDeduct] = useState(true)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const percentage = Math.min(100, (saved / goal) * 100)

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) return
    setIsDepositing(true)
    await new Promise(r => setTimeout(r, 2000))
    setSaved(s => s + Number(depositAmount) * 100)
    setIsDepositing(false)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setShowDepositModal(false)
      setDepositAmount('')
    }, 2500)
  }

  return (
    <section className="score-card" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--clay-faint)', filter: 'blur(40px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--clay-faint)', color: 'var(--clay)', padding: '8px', borderRadius: '10px' }}>
              <Wallet size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Rent Savings</h3>
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: autoDeduct ? 'var(--clay)' : 'var(--text-muted)',
              background: autoDeduct ? 'var(--clay-faint)' : 'var(--surface2)',
              padding: '4px 12px',
              borderRadius: '99px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: autoDeduct ? '1px solid rgba(217,119,87,0.15)' : '1px solid var(--border-solid)'
            }}
            onClick={() => setAutoDeduct(!autoDeduct)}
            role="button"
          >
            <Zap size={10} fill={autoDeduct ? 'var(--clay)' : 'none'} strokeWidth={3} />
            {autoDeduct ? 'AUTO-SAVE ON' : 'AUTO-SAVE OFF'}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Amount Saved</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{formatCurrency(saved, 'NGN')}</h2>
            <span style={{ fontSize: '12px', color: 'var(--clay)', fontWeight: 700, display: 'flex', alignItems: 'center', background: 'var(--clay-faint)', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(217,119,87,0.15)' }}>
              <TrendingUp size={12} style={{ marginRight: '4px' }} />
              +12.5%
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Rent Goal: <span style={{ color: 'var(--text)' }}>{formatCurrency(goal, 'NGN')}</span></span>
            <span style={{ fontWeight: 800, color: 'var(--clay)' }}>{Math.round(percentage)}%</span>
          </div>
          <div style={{ height: '10px', background: 'var(--surface2)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-solid)' }}>
            <div
              style={{
                height: '100%',
                width: `${percentage}%`,
                background: 'linear-gradient(90deg, var(--clay-hover) 0%, var(--clay) 100%)',
                borderRadius: '5px',
                transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 10px var(--clay-glow)'
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <Calendar size={12} color="var(--clay)" />
            Next payment due in 5 months (Oct 24, 2026)
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            className="btn btn--secondary"
            style={{ padding: '12px', height: 'auto', borderRadius: '12px', fontSize: '14px' }}
            onClick={() => setShowDepositModal(true)}
          >
            <Plus size={16} /> Deposit
          </button>
          <button
            className="btn btn--primary"
            style={{ padding: '12px', height: 'auto', borderRadius: '12px', fontSize: '14px', background: 'var(--text)', color: 'var(--bg)', boxShadow: 'none' }}
            onClick={() => router.push('/dashboard/planner')}
          >
            Planner
          </button>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '14px',
            background: 'var(--clay-faint)',
            borderRadius: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            border: '1px dashed rgba(217, 119, 87, 0.2)'
          }}
        >
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border-solid)', borderRadius: '50%', padding: '4px', flexShrink: 0 }}>
            <Info size={12} color="var(--clay)" />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>
            Pro Tip: Automated savings towards your rent increases your <strong>Discipline Score</strong> by <span style={{ color: 'var(--clay)', fontWeight: 700 }}>+45 points</span>.
          </p>
        </div>

        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Recent Activity</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={14} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>Auto-Deduction</p>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mar 25, 2026</p>
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--clay)' }}>+₦50,000</span>
          </div>
        </div>
      </div>

      {showDepositModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => !isDepositing && setShowDepositModal(false)}>
          <div className="modal-card" style={{ maxWidth: '400px', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} onClick={e => e.stopPropagation()}>
            {!showSuccess ? (
              <>
                <div className="modal-card__header">
                  <div>
                    <span className="modal-card__badge">Deposit Funds</span>
                    <h3 className="modal-card__title">Save for Next Rent</h3>
                  </div>
                  <button className="modal-card__close" onClick={() => setShowDepositModal(false)} disabled={isDepositing}>
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-card__body">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Funds will be locked in your Upward Rent Wallet and automatically applied when your next rent is due.
                  </p>

                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Amount to Save (NGN)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        disabled={isDepositing}
                        style={{
                          width: '100%',
                          padding: '16px 16px 16px 36px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border-solid)',
                          borderRadius: '12px',
                          fontSize: '18px',
                          fontWeight: 700,
                          outline: 'none',
                          color: 'var(--text)'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    className={`btn btn--primary btn--full ${isDepositing ? 'loading' : ''}`}
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount}
                  >
                    {isDepositing ? 'Processing...' : `Deposit ${depositAmount ? '₦' + Number(depositAmount).toLocaleString() : ''}`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Deposit Successful!</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>You just boosted your Discipline Score.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}