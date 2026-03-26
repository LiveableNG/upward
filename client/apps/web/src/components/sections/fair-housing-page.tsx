'use client'

import React from 'react'
import { StoryForm } from './story-form'

export function FairHousingPage({ onBack }: { onBack: () => void }) {
  const scrollToForm = () => {
    const element = document.getElementById('story-form')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '120px 40px',
        maxWidth: '1280px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
      className="fair-page-container"
    >
      <style>{`
        .fair-page-container {
          padding: 100px 24px 60px !important;
        }
        .fair-image-container {
          position: relative;
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 30px 60px -12px rgba(0,0,0,0.3);
          border: 1px solid var(--border);
          aspect-ratio: 4/3;
        }
        .fair-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s cubic-bezier(0.2, 0, 0.2, 1);
        }
        .fair-image-container:hover img {
          transform: scale(1.05);
        }
        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 100%);
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .fair-page-container {
            padding: 90px 20px 40px !important;
          }
          .fair-grid {
             grid-template-columns: 1fr !important;
             gap: 40px !important;
          }
          .fair-image-container {
            order: -1;
            aspect-ratio: 16/9;
          }
        }
      `}</style>

      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '48px',
          padding: '12px 20px',
          borderRadius: '100px',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-4px)'
          e.currentTarget.style.background = 'var(--accent-faint)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.background = 'var(--surface2)'
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </button>

      <div
        className="fair-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) 1fr',
          gap: '80px',
          alignItems: 'center',
          animation: 'fadeUp 0.8s ease both',
        }}
      >
        <div>
          <div className="section-label" style={{ marginBottom: '24px' }}>
            The Fairness Project
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: '32px',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Have you ever been denied a home because of who you are?
          </h1>

          <p
            style={{
              fontSize: '20px',
              lineHeight: 1.6,
              color: 'var(--text)',
              fontWeight: 500,
              marginBottom: '24px',
            }}
          >
            In many cities, securing a rental isn't just about your ability to pay. Often, it's
            about your tribe, your gender, or your status.
          </p>

          <p
            style={{
              color: 'var(--muted)',
              fontSize: '17px',
              lineHeight: 1.8,
              marginBottom: '40px',
            }}
          >
            At Upward, we believe your verified history should be the only thing that matters. We're
            gathering stories to expose the true cost of housing bias and build a system that works
            for everyone.
          </p>

          <button
            onClick={scrollToForm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--accent)',
              color: 'var(--btn-text)',
              padding: '20px 40px',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '0.05em',
              boxShadow: '0 10px 30px rgba(217, 119, 87, 0.3)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(217, 119, 87, 0.45)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(217, 119, 87, 0.3)'
            }}
          >
            Share My Story
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="fair-image-container">
          <img src="/housing-crisis.png" alt="Housing Crisis in Nigeria" />
          <div className="image-overlay" />
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              right: '24px',
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <p
              style={{
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.4,
                margin: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              "I was told the landlord only wants a specific tribe. This has to stop."
            </p>
          </div>
        </div>
      </div>

      <StoryForm />

      <div
        style={{
          marginTop: '80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        {[
          {
            title: 'Visible Bias',
            text: 'Discrimination based on ethnicity or gender is often unwritten but real.',
          },
          {
            title: 'Data for Change',
            text: 'Real stories help us prove the need for a verified, bias-free reputation system.',
          },
          {
            title: 'Zero Tolerance',
            text: 'We are building a future where your character is your only housing currency.',
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              padding: '32px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)'
              e.currentTarget.style.borderColor = 'var(--accent-muted)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '18px',
                color: 'var(--text)',
                marginBottom: '12px',
                letterSpacing: '-0.01em',
              }}
            >
              {item.title}
            </div>
            <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
