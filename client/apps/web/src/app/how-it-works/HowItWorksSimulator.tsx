'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Building,
  CreditCard,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  Check
} from 'lucide-react'

export interface StepItem {
  id: number
  numLabel: string
  title: string
  description: string
  supporting: string
}

export const WALKTHROUGH_STEPS: StepItem[] = [
  {
    id: 1,
    numLabel: '01 / 06',
    title: 'Sign Up & Add Rental Details',
    description:
      'Enter your rent amount, property details, and your landlord or property manager\'s standard bank details. Upward instantly validates their bank name and account before continuing.',
    supporting: 'Account number verified in real time before you pay.'
  },
  {
    id: 2,
    numLabel: '02 / 06',
    title: 'Tap Pay Rent on Dashboard',
    description:
      'View your upcoming rent, select your property, and initiate payment.',
    supporting: 'Zero hidden processing fees. 100% transparent invoice.'
  },
  {
    id: 3,
    numLabel: '03 / 06',
    title: 'Choose How to Pay',
    description:
      'Select between Instant Bank Transfer or Online Card Payment.',
    supporting: 'Processed through secure interbank payment switches.'
  },
  {
    id: 4,
    numLabel: '04 / 06',
    title: 'Make Frictionless Payment',
    description:
      'Complete the transfer using your chosen secure payment channel.',
    supporting: 'Automated 256-bit encrypted settlement confirmation.'
  },
  {
    id: 5,
    numLabel: '05 / 06',
    title: 'Get Your Official Receipt',
    description:
      'Instantly receive a verifiable, tamper-proof digital proof of payment.',
    supporting: 'Legally recognized receipt showing your landlord as receiver.'
  },
  {
    id: 6,
    numLabel: '06 / 06',
    title: 'Landlord Receives Funds & Score Boost',
    description:
      'Your landlord gets paid with your name in narration, plus you earn credit points.',
    supporting: 'Landlord needs no app. Funds settle directly to their bank account.'
  }
]

