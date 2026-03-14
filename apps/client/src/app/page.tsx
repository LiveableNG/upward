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
  const [view, setView] = useState<'home' | 'why'>('home')

  const openSignup = (email?: string) => {
    if (email) setPrefilledEmail(email)
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
          background: 'radial-gradient(circle, rgba(217, 119, 87, 0.15) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle, rgba(250, 249, 245, 0.08) 0%, transparent 70%)',
          bottom: '-100px',
          left: '-200px',
        }}
      />

      <Header onSetView={setView} currentView={view} />

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
                <HeroSection onOpenSignup={(e) => openSignup(e)} />
              </div>
              <div className="split-benefits">
                <BenefitsGrid onOpenSignup={(e) => openSignup(e)} />
              </div>
            </div>

            <div className="divider" />

            <AmbassadorSection onOpenSignup={() => openSignup()} />

            <div className="divider" />

            <TellAFriend />

            <PartnersBar />
          </div>

          {/* Why Upward View */}
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

      <Footer onSetView={setView} />

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
              <SignupForm initialEmail={prefilledEmail} />
            </div>
          </div>
        </div>
      )}

      <div
        id="toast"
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          background: 'var(--surface)',
          border: '1px solid rgba(217, 119, 87, 0.4)',
          borderRadius: '12px',
          padding: '16px 24px',
          zIndex: 9999,
          fontSize: '14px',
          color: 'var(--text)',
          transform: 'translateY(80px)',
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
        @media (max-width: 768px) {
          .modal-header-padding {
            padding: 40px 24px 20px !important;
          }
          .toast-mobile {
            bottom: 20px !important;
            right: 20px !important;
            left: 20px !important;
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}
