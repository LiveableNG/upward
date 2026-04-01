'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Wallet, Zap, Clock, ShieldCheck, Target, 
  ChevronRight, Info, Check, Sparkles, Calendar,
  TrendingUp, Lock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PlannerPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Model Data
  const [goalAmount, setGoalAmount] = useState(45000000) // 450k goal
  const [months, setMonths] = useState(12)
  const [autoDeduct, setAutoDeduct] = useState(true)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [saved, setSaved] = useState(12500000) // 125k saved

  const monthlyTarget = (goalAmount - saved) / months
  const weeklyTarget = monthlyTarget / 4
  const dailyTarget = monthlyTarget / 30

  const calculatePlan = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setStep(4)
  }

  return (
    <div className="dashboard dashboard--nav-offset planner-page">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => step > 1 ? setStep(step - 1) : router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Savings Planner</h2>
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Rent Savings Planner</h1>
          <p className="dashboard__desktop-subtitle">Configure your automated savings path to ensure your next rent is never a stress.</p>
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          
          {step === 1 && (
            <section className="planner-step animate-fadeIn">
              <div className="planner-step__header" style={{ marginBottom: '32px' }}>
                <div className="planner-step__icon" style={{ background: 'var(--clay-faint)', color: 'var(--clay)', padding: '12px', borderRadius: '12px', width: 'fit-content', marginBottom: '16px' }}>
                  <Target size={24} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Step 1: Define Your Goal</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>How much do you need for your next rent or housing milestone?</p>
              </div>

              <div className="planner-form">
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Target Rent Amount (NGN)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                    <input 
                      type="number" 
                      value={goalAmount / 100} 
                      onChange={e => setGoalAmount(Number(e.target.value) * 100)}
                      style={{ width: '100%', padding: '16px 16px 16px 36px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: '12px', fontSize: '18px', fontWeight: 700, outline: 'none', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '32px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Timeline (Months)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                     {[3, 6, 12, 24].map(m => (
                       <button 
                        key={m}
                        onClick={() => setMonths(m)}
                        style={{ padding: '14px', borderRadius: '12px', border: '1px solid', borderColor: months === m ? 'var(--clay)' : 'var(--border-solid)', background: months === m ? 'var(--clay-faint)' : 'var(--bg)', color: months === m ? 'var(--clay)' : 'var(--text)', fontWeight: 700, transition: 'all 0.2s', cursor: 'pointer' }}
                       >
                         {m}m
                       </button>
                     ))}
                  </div>
                </div>
                
                <button className="btn btn--primary btn--full btn--lg" onClick={() => setStep(2)}>
                  Continue to Strategy <ChevronRight size={18} />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="planner-step animate-fadeIn">
              <div className="planner-step__header" style={{ marginBottom: '32px' }}>
                <div className="planner-step__icon" style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px', borderRadius: '12px', width: 'fit-content', marginBottom: '16px' }}>
                  <Clock size={24} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Step 2: Select Frequency</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>How often would you like to set aside funds?</p>
              </div>

              <div className="strategy-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                 <div 
                   className={`strategy-card ${frequency === 'daily' ? 'active' : ''}`}
                   style={{ padding: '20px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid', borderColor: frequency === 'daily' ? 'var(--clay)' : 'var(--border-solid)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                   onClick={() => setFrequency('daily')}
                 >
                    <div>
                       <h4 style={{ margin: 0, fontWeight: 700 }}>Daily Micro-savings</h4>
                       <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Steady, bite-sized contributions</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <span style={{ fontWeight: 800, color: 'var(--clay)' }}>{formatCurrency(dailyTarget, 'NGN')}</span>
                       <p style={{ margin: 0, fontSize: '10px' }}>per day</p>
                    </div>
                 </div>

                 <div 
                   className={`strategy-card ${frequency === 'weekly' ? 'active' : ''}`}
                   style={{ padding: '20px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid', borderColor: frequency === 'weekly' ? 'var(--clay)' : 'var(--border-solid)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                   onClick={() => setFrequency('weekly')}
                 >
                    <div>
                       <h4 style={{ margin: 0, fontWeight: 700 }}>Weekly Batch</h4>
                       <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Perfect for consistent earners</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <span style={{ fontWeight: 800, color: 'var(--clay)' }}>{formatCurrency(weeklyTarget, 'NGN')}</span>
                       <p style={{ margin: 0, fontSize: '10px' }}>per week</p>
                    </div>
                 </div>

                 <div 
                   className={`strategy-card ${frequency === 'monthly' ? 'active' : ''}`}
                   style={{ padding: '20px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid', borderColor: frequency === 'monthly' ? 'var(--clay)' : 'var(--border-solid)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                   onClick={() => setFrequency('monthly')}
                 >
                    <div>
                       <h4 style={{ margin: 0, fontWeight: 700 }}>Monthly Bulk</h4>
                       <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Single monthly deduction after payday</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <span style={{ fontWeight: 800, color: 'var(--clay)' }}>{formatCurrency(monthlyTarget, 'NGN')}</span>
                       <p style={{ margin: 0, fontSize: '10px' }}>per month</p>
                    </div>
                 </div>
              </div>

              <button className="btn btn--primary btn--full btn--lg" onClick={() => setStep(3)}>
                Configure Automation <ChevronRight size={18} />
              </button>
            </section>
          )}

          {step === 3 && (
            <section className="planner-step animate-fadeIn">
              <div className="planner-step__header" style={{ marginBottom: '32px' }}>
                <div className="planner-step__icon" style={{ background: 'var(--clay-faint)', color: 'var(--clay)', padding: '12px', borderRadius: '12px', width: 'fit-content', marginBottom: '16px' }}>
                  <Zap size={24} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Step 3: Enable Automation</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Automate your savings to maximize your Rent Credibility Score.</p>
              </div>

              <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-solid)', marginBottom: '32px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                       <h4 style={{ margin: 0, fontWeight: 700 }}>Auto-Deduction</h4>
                       <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Automatically pull from my primary account</p>
                    </div>
                    <div 
                      onClick={() => setAutoDeduct(!autoDeduct)}
                      style={{ width: '56px', height: '30px', background: autoDeduct ? 'var(--success)' : 'var(--border-solid)', borderRadius: '15px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                      <div style={{ position: 'absolute', top: '3px', left: autoDeduct ? '28px' : '3px', width: '24px', height: '24px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    </div>
                 </div>

                 <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Frequency:</span>
                       <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>{frequency}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount:</span>
                       <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clay)' }}>{formatCurrency(frequency === 'daily' ? dailyTarget : frequency === 'weekly' ? weeklyTarget : monthlyTarget, 'NGN')}</span>
                    </div>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'var(--clay-faint)', borderRadius: '16px', marginBottom: '32px', alignItems: 'flex-start' }}>
                 <Info size={16} color="var(--clay)" style={{ flexShrink: 0, marginTop: '2px' }} />
                 <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                   Automation users are <strong>5x more likely</strong> to reach their rent goals and gain an average of <strong>+82 credibility points</strong> within 6 months.
                 </p>
              </div>

              <button 
                className={`btn btn--primary btn--full btn--lg ${loading ? 'loading' : ''}`}
                onClick={calculatePlan}
                disabled={loading}
              >
                {loading ? 'Finalizing Plan...' : 'Finalize & Activate Plan'}
              </button>
            </section>
          )}

          {step === 4 && (
            <section className="planner-step animate-fadeIn">
               <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'successPop 0.5s' }}>
                    <Check size={40} />
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 800 }}>Planner Activated!</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>You're officially on the path to stress-free housing.</p>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-solid)' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>Plan Overview</p>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <div>
                           <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Rent</span>
                           <p style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{formatCurrency(goalAmount, 'NGN')}</p>
                        </div>
                        <div>
                           <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthy Saving</span>
                           <p style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: 'var(--success)' }}>{formatCurrency(monthlyTarget, 'NGN')}</p>
                        </div>
                        <div>
                           <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Timeline</span>
                           <p style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{months} Months</p>
                        </div>
                        <div>
                           <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Credibility Predictor</span>
                           <p style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: 'var(--clay)' }}>+82 pts</p>
                        </div>
                     </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'var(--clay-faint)', padding: '10px', borderRadius: '10px' }}>
                           <ShieldCheck size={20} color="var(--clay)" />
                        </div>
                        <div>
                           <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Auto-Deduct: {frequency}</p>
                           <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Next deduction: Monday, 6 AM</p>
                        </div>
                     </div>
                     <Check size={18} color="var(--success)" />
                  </div>
               </div>

               <button className="btn btn--primary btn--full" onClick={() => router.push('/dashboard')}>
                 Back to Dashboard
               </button>
            </section>
          )}

        </div>

        <div className="dashboard__col--right dashboard__col--desktop-only">
           <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-solid)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                 <Sparkles size={20} color="var(--warning)" />
                 <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Planner Insights</h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                Automating your rent savings is the #1 way to build trust with future landlords and secure better properties.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Check size={18} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>0% Late Fee Risk</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <TrendingUp size={18} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Score Multiplier ACTIVE</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Lock size={18} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Secure Vault Protection</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
