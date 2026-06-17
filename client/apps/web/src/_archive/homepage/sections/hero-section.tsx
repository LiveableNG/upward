'use client'
import { ShieldCheck, Play, Award } from 'lucide-react'

export function HeroSection({
  onOpenSignup,
  onExplorePm: _onExplorePm,
  variant: _variant = 'A',
}: {
  onOpenSignup: (email?: string) => void
  onExplorePm?: () => void
  variant?: 'A' | 'B'
}) {
  return (
    <section id="hero" className="hero-revamp">
      <div className="hero-revamp__container">
        <div className="hero-revamp__content">
          <div className="hero-revamp__badge">
            <span className="hero-revamp__badge-dot animate-pulse"></span>
            Nigeria's First Housing Reputation Score
          </div>
          <h1 className="hero-revamp__title">
            Finally, your rent <br /> pays off for{' '}
            <span className="hero-revamp__title-italic">you.</span>
          </h1>
          <p className="hero-revamp__desc">
            Join 5,000+ professionals building their Rent Passport™. We verify your payments and
            property care to unlock rent discounts, low-deposit moves, and ultimately home
            financing.
          </p>

          <div className="hero-revamp__actions">
            <button onClick={() => onOpenSignup()} className="hero-revamp__btn-primary">
              Start Building Your Score
            </button>
            <button
              onClick={() => {
                const el =
                  document.getElementById('interactive-score') ||
                  document.getElementById('growth-simulator')
                if (el) {
                  const navHeight = 80
                  const top = el.getBoundingClientRect().top + window.pageYOffset - navHeight
                  window.scrollTo({ top, behavior: 'smooth' })
                }
              }}
              className="hero-revamp__btn-secondary"
            >
              <div className="hero-revamp__play-icon">
                <Play size={16} fill="currentColor" />
              </div>
              See how it works
            </button>
          </div>

          <div className="hero-revamp__stats">
            <div className="hero-revamp__stat">
              <span className="hero-revamp__stat-number">15.4k</span>
              <span className="hero-revamp__stat-label">Active Renters</span>
            </div>
            <div className="hero-revamp__stat-divider" />
            <div className="hero-revamp__stat">
              <span className="hero-revamp__stat-number">₦2.4B+</span>
              <span className="hero-revamp__stat-label">Rent Verified</span>
            </div>
            <div className="hero-revamp__stat-divider" />
            <div className="hero-revamp__stat">
              <span className="hero-revamp__stat-number">890</span>
              <span className="hero-revamp__stat-label">Avg. Rep Score</span>
            </div>
          </div>
        </div>

        <div className="hero-revamp__visual">
          <div className="hero-revamp__img-wrapper">
            <img
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_b08d7d8cfa_010c6202f5ab90bc.png"
              alt="portrait of a successful young Nigerian professional woman sitting in a high-end minimalist Lagos apartment"
              className="hero-revamp__img"
            />
          </div>

          {/* Floating Badge 1 */}
          <div className="hero-revamp__badge-float hero-revamp__badge-float--left animate-float-slow">
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
            <span>Identity Verified</span>
          </div>

          {/* Floating Badge 2 */}
          <div className="hero-revamp__badge-float hero-revamp__badge-float--right animate-float-fast">
            <Award size={18} style={{ color: 'var(--accent)' }} />
            <span>Score: 842 (Top 5%)</span>
          </div>
        </div>
      </div>

      <style>{`
        .hero-revamp {
          position: relative;
          z-index: 1;
          background: var(--bg);
          padding: 140px 40px 100px;
          overflow: hidden;
        }

        .hero-revamp__container {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 55% 45%;
          gap: 60px;
          align-items: center;
        }

        .hero-revamp__content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 36px;
        }

        .hero-revamp__badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          border-radius: 100px;
          color: var(--accent);
          font-family: var(--font-head);
          font-size: var(--font-xs);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .hero-revamp__badge-dot {
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
        }

        .hero-revamp__title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h1);
          line-height: 1.1;
          letter-spacing: -0.04em;
          color: var(--text);
        }

        .hero-revamp__title-italic {
          color: var(--accent);
          font-style: italic;
        }

        .hero-revamp__desc {
          font-family: var(--font-body);
          font-size: clamp(15px, 1.4vw, 19px);
          color: var(--muted);
          line-height: 1.6;
          max-width: 600px;
        }

        .hero-revamp__actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .hero-revamp__btn-primary {
          background: var(--accent);
          color: #ffffff;
          font-family: var(--font-head);
          font-weight: 600;
          font-size: var(--font-base);
          padding: 18px 36px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px rgba(217, 119, 87, 0.25);
        }

        .hero-revamp__btn-primary:hover {
          transform: translateY(-2px);
          background: var(--swatch--clay-interactive);
          box-shadow: 0 15px 35px rgba(217, 119, 87, 0.35);
        }

        .hero-revamp__btn-secondary {
          background: none;
          border: none;
          color: var(--text);
          font-family: var(--font-head);
          font-weight: 600;
          font-size: var(--font-base);
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: color 0.3s;
        }

        .hero-revamp__btn-secondary:hover {
          color: var(--accent);
        }

        .hero-revamp__play-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          transition: all 0.3s;
        }

        .hero-revamp__btn-secondary:hover .hero-revamp__play-icon {
          background: var(--accent);
          color: #ffffff;
          border-color: var(--accent);
        }

        .hero-revamp__stats {
          display: flex;
          align-items: center;
          gap: 32px;
          width: 100%;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        .hero-revamp__stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .hero-revamp__stat-number {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 24px;
          color: var(--text);
        }

        .hero-revamp__stat-label {
          font-family: var(--font-body);
          font-size: var(--font-xs);
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hero-revamp__stat-divider {
          width: 1px;
          height: 40px;
          background: var(--border);
        }

        .hero-revamp__visual {
          position: relative;
          width: 100%;
        }

        .hero-revamp__img-wrapper {
          position: relative;
          width: 100%;
          height: 580px;
          border-radius: 36px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border: 1px solid var(--border);
        }

        .hero-revamp__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-revamp__badge-float {
          position: absolute;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 100px;
          padding: 8px 16px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: var(--font-xs);
          color: var(--text);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hero-revamp__badge-float:hover {
          transform: translateY(-5px) scale(1.03) !important;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.25);
        }

        .hero-revamp__badge-float--left {
          left: -20px;
          top: 80px;
        }

        .hero-revamp__badge-float--right {
          right: 20px;
          bottom: 120px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .animate-float-slow {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: float 5s ease-in-out infinite 1.5s;
        }

        @media (max-width: 1024px) {
          .hero-revamp__container {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .hero-revamp__img-wrapper {
            height: 480px;
          }

          .hero-revamp__badge-float--left {
            left: 12px;
            top: 40px;
          }

          .hero-revamp__badge-float--right {
            right: 12px;
            bottom: 40px;
          }
        }

        @media (max-width: 768px) {
          .hero-revamp {
            padding: 120px 20px 60px;
          }

          .hero-revamp__content {
            align-items: center;
            text-align: center;
          }

          .hero-revamp__actions {
            flex-direction: column;
            width: 100%;
            gap: 16px;
          }

          .hero-revamp__btn-primary {
            width: 100%;
          }

          .hero-revamp__stats {
            justify-content: center;
          }

          .hero-revamp__img-wrapper {
            height: 380px;
          }

          .hero-revamp__badge-float {
            padding: 6px 12px;
            gap: 6px;
            font-size: 11px;
          }
          
          .hero-revamp__badge-float svg {
            width: 14px;
            height: 14px;
          }

          .hero-revamp__badge-float--left {
            left: 10px;
            top: 30px;
          }

          .hero-revamp__badge-float--right {
            right: 10px;
            bottom: 30px;
          }
        }
      `}</style>
    </section>
  )
}
