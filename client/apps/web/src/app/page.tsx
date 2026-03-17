'use client'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { BenefitsGrid } from '@/components/sections/benefits-grid'
import { WhyUpwardPage } from '@/components/sections/why-upward-page'
import { TellAFriend } from '@/components/sections/tell-a-friend'
import { PartnersBar } from '@/components/sections/partners-bar'
import { SignupForm } from '@/components/sections/signup-form'
import { AmbassadorSection } from '@/components/sections/ambassador-section'

export default function HomePage() {
  const [showModal, setShowModal] = useState(false)
  const [prefilledEmail, setPrefilledEmail] = useState('')
  const [prefilledStep, setPrefilledStep] = useState(1)
  const [view, setView] = useState<'home' | 'why'>('home')

  const openSignup = (email?: string, step: number = 1) => {
    if (email) setPrefilledEmail(email)
    setPrefilledStep(step)
    setShowModal(true)
  }

  useEffect(() => {
    if (showModal) document.body.classList.add('no-scroll')
    else document.body.classList.remove('no-scroll')
  }, [showModal])

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // Handle deep-linking from other pages (like /legal/...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    if (viewParam === 'why') setView('why')
    if (viewParam === 'home') setView('home')

    // Handle signup modal deep-link
    if (params.get('signup') === 'true') {
      setShowModal(true)
    }

    // Handle section scrolling
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 80
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 500)
    }
  }, [])

  return (
    <>
      <div
        style={{
          position: 'fixed',
          borderRadius: '50%',
          filter: 'blur(160px)',
          pointerEvents: 'none',
          zIndex: 0,
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)',
          top: '-300px',
          right: '-200px',
        }}
      />
      <div
        style={{
          position: 'fixed',
          borderRadius: '50%',
          filter: 'blur(140px)',
          pointerEvents: 'none',
          zIndex: 0,
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)',
          bottom: '-100px',
          left: '-200px',
        }}
      />

      <Header onSetView={setView} currentView={view} onOpenSignup={() => openSignup()} />

      <main style={{ position: 'relative', zIndex: 1, overflowX: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: '200%',
            transition: 'transform 0.6s cubic-bezier(0.85, 0, 0.15, 1)',
            transform: view === 'home' ? 'translateX(0)' : 'translateX(-50%)',
            alignItems: 'flex-start',
          }}
        >
          {/* Home View */}
          <div
            style={{
              width: '50%',
              flexShrink: 0,
              height: view === 'home' ? 'auto' : '0',
              overflow: 'hidden',
              visibility: view === 'home' ? 'visible' : 'hidden',
            }}
          >
            <div className="split-layout">
              <div className="split-hero">
                <HeroSection onOpenSignup={(e, s) => openSignup(e, s)} />
              </div>
              <div className="split-benefits">
                <BenefitsGrid onOpenSignup={(e, s) => openSignup(e, s)} />
              </div>
            </div>

            <div className="divider" />

            <AmbassadorSection onOpenSignup={() => openSignup()} />

            <div className="divider" />

            <TellAFriend />

            <PartnersBar />
          </div>

          {/* Why Upward? View */}
          <div
            style={{
              width: '50%',
              flexShrink: 0,
              height: view === 'why' ? 'auto' : '0',
              overflow: 'hidden',
              visibility: view === 'why' ? 'visible' : 'hidden',
            }}
          >
            <WhyUpwardPage onBack={() => setView('home')} onOpenSignup={() => openSignup()} />
          </div>
        </div>
      </main>

      <Footer onSetView={setView} onOpenSignup={() => openSignup()} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div style={{ padding: '0px' }}>
              <div style={{ padding: '48px 40px 24px' }} className="modal-header-padding">
                <div className="section-label">Priority Access</div>
                <h2
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 800,
                    fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    marginBottom: '12px',
                    marginTop: '16px',
                    background: 'var(--heading-mix)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Join the movement.
                </h2>
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '15px',
                    maxWidth: '440px',
                    lineHeight: 1.6,
                  }}
                >
                  Tell us about yourself and we&apos;ll tailor your experience from day one.
                </p>
              </div>
              <SignupForm initialEmail={prefilledEmail} initialStep={prefilledStep} />
            </div>
          </div>
        </div>
      )}

      <div
        id="toast"
        style={{
          position: 'fixed',
          top: '32px',
          right: '32px',
          background: 'var(--surface)',
          border: '1px solid rgba(217, 119, 87, 0.4)',
          borderRadius: '12px',
          padding: '16px 24px',
          zIndex: 9999,
          fontSize: '14px',
          color: 'var(--text)',
          transform: 'translateY(-80px)',
          opacity: 0,
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
        className="toast-mobile"
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
          }}
        />
        <span id="toast-msg">Copied to clipboard!</span>
      </div>

      <style>{`
        .toast-show {
          transform: translateY(0) !important;
          opacity: 1 !important;
        }
        .toast-error {
          border: 2px solid #ff4444 !important;
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .modal-content::-webkit-scrollbar {
          display: none;
        }
        .modal-content {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 768px) {
          .modal-header-padding {
            padding: 40px 24px 20px !important;
          }
          .toast-mobile {
            top: 20px !important;
            bottom: auto !important;
            right: 20px !important;
            left: 20px !important;
            justify-content: center;
          }
          body.no-scroll {
            position: fixed;
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}
