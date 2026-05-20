'use client'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { BenefitsGrid } from '@/components/sections/benefits-grid'
import { WhyUpwardPage } from '@/components/sections/why-upward-page'
import { TellAFriend } from '@/components/sections/tell-a-friend'
import { PartnersBar } from '@/components/sections/partners-bar'
import { FairHousingPage } from '@/components/sections/fair-housing-page'
import { ShowcaseSection } from '@/components/sections/showcase-section'

export default function HomePage() {
  const [view, setView] = useState<'home' | 'why' | 'fairness'>('home')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackInteraction = async (type: string, target: string, metadata?: any) => {
    try {
      let vid = localStorage.getItem('upward_visitor_id')
      if (!vid) {
        vid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        localStorage.setItem('upward_visitor_id', vid)
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: vid,
          type,
          target,
          abVariant: 'A',
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        }),
      })
    } catch (err) {
      console.error('Failed to track interaction', err)
    }
  }

  const openSignup = (email?: string) => {
    trackInteraction('CLICK', 'OPEN_SIGNUP')
    const url = email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'
    window.location.href = url
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // Track page view on navigation
  useEffect(() => {
    trackInteraction('VIEW', `PAGE_${view.toUpperCase()}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Handle deep-linking from other pages (like /legal/...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    if (viewParam === 'why') setView('why')
    if (viewParam === 'home') setView('home')

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

      <Header
        onSetView={setView}
        currentView={view}
        onOpenSignup={() => openSignup()}
        trackInteraction={trackInteraction}
      />

      <main style={{ position: 'relative', zIndex: 1, overflowX: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: '300%',
            transition: 'transform 0.6s cubic-bezier(0.85, 0, 0.15, 1)',
            transform:
              view === 'home'
                ? 'translateX(0)'
                : view === 'why'
                  ? 'translateX(-33.33%)'
                  : 'translateX(-66.66%)',
            alignItems: 'flex-start',
          }}
        >
          {/* Home View */}
          <div
            style={{
              width: '33.33%',
              flexShrink: 0,
              height: view === 'home' ? 'auto' : '0',
              overflow: 'hidden',
              visibility: view === 'home' ? 'visible' : 'hidden',
            }}
          >
            <div className="split-layout">
              <div className="split-hero">
                <HeroSection onOpenSignup={(e) => openSignup(e)} variant="A" />
              </div>
              <div className="split-benefits">
                <BenefitsGrid onOpenSignup={(e) => openSignup(e)} />
              </div>
            </div>

            <div className="divider" />

            <ShowcaseSection />

            <div className="divider" />

            <TellAFriend />

            <PartnersBar />
          </div>

          <div
            style={{
              width: '33.33%',
              flexShrink: 0,
              height: view === 'why' ? 'auto' : '0',
              overflow: 'hidden',
              visibility: view === 'why' ? 'visible' : 'hidden',
            }}
          >
            <WhyUpwardPage onBack={() => setView('home')} onOpenSignup={() => openSignup()} />
          </div>

          {/* Fairness View */}
          <div
            style={{
              width: '33.33%',
              flexShrink: 0,
              height: view === 'fairness' ? 'auto' : '0',
              overflow: 'hidden',
              visibility: view === 'fairness' ? 'visible' : 'hidden',
            }}
          >
            <FairHousingPage onBack={() => setView('home')} />
          </div>
        </div>
      </main>

      <Footer
        onSetView={setView}
        onOpenSignup={() => openSignup()}
        trackInteraction={trackInteraction}
      />

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
          zIndex: 100000,
          fontSize: '14px',
          color: 'var(--text)',
          transform: 'translateY(-80px)',
          opacity: 0,
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
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
          background: var(--surface) !important;
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
            padding: 32px 18px 16px !important;
          }
          .toast-mobile {
            top: 10px !important;
            bottom: auto !important;
            right: 16px !important;
            left: 16px !important;
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