export function HowItWorksSimulator() {
  const [activeStep, setActiveStep] = useState<number>(1)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isInView, setIsInView] = useState<boolean>(false)
  const [stepResetKey, setStepResetKey] = useState<number>(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const STEP_DURATION = 3600 // 3.6 seconds: lively, real-time pace inspired by Chowdeck
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isIntersectingRef = useRef<boolean>(false)

  // IntersectionObserver: starts loop when in view, resets cleanly to step 1 when scrolled away
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsInView(true)
      isIntersectingRef.current = true
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry) return
        const visible = Boolean(entry.isIntersecting)

        if (visible && !isIntersectingRef.current) {
          isIntersectingRef.current = true
          setIsInView(true)
          setStepResetKey((k) => k + 1)
        } else if (!visible && isIntersectingRef.current) {
          // Scrolled away: stop timer and silently reset to Step 1 without mid-flight transitions
          isIntersectingRef.current = false
          setIsInView(false)
          setActiveStep(1)
        }
      },
      {
        threshold: 0.1, // Trigger as soon as 10% is visible
        rootMargin: '40px 0px 40px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Real-time loop: ticks every 3.6s continuously while in view and playing
  useEffect(() => {
    if (!isPlaying || !isInView) return

    const timer = setInterval(() => {
      setActiveStep((curr) => (curr % 6) + 1)
      setStepResetKey((k) => k + 1)
    }, STEP_DURATION)

    return () => clearInterval(timer)
  }, [isPlaying, isInView, stepResetKey])

  // Manual navigation handlers
  const handleSelectStep = (stepId: number) => {
    setActiveStep(stepId)
    setStepResetKey((k) => k + 1)
  }

  const handleNext = () => {
    setActiveStep((curr) => (curr % 6) + 1)
    setStepResetKey((k) => k + 1)
  }

  const handlePrev = () => {
    setActiveStep((curr) => (curr === 1 ? 6 : curr - 1))
    setStepResetKey((k) => k + 1)
  }

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const currentStep: StepItem = (WALKTHROUGH_STEPS[activeStep - 1] ?? WALKTHROUGH_STEPS[0])!

  return (
    <div className="hiw-story-container" id="interactive-demo" ref={containerRef}>
      <div className="hiw-story-layout">
        {/* ==================================================================
            A. INFORMATION AREA (Left)
            ================================================================== */}
        <div className="hiw-info-area">
          <div className="hiw-section-label">
            <ShieldCheck size={14} />
            <span>Interactive Payment Walkthrough</span>
          </div>

          <h2 className="hiw-info-heading">
            Watch how Upward delivers your rent directly to your landlord while building your score.
          </h2>

          {/* Current Step Description Card */}
          <div className="hiw-active-step-meta" key={currentStep.id}>
            <div className="hiw-step-tracker">
              <span className="hiw-step-num">STAGE {currentStep.numLabel}</span>
              <span className="hiw-step-status-chip">Step {activeStep} of 6</span>
            </div>

            <h3 className="hiw-active-title">{currentStep.title}</h3>
            <p className="hiw-active-desc">{currentStep.description}</p>

            <div className="hiw-supporting-statement">
              <CheckCircle2 size={15} />
              <span>{currentStep.supporting}</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="hiw-nav-suite">
            {/* Six numbered progress indicators with real-time fill bar */}
            <div className="hiw-indicators-row" role="tablist" aria-label="Walkthrough steps">
              {WALKTHROUGH_STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={s.id === activeStep}
                  className={`hiw-indicator-btn ${s.id === activeStep ? 'hiw-indicator-btn--active' : ''}`}
                  onClick={() => handleSelectStep(s.id)}
                  title={s.title}
                >
                  <span className="hiw-indicator-num">{s.id}</span>
                  {s.id === activeStep && (
                    <span
                      key={`prog-${activeStep}-${stepResetKey}`}
                      className={`hiw-indicator-progress ${
                        isPlaying && isInView ? 'hiw-indicator-progress--running' : 'hiw-indicator-progress--paused'
                      }`}
                      style={{ animationDuration: `${STEP_DURATION}ms` }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Previous, Pause/Play, Next controls */}
            <div className="hiw-controls-row">
              <button
                type="button"
                className="hiw-ctrl-button"
                onClick={handlePrev}
                aria-label="Previous step"
              >
                <ArrowLeft size={14} /> Previous
              </button>

              <button
                type="button"
                className={`hiw-ctrl-button ${isPlaying ? 'hiw-ctrl-button--play' : ''}`}
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause tour' : 'Play tour'}
              >
                {isPlaying ? (
                  <>
                    <Pause size={13} /> Pause Tour
                  </>
                ) : (
                  <>
                    <Play size={13} /> Play Tour
                  </>
                )}
              </button>

              <button
                type="button"
                className="hiw-ctrl-button"
                onClick={handleNext}
                aria-label="Next step"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================
            B. ANIMATED VISUAL STAGE (Right)
            Persistent container, transforms between steps
            ================================================================== */}
        <div className="hiw-visual-stage" aria-live="polite">
          <div className="hiw-stage-glow" />

          {/* Step 1 Visual Composition: Floating Rental Information */}
          {activeStep === 1 && (
            <div className="hiw-composition hiw-step1-visual" key="step-1">
              <div className="hiw-card hiw-card-main hiw-stagger-1">
                <div className="hiw-card-header">
                  <span className="hiw-label-tag">Rental Property</span>
                  <span className="hiw-badge-verified">
                    <CheckCircle2 size={11} /> Verified Residence
                  </span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--hiw-ink)' }}>
                  Unit 3B, Palm View Court
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--hiw-ink-soft)', marginTop: '2px' }}>
                  Admiralty Way, Lekki Phase 1, Lagos
                </div>
              </div>

              <div className="hiw-info-grid hiw-stagger-2">
                <div className="hiw-info-cell">
                  <span>Rent Amount</span>
                  <strong>₦2,400,000 / yr</strong>
                </div>
                <div className="hiw-info-cell">
                  <span>Payment Frequency</span>
                  <strong>Annual</strong>
                </div>
              </div>

              <div className="hiw-card hiw-stagger-3" style={{ marginTop: '12px', borderLeft: '3.5px solid var(--hiw-clay)' }}>
                <div className="hiw-card-header">
                  <span className="hiw-label-tag">Landlord Bank Account</span>
                  <span className="hiw-badge-verified hiw-stagger-check">
                    <Check size={11} /> Account Validated
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--hiw-ink)' }}>
                  0123456789 • Guaranty Trust Bank
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--hiw-clay)', fontWeight: 700, marginTop: '2px' }}>
                  Babatunde Adeleke (Name Resolved)
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Visual Composition: Property Dashboard & Pay Rent */}
          {activeStep === 2 && (
            <div className="hiw-composition hiw-step2-visual" key="step-2">
              <div className="hiw-dashboard-banner hiw-stagger-1">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4>Upcoming Rent Payment</h4>
                    <div className="amount">₦2,400,000.00</div>
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(217, 119, 87, 0.12)', color: 'var(--hiw-clay)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    Due in 5 Days
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--hiw-ink-soft)', marginTop: '8px' }}>
                  Unit 3B Palm View Court • Lekki Phase 1
                </div>
              </div>

              <div className="hiw-card hiw-stagger-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--hiw-ink-soft)' }}>Score Boost Available:</span>
                  <span style={{ fontWeight: 800, color: 'var(--hiw-clay)', background: 'var(--hiw-clay-light)', padding: '2px 8px', borderRadius: '6px' }}>
                    +18 Credibility Points
                  </span>
                </div>
              </div>

              <div className="hiw-stagger-3" style={{ marginTop: '4px' }}>
                <button type="button" className="hiw-dashboard-pay-cta">
                  <CreditCard size={16} /> Pay Rent (₦2,400,000)
                </button>
              </div>
            </div>
          )}

          {/* Step 3 Visual Composition: Choose How to Pay */}
          {activeStep === 3 && (
            <div className="hiw-composition hiw-step3-visual" key="step-3">
              <div style={{ marginBottom: '12px' }}>
                <span className="hiw-label-tag">Select Payment Method</span>
              </div>

              <div className="hiw-payment-options">
                {/* Option 1: Instant Bank Transfer (Selected) */}
                <div className="hiw-option-item hiw-option-item--selected hiw-stagger-1">
                  <div className="hiw-option-info">
                    <div className="hiw-option-icon">
                      <Building size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--hiw-ink)' }}>
                        Instant Bank Transfer
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--hiw-ink-soft)', marginTop: '2px' }}>
                        Zero fee interbank transfer from any banking app
                      </div>
                    </div>
                  </div>
                  <div className="hiw-option-radio">
                    <div className="hiw-option-radio-dot" />
                  </div>
                </div>

                {/* Option 2: Card Payment */}
                <div className="hiw-option-item hiw-stagger-2" style={{ opacity: 0.75 }}>
                  <div className="hiw-option-info">
                    <div className="hiw-option-icon" style={{ color: 'var(--hiw-ink-light)' }}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--hiw-ink)' }}>
                        Debit Card / Online
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--hiw-ink-soft)', marginTop: '2px' }}>
                        Mastercard, Visa, Verve with instant 3D-Secure
                      </div>
                    </div>
                  </div>
                  <div className="hiw-option-radio" />
                </div>
              </div>

              <div className="hiw-badge-verified hiw-stagger-3" style={{ marginTop: '14px', alignSelf: 'flex-start' }}>
                <ShieldCheck size={13} />
                <span>Interbank payment rails active</span>
              </div>
            </div>
          )}

          {/* Step 4 Visual Composition: Make Frictionless Payment */}
          {activeStep === 4 && (
            <div className="hiw-composition hiw-step4-visual" key="step-4">
              <div className="hiw-tx-progress-card hiw-stagger-1">
                <span className="hiw-label-tag">Transfer In Progress</span>
                <div className="hiw-tx-amount">₦2,400,000.00</div>
                <div className="hiw-tx-ref">REF: UPW-2026-98124-TX</div>

                <div className="hiw-progress-track">
                  <div className="hiw-progress-fill" />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--hiw-ink-soft)', marginBottom: '14px' }}>
                  Processing automated interbank settlement to landlord account
                </div>

                <div className="hiw-tx-confirm-banner hiw-stagger-check">
                  <CheckCircle2 size={16} />
                  <span>Settlement Confirmed • 256-bit Encrypted</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 Visual Composition: Official Digital Receipt */}
          {activeStep === 5 && (
            <div className="hiw-composition hiw-step5-visual" key="step-5">
              <div className="hiw-receipt-card hiw-stagger-1">
                <div className="hiw-receipt-top">
                  <div className="hiw-receipt-logo">
                    <img src="/favicon.svg" alt="Upward" />
                    <span>UPWARD OFFICIAL RECEIPT</span>
                  </div>
                  <span className="hiw-badge-verified hiw-stagger-check">
                    <CheckCircle2 size={11} /> Settled
                  </span>
                </div>

                <div className="hiw-receipt-meta-grid hiw-stagger-2">
                  <div>
                    <span>Tenant (Payer)</span>
                    <strong>Chidiebere Okonkwo</strong>
                  </div>
                  <div>
                    <span>Receiver (Landlord)</span>
                    <strong>Babatunde Adeleke</strong>
                  </div>
                  <div>
                    <span>Property</span>
                    <strong>Unit 3B Lekki Phase 1</strong>
                  </div>
                  <div>
                    <span>Amount Paid</span>
                    <strong style={{ color: 'var(--hiw-clay)' }}>₦2,400,000.00</strong>
                  </div>
                  <div>
                    <span>Bank Reference</span>
                    <strong>UPW-2026-88192</strong>
                  </div>
                  <div>
                    <span>Date &amp; Time</span>
                    <strong>01 Oct 2026, 10:14 AM</strong>
                  </div>
                </div>

                <div className="hiw-receipt-seal hiw-stagger-3">
                  <span>Tamper-Proof Digital Verification</span>
                  <Receipt size={16} />
                </div>
              </div>
            </div>
          )}

          {/* Step 6 Visual Composition: Landlord Direct Settlement & Score Progression */}
          {activeStep === 6 && (
            <div className="hiw-composition hiw-step6-visual" key="step-6">
              <div className="hiw-step6-outcomes">
                {/* Outcome 1: Landlord Account Credit */}
                <div className="hiw-outcome-card hiw-outcome-landlord hiw-stagger-1">
                  <div className="alert-header">
                    <span>
                      <Smartphone size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Landlord Bank Credit Alert
                    </span>
                    <span>Direct Settlement</span>
                  </div>
                  <div className="alert-body">
                    <strong>GTBank Credit:</strong> Amt: NGN 2,400,000.00 / DESC: RENT UNIT 3B LEKKI, CHIDIEBERE OKONKWO
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--hiw-clay)', fontWeight: 700, marginTop: '4px' }}>
                    ✓ Tenant details and property clearly displayed in bank statement
                  </div>
                </div>

                {/* Outcome 2: Tenant Rent Score Boost */}
                <div className="hiw-outcome-card hiw-outcome-score hiw-stagger-2">
                  <div className="hiw-label-tag">Upward Rent Score Progression</div>
                  <div className="hiw-score-delta-row">
                    <div className="hiw-score-metric">
                      <span>720</span>
                      <span style={{ color: 'var(--hiw-clay)' }}>→ 738</span>
                    </div>
                    <span className="hiw-score-badge-gain hiw-stagger-check">
                      <TrendingUp size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      +18 Points Earned
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--hiw-ink-soft)', marginTop: '6px' }}>
                    Verified Rent Passport updated with on-time payment history
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trust & Comparison Section */}
      <div style={{ marginTop: '70px', paddingTop: '40px', borderTop: '1px solid var(--hiw-sand)' }}>
        <div className="hiw-section-heading">
          <span className="eyebrow">Trust &amp; Value Comparison</span>
          <h2>The same bank transfer reliability. Far superior benefits.</h2>
          <p>
            When you pay rent through Upward, your money travels through standard banking rails to your landlord’s bank account, but with advantages your normal bank app could never give you.
          </p>
        </div>

        <div className="hiw-compare-grid">
          {/* Card 1: Standard Bank App */}
          <div className="hiw-compare-card">
            <h3>
              <Building size={20} color="#94a3b8" /> Standard Bank App Transfer
            </h3>
            <ul className="hiw-compare-list">
              <li className="hiw-compare-item hiw-compare-item--negative">
                <CheckCircle2 size={16} />
                <span>Transfers funds to your landlord</span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--negative">
                <CheckCircle2 size={16} color="#94a3b8" />
                <span>Landlord asks &quot;Who sent this?&quot; due to truncated bank descriptions</span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--negative">
                <CheckCircle2 size={16} color="#94a3b8" />
                <span>You have to screenshot receipt and send manual WhatsApp messages</span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--negative">
                <CheckCircle2 size={16} color="#94a3b8" />
                <span>Zero rental credibility score built for your financial future</span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--negative">
                <CheckCircle2 size={16} color="#94a3b8" />
                <span>Zero rental record or portable history established</span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--negative">
                <CheckCircle2 size={16} color="#94a3b8" />
                <span>Cannot be used to qualify for lower deposits or home mortgages</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Upward Pay */}
          <div className="hiw-compare-card hiw-compare-card--featured">
            <span className="hiw-compare-tag">Recommended for Renters</span>
            <h3>
              <ShieldCheck size={20} color="var(--hiw-clay)" /> Upward Rent Transfer
            </h3>
            <ul className="hiw-compare-list">
              <li className="hiw-compare-item hiw-compare-item--positive">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Direct Bank Settlement:</strong> Landlord receives funds directly in their existing bank account.
                </span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--positive">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Zero Landlord Friction:</strong> Landlord does not need an Upward account or app download.
                </span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--positive">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Smart Narration:</strong> Bank credit alert clearly states your full name and property address.
                </span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--positive">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Official Digital Receipt:</strong> Instant verifiable tamper-proof PDF with one-tap WhatsApp sharing.
                </span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--positive">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Credibility Score Growth:</strong> Every on-time payment boosts your official Upward Credibility Score.
                </span>
              </li>
              <li className="hiw-compare-item hiw-compare-item--positive">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Mortgage Pathways:</strong> Build a verified payment history to qualify for future mortgage options.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="hiw-faq-section" style={{ paddingBottom: '20px' }}>
        <div className="hiw-section-heading" style={{ marginBottom: '32px' }}>
          <span className="eyebrow">Clear Answers</span>
          <h2>Everything you need to know about paying with Upward</h2>
        </div>

        <div className="hiw-faq-list">
          {[
            {
              q: 'Does my landlord or property manager need to be on Upward?',
              a: 'No! Your landlord does not need to register, download any app, or do anything differently. You simply provide their standard Nigerian bank account details (GTBank, Access, Zenith, etc.). The money transfers directly into their bank account just like any interbank transfer.'
            },
            {
              q: 'How will my landlord know the payment came from me?',
              a: 'When Upward processes your transfer, we format the interbank transaction narration to explicitly include your full name and rental unit (for example: "UPWARD RENT: FLAT 4 LEKKI, CHIDIEBERE OKONKWO"). This exact text appears in your landlord’s mobile banking transaction history and credit SMS alert.'
            },
            {
              q: 'How fast does the money reach my landlord?',
              a: 'Transfers settle via licensed Nigerian interbank clearing switches. In virtually all cases, the funds reflect in your landlord’s bank account within seconds of completing payment.'
            },
            {
              q: 'What is the Upward Credibility Score and why does it matter?',
              a: 'Until now, paying millions in rent every year gave you zero credit record. Upward changes that. When you pay rent through Upward on time, our algorithms calculate your verified Credibility Score. This score helps you qualify for lower security deposits, rent financing, and structured mortgages with partner institutions.'
            },
            {
              q: 'Is it completely safe to pay my rent through Upward?',
              a: 'Yes. Upward uses bank-grade 256-bit encryption and partners with licensed payment switches. We never store your card PINs or sensitive banking credentials, and every transaction generates an official, tamper-proof digital receipt.'
            }
          ].map((item, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                className={`hiw-faq-item ${isOpen ? 'hiw-faq-item--open' : ''}`}
              >
                <button
                  type="button"
                  className="hiw-faq-btn"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp size={18} color="var(--hiw-clay)" />
                  ) : (
                    <ChevronDown size={18} color="var(--hiw-ink-light)" />
                  )}
                </button>
                {isOpen && (
                  <div className="hiw-faq-content">
                    <p style={{ margin: 0 }}>{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
