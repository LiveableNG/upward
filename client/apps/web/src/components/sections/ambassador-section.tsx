'use client'
import { useState, useRef } from 'react'
import { showToast } from '@upward/client-core'
import { SESSIONS } from '@upward/client-shared'

export function AmbassadorSection({ onOpenSignup: _onOpenSignup }: { onOpenSignup: () => void }) {
  const [email, setEmail] = useState('')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const sessions = SESSIONS.map((s) => {
    const now = new Date()
    const sDate = new Date(s.date)
    const diff = sDate.getTime() - now.getTime()

    let status = 'Register'
    let isLive = false
    let isEnded = false

    if (diff < -7200000) {
      // 2 hours past
      status = 'Ended'
      isEnded = true
    } else if (diff < 3600000 && diff > -3600000) {
      // 1 hour window
      status = '● Live'
      isLive = true
    }

    return {
      id: s.label,
      title:
        s.id.includes('tue') || s.id.includes('thu')
          ? 'Learn More & Ask Questions (Join on your way back from work)'
          : 'Information Session',
      info: `${s.display} WAT`,
      status,
      isLive,
      isEnded,
      date: sDate,
    }
  })

  const loadExistingData = async (emailToFetch: string) => {
    if (!emailToFetch || !emailToFetch.includes('@')) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/${emailToFetch}`)
      if (!res.ok) return

      const { data } = await res.json()
      if (data) {
        if (data.selectedSession && data.selectedSession !== 'NONE') {
          setSelectedSession(data.selectedSession)
        }
      }
    } catch (err) {
      console.error('Failed to load existing data', err)
    }
  }

  const syncData = async (sessionOverride?: string) => {
    if (!email || !email.includes('@')) return

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          selectedSession: sessionOverride || selectedSession || undefined,
          wantsAmbassador: true,
        }),
      })
    } catch (err) {
      console.error('Background sync failed', err)
    }
  }

  const handleJoinLive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', true)
      return
    }

    if (!selectedSession) {
      showToast('Please select a session from the list.', true)
      setIsInteracting(true)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          selectedSession: selectedSession,
          wantsAmbassador: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to join')

      setIsSuccess(true)
      setIsInteracting(false)
      showToast('Session booked successfully!')
    } catch {
      showToast('Something went wrong. Please try again.', true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionClick = (sessionId: string) => {
    setSelectedSession((prev) => {
      const newVal = prev === sessionId ? null : sessionId
      if (email && email.includes('@')) {
        syncData(newVal || undefined)
      }
      return newVal
    })
    setIsInteracting(true)
    setTimeout(() => {
      emailInputRef.current?.focus()
    }, 100)
  }

  return (
    <section
      id="ambassador"
      style={{ padding: '80px 40px', position: 'relative', zIndex: 10 }}
      className="container-padding"
    >
      {/* Interaction Overlay */}
      {isInteracting && (
        <div
          onClick={() => setIsInteracting(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 900,
            animation: 'fadeIn 0.2s ease-out',
          }}
        />
      )}

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          background: isInteracting ? 'var(--surface2)' : 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '64px',
          display: 'grid',
          gridTemplateAreas: isSuccess ? '"info sessions"' : '"info sessions" "form sessions"',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
          gap: '48px 64px',
          alignItems: 'start',
          position: 'relative',
          zIndex: isInteracting ? 1000 : 1,
          transform: isInteracting ? 'scale(1.02)' : 'scale(1)',
          transition:
            'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.4s ease, box-shadow 0.4s ease',
          boxShadow: isInteracting ? '0 40px 100px rgba(0,0,0,0.5)' : 'none',
          willChange: 'transform, box-shadow',
        }}
        className="grid-stack-mobile ambassador-card"
      >
        <div style={{ gridArea: 'info' }}>
          <div className="section-label" style={{ marginBottom: '16px' }}>
            Learn More
          </div>

          {isSuccess ? (
            <div style={{ animation: 'fadeUp 0.5s ease both' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'var(--accent-faint)',
                  border: '1px solid var(--accent-muted)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.04em',
                  marginBottom: '16px',
                }}
              >
                Session Booked!
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--muted)',
                  lineHeight: 1.7,
                  marginBottom: '32px',
                  maxWidth: '430px',
                }}
              >
                We've added you to the {sessions.find((s) => s.id === selectedSession)?.title}{' '}
                session. We will reach out to you with further details soon.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setEmail('')
                  setSelectedSession(null)
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Book another session
              </button>
            </div>
          ) : (
            <>
              <h2
                style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.04em',
                  marginBottom: '16px',
                }}
              >
                Want to be part of something bigger?
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--muted)',
                  lineHeight: 1.7,
                }}
              >
                Join one of our live information sessions to learn how Upward works, ask questions,
                and explore how you can become a community ambassador and earn rewards.
              </p>
            </>
          )}
        </div>

        {!isSuccess && (
          <div style={{ gridArea: 'form' }}>
            <form
              onSubmit={handleJoinLive}
              style={{
                display: 'flex',
                gap: '12px',
                maxWidth: '500px',
                position: 'relative',
                padding: isInteracting ? '12px' : '0',
                background: isInteracting ? 'rgba(217, 119, 87, 0.05)' : 'transparent',
                borderRadius: '16px',
                transition: 'all 0.3s',
              }}
              className="stack-mobile"
            >
              <div style={{ flex: 1.5, position: 'relative' }}>
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsInteracting(true)}
                  onBlur={() => {
                    loadExistingData(email)
                    syncData()
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--surface2)',
                    border: `1px solid ${isInteracting && !email ? 'var(--accent)' : 'var(--border)'}`,
                    color: 'var(--text)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
                {isInteracting && !email && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-25px',
                      left: '5px',
                      fontSize: '11px',
                      color: 'var(--accent)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Enter email to join session
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  color: 'var(--btn-text)',
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '14px',
                  letterSpacing: '0.05em',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#bf5f43'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--accent)'
                  e.currentTarget.style.transform = ''
                }}
              >
                {isLoading ? 'Joining...' : 'Join Session'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>

            <div style={{ minHeight: '30px', marginTop: '12px' }}>
              {isInteracting && !selectedSession && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    animation: 'pulse 2s infinite',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span className="mobile-hide">←</span>
                  Please select a session <span className="mobile-hide">on the right</span>
                  <span className="desktop-hide">above</span> to continue
                </p>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            gridArea: 'sessions',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
          }}
        >
          {sessions.map(({ id, title, info, status, isLive, isEnded }) => {
            const isSelected = selectedSession === id
            return (
              <div
                key={id}
                onClick={() => !isEnded && handleSessionClick(id)}
                style={{
                  background: isSelected ? 'var(--accent-faint)' : 'var(--surface2)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: isEnded ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  transform: isSelected ? 'translateX(8px)' : 'none',
                  opacity: isEnded ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(217, 119, 87, 0.4)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = ''
                  }
                }}
              >
                <div style={{ paddingRight: '12px' }}>
                  <h5
                    style={{
                      fontFamily: 'var(--font-head)',
                      fontWeight: 700,
                      fontSize: '15px',
                      marginBottom: '6px',
                      color: isSelected ? 'var(--accent)' : 'inherit',
                    }}
                  >
                    {title}
                  </h5>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{info}</p>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase' as const,
                    padding: '6px 12px',
                    borderRadius: '100px',
                    flexShrink: 0,
                    background: isLive
                      ? 'rgba(123,245,196,0.1)'
                      : isSelected
                        ? 'var(--accent)'
                        : isEnded
                          ? 'rgba(0,0,0,0.1)'
                          : 'rgba(217, 119, 87, 0.1)',
                    color: isLive
                      ? '#7bf5c4'
                      : isSelected
                        ? 'var(--btn-text)'
                        : isEnded
                          ? '#999'
                          : 'var(--accent)',
                    border: `1px solid ${
                      isLive
                        ? 'rgba(123,245,196,0.2)'
                        : isEnded
                          ? 'transparent'
                          : 'rgba(217, 119, 87, 0.2)'
                    }`,
                    fontWeight: 700,
                  }}
                >
                  {isLive ? '● Live' : isSelected ? 'Selected' : status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          .desktop-hide { display: none; }
          @media (max-width: 768px) {
              .desktop-hide { display: inline; }
              .ambassador-card {
                  padding: 40px 24px !important;
                  text-align: center;
                  grid-template-areas: "info" "sessions" "form" !important;
                  grid-template-columns: 1fr !important;
                  gap: 32px !important;
              }
              .ambassador-card button {
                  width: 100%;
              }
              .stack-mobile {
                  flex-direction: column !important;
              }
          }
      `}</style>
    </section>
  )
}
