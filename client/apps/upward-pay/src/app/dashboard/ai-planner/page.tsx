'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Home, TrendingUp, Sparkles, Plus, 
  Trash2, Wallet, Zap, Clock, ShieldCheck, Target, 
  ChevronRight, Info, AlertTriangle, Lightbulb, Crown, Check
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type GoalHome = {
  id: string
  type: string
  location: string
  duration: number // Years
}

type SaverMode = 'normalsaver' | 'aggreivesaver' | 'notimesaver'

export default function AIPlannerPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Inputs
  const [currentHome, setCurrentHome] = useState({ type: '1-Bedroom', location: 'Yaba', rent: 800000 })
  const [nextHomes, setNextHomes] = useState<GoalHome[]>([
    { id: '1', type: '2-Bedroom', location: 'Victoria Island', duration: 5 }
  ])
  const [ultimateGoal, setUltimateGoal] = useState({ years: 7, type: 'Own Home' })
  const [incomeRange, setIncomeRange] = useState('500k-1M')
  const [saverMode, setSaverMode] = useState<SaverMode>('normalsaver')

  function addNextHome() {
    setNextHomes([...nextHomes, { id: Math.random().toString(), type: '3-Bedroom', location: 'Lekki', duration: 3 }])
  }

  function removeNextHome(id: string) {
    setNextHomes(nextHomes.filter(h => h.id !== id))
  }

  async function calculateAI() {
    setLoading(true)
    // Artificial delay for "AI simulation"
    await new Promise(r => setTimeout(r, 2500))

    // Mock AI Logic
    const inflation = 0.12 // 12% property inflation in Lagos
    const basePrices: Record<string, number> = { 'Yaba': 1200000, 'Victoria Island': 4500000, 'Lekki': 3500000, 'Own Home': 45000000 }
    
    const futurePrices = nextHomes.map((h, i) => {
      const yearOffset = nextHomes.slice(0, i + 1).reduce((acc: number, curr) => acc + curr.duration, 0)
      return {
        ...h,
        predictedPrice: basePrices[h.location] ? basePrices[h.location] * Math.pow(1 + inflation, yearOffset) : 1500000 * Math.pow(1 + inflation, yearOffset)
      }
    })

    const ultimatePrice = basePrices['Own Home'] * Math.pow(1 + inflation, ultimateGoal.years)
    
    // Suggestion logic
    let suggestion = ""
    if (currentHome.location === 'Yaba') {
      suggestion = "Moving to Surulere or Maryland could increase your savings rate by 15% due to lower average utility costs in those clusters."
    } else {
      suggestion = "Consider a co-living arrangement in your next move to drastically shorten your timeline to home ownership by 2.5 years."
    }

    setResult({
      futurePrices,
      ultimatePrice,
      totalYears: ultimateGoal.years,
      monthlySavingsTarget: saverMode === 'aggreivesaver' ? 150000 : 80000,
      suggestion
    })
    setLoading(false)
    setStep(4)
  }

  return (
    <div className="dashboard dashboard--nav-offset ai-planner">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => step > 1 ? setStep(step - 1) : router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">AI Housing Planner</h2>
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Housing Path Planner</h1>
          <p className="dashboard__desktop-subtitle">Simulate your path from current rent to home ownership with AI-driven insights.</p>
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          
          {step === 1 && (
            <section className="planner-step animate-fadeIn">
              <div className="planner-step__header">
                <div className="planner-step__icon"><Home size={24} color="var(--clay)" /></div>
                <h3>Current Housing Baseline</h3>
                <p>Establishing your baseline helps our AI calculate your current housing budget.</p>
              </div>

              <div className="planner-form">
                <div className="form-group">
                  <label>Current Home Type</label>
                  <select value={currentHome.type} onChange={e => setCurrentHome({...currentHome, type: e.target.value})}>
                    <option>Mini Flat</option>
                    <option>1-Bedroom</option>
                    <option>2-Bedroom</option>
                    <option>Self-Contain</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={currentHome.location} onChange={e => setCurrentHome({...currentHome, location: e.target.value})} placeholder="e.g. Yaba, Lagos" />
                </div>
                <div className="form-group">
                  <label>Monthly Rent (NGN)</label>
                  <input type="number" value={currentHome.rent} onChange={e => setCurrentHome({...currentHome, rent: Number(e.target.value)})} />
                </div>
                
                <button className="btn btn--primary btn--full" style={{ marginTop: 12 }} onClick={() => setStep(2)}>
                  Next Step <ChevronRight size={18} />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="planner-step animate-fadeIn">
              <div className="planner-step__header">
                <div className="planner-step__icon"><Target size={24} color="var(--clay)" /></div>
                <h3>Your Housing Milestones</h3>
                <p>Define your progression goals. You can add multiple transitions before your final home.</p>
              </div>

              <div className="goal-list">
                {nextHomes.map((home, index) => (
                  <div key={home.id} className="goal-card">
                    <div className="goal-card__header">
                      <span className="goal-badge">Next Home #{index + 1}</span>
                      <button className="goal-remove" onClick={() => removeNextHome(home.id)}><Trash2 size={16} /></button>
                    </div>
                    <div className="planner-form">
                      <div className="form-group">
                        <label>Home Type</label>
                        <select value={home.type} onChange={e => {
                          const newHomes = [...nextHomes];
                          newHomes[index].type = e.target.value;
                          setNextHomes(newHomes);
                        }}>
                          <option>2-Bedroom</option>
                          <option>3-Bedroom</option>
                          <option>Duplex</option>
                          <option>Penthouse</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Desired Location</label>
                        <input type="text" value={home.location} onChange={e => {
                           const newHomes = [...nextHomes];
                           newHomes[index].location = e.target.value;
                           setNextHomes(newHomes);
                        }} />
                      </div>
                      <div className="form-group">
                        <label>Planned Duration (Years)</label>
                        <input type="number" value={home.duration} onChange={e => {
                           const newHomes = [...nextHomes];
                           newHomes[index].duration = Number(e.target.value);
                           setNextHomes(newHomes);
                        }} />
                      </div>
                    </div>
                  </div>
                ))}

                <button className="btn btn--ghost btn--full" style={{ border: '1px dashed var(--border)', marginBottom: 24, padding: 16 }} onClick={addNextHome}>
                  <Plus size={18} /> Add Another Next Home
                </button>

                <div className="ultimate-goal-card">
                   <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217, 119, 87, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Crown size={18} color="var(--clay)" />
                      </div>
                      <h4 style={{ margin: 0 }}>Ultimate Goal: Home Ownership</h4>
                   </div>
                   <div className="planner-form">
                      <div className="form-group">
                        <label>Target Timeline (Years from now)</label>
                        <input type="number" value={ultimateGoal.years} onChange={e => setUltimateGoal({...ultimateGoal, years: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                <div style={{ padding: '0 4px', marginBottom: 24 }}>
                   <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                     Our AI will predict and inflation-adjust the prices for {nextHomes.length + 1} milestones.
                   </p>
                </div>

                <button className="btn btn--primary btn--full" onClick={() => setStep(3)}>
                  Set Capacity & Mode <ChevronRight size={18} />
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="planner-step animate-fadeIn">
              <div className="planner-step__header">
                <div className="planner-step__icon"><Wallet size={24} color="var(--clay)" /></div>
                <h3>Lifestyle & Capacity</h3>
                <p>Final inputs to determine the feasibility of your housing timeline.</p>
              </div>

              <div className="planner-form">
                <div className="form-group">
                  <label>Current Monthly Income Range (NGN)</label>
                  <select value={incomeRange} onChange={e => setIncomeRange(e.target.value)}>
                    <option>Under 200k</option>
                    <option>200k - 500k</option>
                    <option>500k - 1M</option>
                    <option>1M - 2.5M</option>
                    <option>Above 2.5M</option>
                  </select>
                </div>

                <div className="saver-modes">
                   <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Choose Saving Strategy</label>
                   <div className="saver-mode-grid">
                      <div className={`saver-mode-card ${saverMode === 'normalsaver' ? 'active' : ''}`} onClick={() => setSaverMode('normalsaver')}>
                         <Clock size={20} />
                         <span>Normal Saver</span>
                      </div>
                      <div className={`saver-mode-card ${saverMode === 'aggreivesaver' ? 'active' : ''}`} onClick={() => setSaverMode('aggreivesaver')}>
                         <Zap size={20} />
                         <span>Aggressive</span>
                      </div>
                      <div className={`saver-mode-card ${saverMode === 'notimesaver' ? 'active' : ''}`} onClick={() => setSaverMode('notimesaver')}>
                         <TrendingUp size={20} />
                         <span>No Time</span>
                      </div>
                   </div>
                </div>

                {loading ? (
                   <div className="ai-calculating">
                      <div className="ai-calculating__spinner">
                         <Sparkles size={40} className="pulse" />
                      </div>
                      <p>AI Predicting Property Inflation in {nextHomes[0]?.location}...</p>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Comparing market trends 2020-2026</span>
                   </div>
                ) : (
                  <button className="btn btn--primary btn--full btn--lg" style={{ marginTop: 24 }} onClick={calculateAI}>
                    Generate Predictions <Sparkles size={18} style={{ marginLeft: 8 }} />
                  </button>
                )}
              </div>
            </section>
          )}

          {step === 4 && result && (
            <section className="planner-step planner-results animate-fadeIn">
              <div className="results-hero">
                <div className="results-hero__icon" style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                   <Crown size={40} color="var(--success)" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>The Path to Your Own Home</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Based on your <strong>{saverMode.replace('saver','')}</strong> strategy, here is your path.</p>
              </div>

              <div className="timeline-journey">
                <div className="journey-node journey-node--current">
                   <div className="node-marker" />
                   <div className="node-content">
                      <div className="node-date">Year 0 (Current)</div>
                      <div className="node-title">{currentHome.type} in {currentHome.location}</div>
                      <div className="node-cost">{formatCurrency(currentHome.rent, 'NGN')} / monthly</div>
                   </div>
                </div>

                {result.futurePrices.map((p: any, i: number) => (
                  <div key={i} className="journey-node journey-node--future">
                    <div className="node-marker" />
                    <div className="node-content">
                       <div className="node-date">Year {p.duration + result.futurePrices.slice(0, i).reduce((acc: number, curr: any) => acc + curr.duration, 0)}</div>
                       <div className="node-title">{p.type} in {p.location}</div>
                       <div className="node-meta">Predicted Price: {formatCurrency(p.predictedPrice, 'NGN')}</div>
                    </div>
                  </div>
                ))}

                <div className="journey-node journey-node--ultimate">
                   <div className="node-marker" />
                   <div className="node-content">
                      <div className="node-date">Year {result.totalYears} Achievement</div>
                      <div className="node-title">Move into My Home</div>
                      <div className="node-meta">Predicted Value: {formatCurrency(result.ultimatePrice, 'NGN')}</div>
                      <div className="node-status">Timeline Likelihood: <span style={{ color: 'var(--success)' }}>High</span></div>
                   </div>
                </div>
              </div>

              <div className="ai-suggestion-card" style={{ marginTop: 32, background: 'rgba(217, 119, 87, 0.05)', border: '1px solid rgba(217, 119, 87, 0.1)', padding: 20, borderRadius: 16 }}>
                 <div className="ai-suggestion-card__header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Lightbulb size={20} color="var(--warning)" />
                    <h4 style={{ margin: 0, fontSize: 16 }}>AI Optimization Suggestion</h4>
                 </div>
                 <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{result.suggestion}</p>
                 <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Target Savings:</span>
                   <strong style={{ fontSize: 16, color: 'var(--clay)' }}>{formatCurrency(result.monthlySavingsTarget, 'NGN')} / mo</strong>
                 </div>
              </div>

              <button className="btn btn--secondary btn--full" onClick={() => setStep(1)} style={{ marginTop: 32 }}>
                Recalculate with different parameters
              </button>
            </section>
          )}

        </div>

        <div className="dashboard__col--right dashboard__col--desktop-only">
           <div className="dashboard__card preview-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                 <ShieldCheck size={20} color="var(--success)" />
                 <h3 style={{ fontSize: 18, margin: 0 }}>Smart Predictions</h3>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20 }}>
                Our AI uses historical pricing data from 2018-2026 across Lagos and Abuja to project future rent and purchase costs.
              </p>
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    <span>Property Infl. Avg:</span>
                    <span>12% / year</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    <span>Prediction Confidence:</span>
                    <span style={{ color: 'var(--success)' }}>High (92%)</span>
                 </div>
              </div>
           </div>

           <section className="dashboard__section" style={{ marginTop: 24 }}>
              <div className="dashboard__card" style={{ background: 'var(--clay-faint)', border: '1px solid rgba(217, 119, 87, 0.1)' }}>
                 <h4 style={{ color: 'var(--clay)', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Pro Optimization Plan</h4>
                 <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
                   Choosing an <strong>Aggressive Saver</strong> mode assumes you will automate 40% of your income into an high-interest yield account.
                 </p>
              </div>
           </section>
        </div>
      </div>
    </div>
  )
}
