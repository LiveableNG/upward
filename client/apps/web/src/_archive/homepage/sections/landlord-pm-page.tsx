'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Building2,
  X,
  CreditCard,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createPortal } from 'react-dom'

// Authentic Upward Logo SVG for branding consistency
function UpwardLogo({
  size = 36,
  color = '#166534',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="7" y="15" width="10" height="17" rx="5" fill={color} />
      <rect x="23" y="15" width="10" height="17" rx="5" fill={color} />
      <path
        d="M12 30 Q12 37 20 37 Q28 37 28 30"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        points="7,19 20,8 33,19"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="5" r="3" fill="#22c55e" />
    </svg>
  )
}

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactFormData = z.infer<typeof contactSchema>

export function LandlordPmPage({
  onBack,
  onOpenSignup: _onOpenSignup,
}: {
  onBack: () => void
  onOpenSignup: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [splashFade, setSplashFade] = useState(false)

  // Contact Form Modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const handlePmRedirect = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setShowSplash(true)
    setSplashFade(false)

    // Wait 2.2 seconds for full effect, then redirect
    setTimeout(() => {
      window.location.href = path

      // Fade out splash gracefully
      setSplashFade(true)
      setTimeout(() => {
        setShowSplash(false)
      }, 400)
    }, 2200)
  }

  const handleContactSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/public/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          type: 'OTHER',
          message: data.message,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit question')
      }

      setSubmittedEmail(data.email)
      setIsSuccess(true)
      reset()
    } catch (err) {
      console.error('Error submitting contact question:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Prevent scroll when splash overlay or contact modal is active
  useEffect(() => {
    if (showSplash || isContactModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSplash, isContactModalOpen])

  return (
    <div className="pm-page-container">
      {/* Background glow */}
      <div className="pm-page-container__glow" />

      {/* Back button */}
      <button onClick={onBack} className="pm-page-back-btn">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#166534"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </button>

      {/* Hero layout */}
      <div className="pm-page-grid">
        {/* Left: Copy & Features */}
        <div className="pm-page-info">
          <div className="pm-page-badge">
            <ShieldCheck size={14} />
            <span>Executive Landlord Suite</span>
          </div>

          <h1 className="pm-page-title">Automate Rent splits & ledgers.</h1>
          <p className="pm-page-subtitle">
            Professional, automated occupancy ledgers and rent reconciliation dashboard. Onboard
            tenants, manage payment requests, and track property performance in one premium
            dashboard designed for modern property managers.
          </p>

          {/* Pillars List */}
          <div className="pm-pillars">
            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <Building2 size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Portfolio & Asset Management</h3>
                <p>
                  Bulk import properties, add multi-unit buildings, assign landlords, and manage
                  rent rates in one dashboard.
                </p>
              </div>
            </div>

            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <CreditCard size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Invoicing & Collection Automation</h3>
                <p>
                  Share secure digital payment requests, copy pay links, send automated email/SMS
                  reminders, and log offline payments.
                </p>
              </div>
            </div>

            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <TrendingUp size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Automated Payouts & Settlement</h3>
                <p>
                  Disburse collected rent automatically to configured bank accounts and track
                  payouts with detailed settlement history.
                </p>
              </div>
            </div>

            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <ShieldCheck size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Custom Domain & Branding</h3>
                <p>
                  Setup custom email sending domains, verify domains, upload letterheads, and
                  configure digital signature templates.
                </p>
              </div>
            </div>

            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <Users size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Team Workspaces & Roles</h3>
                <p>
                  Invite team members and configure granular access controls to assign properties
                  and collaborate.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="pm-cta-group">
            <button
              onClick={(e) => handlePmRedirect(e, '/pm-login')}
              className="pm-cta-btn pm-cta-btn--primary"
            >
              <span>Access Landlord & PM Suite</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={(e) => handlePmRedirect(e, '/pm-signup')}
              className="pm-cta-btn pm-cta-btn--secondary"
            >
              Contact Sales / Setup Demo
            </button>
          </div>

          <p className="pm-questions-text">
            Have questions about the PM suite?{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsContactModalOpen(true)
              }}
              className="pm-questions-btn"
            >
              Ask our team
            </button>
          </p>
        </div>

        {/* Right: Mockup Display */}
        <div className="pm-page-visual">
          <div className="pm-visual-container">
            {/* Landlord Signup Underlay */}
            <img
              src="/attachments/landlord-signup.png"
              alt="Upward Landlord Onboarding"
              className="pm-img pm-img--underlay"
            />
            {/* PM Dashboard Foreground */}
            <img
              src="/attachments/pm-dashboard.png"
              alt="Upward PM Dashboard"
              className="pm-img pm-img--foreground"
            />
          </div>
        </div>
      </div>

      {/* Redirection banner back to Tenant */}
      <div className="pm-renter-banner">
        <div className="pm-renter-banner__content">
          <span>Are you a tenant or renter? Discover benefits designed for you.</span>
          <button onClick={onBack} className="pm-renter-banner__btn">
            <span>Learn About Upward Pay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ================= FORM MODAL COLLECTING INQUIRIES ================= */}
      {/* Render modal via React Portal to avoid parent transform/overflow clipping */}
      {isContactModalOpen &&
        mounted &&
        createPortal(
          <div className="contact-modal-overlay">
            <div className="contact-modal">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsContactModalOpen(false)
                  setIsSuccess(false)
                  reset()
                }}
                className="contact-modal__close"
              >
                <X size={20} />
              </button>

              {!isSuccess ? (
                <form onSubmit={handleSubmit(handleContactSubmit)} className="contact-form">
                  <h3 className="contact-form__title">Have a Question?</h3>
                  <p className="contact-form__subtitle">
                    Ask us anything about the Upward PM suite, and our team will get back to you
                    shortly.
                  </p>

                  <div className="contact-form__group">
                    <label htmlFor="contact-name">Full Name *</label>
                    <input
                      id="contact-name"
                      type="text"
                      {...register('name')}
                      placeholder="Enter your name"
                    />
                    {errors.name && (
                      <span className="contact-form__error">{errors.name.message}</span>
                    )}
                  </div>

                  <div className="contact-form__group">
                    <label htmlFor="contact-email">Email Address *</label>
                    <input
                      id="contact-email"
                      type="email"
                      {...register('email')}
                      placeholder="e.g. name@company.com"
                    />
                    {errors.email && (
                      <span className="contact-form__error">{errors.email.message}</span>
                    )}
                  </div>

                  <div className="contact-form__group">
                    <label htmlFor="contact-message">Your Message / Question *</label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      {...register('message')}
                      placeholder="Ask your question here..."
                    />
                    {errors.message && (
                      <span className="contact-form__error">{errors.message.message}</span>
                    )}
                  </div>

                  <button type="submit" disabled={isSubmitting} className="contact-form__submit">
                    {isSubmitting ? (
                      <div className="spinner" />
                    ) : (
                      <>
                        <span>Submit Question</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="contact-success">
                  <div className="contact-success__icon-wrapper">
                    <CheckCircle2 size={48} className="contact-success__icon" />
                  </div>
                  <h3 className="contact-success__title">Question Sent Successfully!</h3>
                  <p className="contact-success__desc">
                    Thank you for reaching out. A representative from our property management team
                    will contact you at <strong>{submittedEmail}</strong> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsContactModalOpen(false)
                      setIsSuccess(false)
                    }}
                    className="contact-success__btn"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* ================= FULL-SCREEN REDIRECT SPLASH OVERLAY ================= */}
      {showSplash && (
        <div className={`showcase-splash ${splashFade ? 'showcase-splash--fadeout' : ''}`}>
          <div className="showcase-splash__glow" />
          <div className="showcase-splash__glow showcase-splash__glow--green" />

          <div className="showcase-splash__box">
            <div className="showcase-splash__logo-container">
              <div className="showcase-splash__pulse showcase-splash__pulse--1" />
              <div className="showcase-splash__pulse showcase-splash__pulse--2" />
              <div className="showcase-splash__logo-bg">
                <UpwardLogo size={56} color="#fcfbf7" />
              </div>
            </div>

            <h3 className="showcase-splash__title">UPWARD PM</h3>
            <p className="showcase-splash__subtitle">Entering Property Manager Portal</p>

            <div className="showcase-splash__loader-bar">
              <div className="showcase-splash__loader-progress" />
            </div>

            <div className="showcase-splash__message-box">
              <ShieldCheck size={14} className="showcase-splash__message-icon" />
              <span>Direct Secure Connection Activated</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pm-page-container {
          min-height: 100vh;
          padding: 90px 20px 60px;
          max-width: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .pm-page-container__glow {
          position: absolute;
          top: 10%;
          right: 5%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(22, 101, 52, 0.08) 0%, transparent 70%);
          filter: blur(100px);
          z-index: -1;
        }

        .pm-page-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 40px;
          padding: 12px 20px;
          border-radius: 100px;
          transition: all 0.3s ease;
        }

        .pm-page-back-btn:hover {
          transform: translateX(-4px);
          background: rgba(22, 101, 52, 0.05);
          border-color: rgba(22, 101, 52, 0.2);
        }

        /* Grid */
        .pm-page-grid {
          display: grid;
          grid-template-columns: 50% 50%;
          gap: 60px;
          align-items: center;
          margin-bottom: 80px;
        }

        .pm-page-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          animation: fadeUp 0.8s ease backwards;
        }

        .pm-page-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          color: #166534;
          margin-bottom: 24px;
        }

        .theme--dark .pm-page-badge {
          color: #22c55e;
        }

        .pm-page-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          line-height: 1.1;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #0c2310 0%, #166534 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 24px;
        }

        .theme--dark .pm-page-title {
          background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pm-page-subtitle {
          font-size: 16px;
          color: var(--muted);
          line-height: 1.7;
          margin-bottom: 40px;
        }

        /* Pillars */
        .pm-pillars {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-bottom: 40px;
          width: 100%;
        }

        .pm-pillar {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .pm-pillar__icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #166534;
          flex-shrink: 0;
        }

        .theme--dark .pm-pillar__icon-wrapper {
          color: #22c55e;
        }

        .pm-pillar__text h3 {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: 16px;
          color: var(--text);
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }

        .pm-pillar__text p {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
        }

        /* CTA buttons */
        .pm-cta-group {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
        }

        .pm-cta-btn {
          padding: 16px 28px;
          border-radius: 100px;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 13.5px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pm-cta-btn--primary {
          background: #166534;
          color: #ffffff;
          border: none;
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pm-cta-btn--primary:hover {
          background: #0f4c24;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(22, 101, 52, 0.35);
        }

        .pm-cta-btn--secondary {
          background: var(--bg);
          color: #166534;
          border: 1.5px solid rgba(22, 101, 52, 0.3);
          box-shadow: none;
        }

        .theme--dark .pm-cta-btn--secondary {
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3);
        }

        .pm-cta-btn--secondary:hover {
          background: rgba(22, 101, 52, 0.04);
          transform: translateY(-2px);
        }

        /* Mockup visuals */
        .pm-page-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 480px;
        }

        .pm-visual-container {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: 460px;
        }

        .pm-img {
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          position: absolute;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid var(--border);
        }

        .pm-img--foreground {
          z-index: 2;
          left: 5%;
          top: 15%;
          width: 72%;
        }

        .pm-img--underlay {
          z-index: 1;
          right: 5%;
          bottom: 10%;
          width: 68%;
          opacity: 0.85;
          transform: rotate(3deg);
        }

        .pm-page-visual:hover .pm-img--foreground {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
        }

        .pm-page-visual:hover .pm-img--underlay {
          transform: rotate(6deg) translate(8px, 8px);
          opacity: 0.95;
        }

        /* Redirection banner */
        .pm-renter-banner {
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          border-radius: 20px;
          padding: 24px 32px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
        }

        .pm-renter-banner__content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .pm-renter-banner__content span {
          font-size: 14.5px;
          color: var(--text);
          font-weight: 500;
        }

        .pm-renter-banner__btn {
          padding: 12px 24px;
          border-radius: 100px;
          background: #ffffff !important;
          color: var(--accent) !important;
          border: 1.5px solid var(--accent) !important;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 15px rgba(217, 119, 87, 0.1);
          transition: all 0.3s ease;
        }

        .pm-renter-banner__btn:hover {
          background: rgba(217, 119, 87, 0.05) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(217, 119, 87, 0.18);
        }

        .pm-questions-text {
          margin-top: 24px;
          font-size: 14.5px;
          color: var(--muted);
          font-weight: 500;
        }

        .pm-questions-btn {
          background: none;
          border: none;
          color: #166534;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 14.5px;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }

        .theme--dark .pm-questions-btn {
          color: #22c55e;
        }

        .pm-questions-btn:hover {
          color: #0f4c24;
        }

        .theme--dark .pm-questions-btn:hover {
          color: #4ade80;
        }

        .contact-form__error {
          font-size: 12px;
          color: #ff4444;
          margin-top: 4px;
          font-weight: 500;
        }

        /* Splash Overlay */
        .showcase-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #07150a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: splashFadeIn 0.4s ease both;
        }

        .showcase-splash--fadeout {
          animation: splashFadeOut 0.4s ease both !important;
        }

        .showcase-splash__glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%);
          filter: blur(100px);
          top: -150px;
          left: -150px;
          pointer-events: none;
        }

        .showcase-splash__glow--green {
          background: radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%);
          bottom: -150px;
          right: -150px;
        }

        .showcase-splash__box {
          text-align: center;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
        }

        .showcase-splash__logo-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
        }

        .showcase-splash__logo-bg {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          background: rgba(34, 197, 94, 0.15);
          border: 1.5px solid rgba(34, 197, 94, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(34, 197, 94, 0.3);
        }

        .showcase-splash__pulse {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #22c55e;
          opacity: 0;
          z-index: 1;
        }

        .showcase-splash__pulse--1 {
          animation: beam 2s infinite ease-out;
        }

        .showcase-splash__pulse--2 {
          animation: beam 2s infinite ease-out 1s;
        }

        .showcase-splash__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 24px;
          color: #fcfbf7;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .showcase-splash__subtitle {
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 300;
          color: rgba(252, 251, 247, 0.6);
          letter-spacing: 0.05em;
          margin-bottom: 32px;
        }

        .showcase-splash__loader-bar {
          width: 240px;
          height: 4px;
          background: rgba(252, 251, 247, 0.1);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .showcase-splash__loader-progress {
          width: 100%;
          height: 100%;
          background: #22c55e;
          border-radius: 10px;
          transform: translateX(-100%);
          animation: splashLoad 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .showcase-splash__message-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
          color: #22c55e;
          letter-spacing: 0.02em;
        }

        /* Inquiry Modal Styling */
        .contact-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 10, 0.7);
          backdrop-filter: blur(12px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .contact-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          width: 100%;
          max-width: 520px;
          padding: 40px;
          position: relative;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .contact-modal__close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .contact-modal__close:hover {
          background: #166534;
          color: #ffffff;
          border-color: #166534;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .contact-form__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 24px;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .contact-form__subtitle {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .contact-form__group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .contact-form__group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.02em;
        }

        .contact-form__group input,
        .contact-form__group textarea,
        .contact-form__group-sub input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface2);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 14px;
          transition: all 0.2s;
        }

        .contact-form__group input:focus,
        .contact-form__group textarea:focus,
        .contact-form__group-sub input:focus {
          outline: none;
          border-color: #166534;
          background: var(--bg);
          box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.08);
        }

        .contact-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .contact-form__group-sub {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .contact-form__group-sub label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.02em;
        }

        .contact-form__submit {
          width: 100%;
          padding: 16px;
          border-radius: 100px;
          background: #166534;
          color: #ffffff;
          border: none;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.05em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.15);
          transition: all 0.3s;
          margin-top: 10px;
        }

        .contact-form__submit:hover {
          background: #0f4c24;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(22, 101, 52, 0.25);
        }

        .contact-form__submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        /* Success Card */
        .contact-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px 10px;
        }

        .contact-success__icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .contact-success__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 22px;
          color: var(--text);
          margin-bottom: 12px;
        }

        .contact-success__desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 32px;
          max-width: 380px;
        }

        .contact-success__btn {
          padding: 14px 40px;
          border-radius: 100px;
          background: #166534;
          color: #ffffff;
          border: none;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .contact-success__btn:hover {
          background: #0f4c24;
          transform: translateY(-1px);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes beam {
          0% { transform: scale(0.9); opacity: 0.45; }
          100% { transform: scale(2.8); opacity: 0; }
        }

        @keyframes splashLoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }

        @keyframes splashFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes splashFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Responsive */
        @media (max-width: 992px) {
          .pm-page-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .pm-page-visual {
            height: 380px;
          }
          .pm-renter-banner__content {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .pm-renter-banner__btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .pm-page-container {
            padding: 90px 20px 40px !important;
          }
          .pm-page-back-btn {
            margin-bottom: 24px;
          }
          .pm-cta-group {
            flex-direction: column;
          }
          .pm-cta-btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
          .contact-form__row {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .contact-modal {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  )
}
