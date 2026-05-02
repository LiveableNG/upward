'use client'
import { useState, Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

function DeleteUserContent() {
  const [email, setEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !confirmed) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
      const response = await fetch(`${apiUrl}/public/user/request-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit request')
      }

      setStatus('success')
    } catch (err: any) {
      console.error('Deletion request error:', err)
      setErrorMessage(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '48px 40px',
          backgroundColor: 'var(--surface)',
          borderRadius: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
          position: 'relative',
          zIndex: 1,
          animation: 'fadeUp 0.6s ease-out',
        }}
      >
        <div className="section-label" style={{ marginBottom: '24px', display: 'inline-block' }}>
          Privacy Control
        </div>

        {status === 'success' ? (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'rgba(217, 119, 87, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: 'var(--accent)',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '2.2rem',
                marginBottom: '16px',
                background: 'var(--heading-mix)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Request Received.
            </h1>
            <p
              style={{
                color: 'var(--muted)',
                lineHeight: 1.6,
                fontSize: '1rem',
                marginBottom: '32px',
              }}
            >
              We&apos;ve received your request to delete data associated with <strong>{email}</strong>. 
              A confirmation email has been sent to verify your identity before we proceed with the deletion.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                backgroundColor: 'var(--accent)',
                color: 'var(--btn-text)',
                borderRadius: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: '14px',
                fontFamily: 'var(--font-head)',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Return Home
            </a>
          </div>
        ) : (
          <>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '2.2rem',
                marginBottom: '16px',
                background: 'var(--heading-mix)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              Delete Your Data
            </h1>
            <p
              style={{
                color: 'var(--muted)',
                lineHeight: 1.6,
                fontSize: '0.95rem',
                marginBottom: '32px',
              }}
            >
              We value your privacy. If you wish to remove your account and all associated data from our systems, 
              please enter your email address below. This process is permanent.
            </p>

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: '8px',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-faint)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '32px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => setConfirmed(!confirmed)}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: `2px solid ${confirmed ? 'var(--accent)' : 'var(--border)'}`,
                    background: confirmed ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    marginTop: '2px',
                  }}
                >
                  {confirmed && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
                  I understand that this action is <strong>irreversible</strong> and will result in the 
                  permanent deletion of my Rent Passport, history, and all account data.
                </p>
              </div>

              {status === 'error' && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(220, 38, 38, 0.1)',
                    color: '#dc2626',
                    borderRadius: '10px',
                    fontSize: '13px',
                    marginBottom: '20px',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                  }}
                >
                  {errorMessage || 'Something went wrong. Please try again.'}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting' || !confirmed || !email}
                style={{
                  width: '100%',
                  background: !confirmed || !email || status === 'submitting' ? 'var(--surface2)' : 'var(--accent)',
                  color: !confirmed || !email || status === 'submitting' ? 'var(--muted)' : 'var(--btn-text)',
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: !confirmed || !email || status === 'submitting' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: !confirmed || !email || status === 'submitting' ? 'none' : '0 10px 20px var(--accent-faint)',
                }}
                onMouseEnter={(e) => {
                  if (confirmed && email && status !== 'submitting') {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 15px 30px var(--accent-muted)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (confirmed && email && status !== 'submitting') {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 10px 20px var(--accent-faint)'
                  }
                }}
              >
                {status === 'submitting' ? (
                  <>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Processing...
                  </>
                ) : (
                  'Request Data Deletion'
                )}
              </button>
            </form>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function DeleteUserPage() {
  return (
    <>
      {/* Background Glows */}
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

      <Suspense fallback={null}>
        <Header
          onSetView={(view) => (window.location.href = `/?view=${view}`)}
          currentView="home"
          onOpenSignup={() => (window.location.href = '/?signup=true')}
          trackInteraction={() => {}}
        />
        <main style={{ position: 'relative', zIndex: 1 }}>
          <DeleteUserContent />
        </main>
        <Footer
          onSetView={() => {}}
          onOpenSignup={() => (window.location.href = '/?signup=true')}
          trackInteraction={() => {}}
        />
      </Suspense>
    </>
  )
}
