'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'notfound'>(
    'idle',
  )

  useEffect(() => {
    if (email) {
      handleUnsubscribe()
    }
  }, [email])

  const handleUnsubscribe = async () => {
    if (status === 'processing' || status === 'success') return

    setStatus('processing')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok && result.data?.success) {
        setStatus('success')
      } else {
        setStatus(result.message === 'User not found' ? 'notfound' : 'error')
      }
    } catch (err) {
      console.error('Unsubscribe error:', err)
      setStatus('error')
    }
  }

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '60px 40px',
          backgroundColor: 'var(--surface)',
          borderRadius: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="section-label" style={{ marginBottom: '24px', display: 'inline-block' }}>
          Preferences
        </div>

        {status === 'idle' && !email && (
          <>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '2rem',
                marginBottom: '16px',
                background: 'var(--heading-mix)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Missing Email
            </h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: '32px' }}>
              We couldn&apos;t find an email address to unsubscribe. Please check the link in your
              email.
            </p>
          </>
        )}

        {status === 'processing' && (
          <>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(217, 119, 87, 0.2)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                margin: '0 auto 24px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '2rem',
                marginBottom: '16px',
                background: 'var(--heading-mix)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Unsubscribing...
            </h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              We&apos;re updating your preferences for <strong>{email}</strong>.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: '#16a34a',
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
                fontSize: '2.5rem',
                marginBottom: '16px',
                background: 'var(--heading-mix)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              Unsubscribed.
            </h1>
            <p
              style={{
                color: 'var(--muted)',
                lineHeight: 1.6,
                fontSize: '1.1rem',
                marginBottom: '32px',
              }}
            >
              You&apos;ve been successfully removed from our campaign list for{' '}
              <strong>{email}</strong>.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                backgroundColor: 'var(--accent)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Back to Home
            </a>
          </>
        )}

        {(status === 'error' || status === 'notfound') && (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: '#dc2626',
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
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '2rem',
                marginBottom: '16px',
                background: 'var(--heading-mix)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {status === 'notfound' ? 'User Not Found' : 'Something went wrong'}
            </h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: '32px' }}>
              {status === 'notfound'
                ? `We couldn't find an entry for ${email}.`
                : "We couldn't process your request right now. Please try again later or contact support."}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleUnsubscribe}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <a
                href="mailto:hello@goodtenants.africa"
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid var(--border)',
                }}
              >
                Contact Support
              </a>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function UnsubscribePage() {
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
      <Suspense fallback={null}>
        <Header
          onSetView={(view) => (window.location.href = `/?view=${view}`)}
          currentView="home"
          onOpenSignup={() => (window.location.href = '/?signup=true')}
          trackInteraction={() => {}}
        />
        <main style={{ position: 'relative', zIndex: 1 }}>
          <UnsubscribeContent />
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
