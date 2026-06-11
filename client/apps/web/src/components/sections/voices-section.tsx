'use client'
import React from 'react'
import { Quote } from 'lucide-react'

export function VoicesSection() {
  const testimonials = [
    {
      quote: "I've lived in Ikeja for 5 years, paying rent on time every single month. It felt like shouting into a void. Now, my Upward score is helping me finalize my first mortgage application.",
      author: "Adesuwa T.",
      role: "Lagos Resident",
      avatar: "/attachments/testimonials/user1.png",
    },
    {
      quote: "As a freelancer, landlords used to be skeptical of my income. My Rent Passport™ proved my reliability better than any bank statement ever could. It's a game changer.",
      author: "Emeka J.",
      role: "Creative Director",
      avatar: "/attachments/testimonials/user2.png",
    },
    {
      quote: "The reward program is actually useful. I got a 10% discount on my annual renewal just by maintaining a high Property Care Score. Why doesn't everyone use this?",
      author: "Bisi O.",
      role: "Abuja Resident",
      avatar: "/attachments/testimonials/user3.png",
    },
  ]

  return (
    <section id="testimonials" className="voices">
      <div className="voices__container">
        
        {/* Section Header */}
        <div className="voices__header">
          <span className="voices__label">Success Stories</span>
          <h2 className="voices__title">Voices of the Community</h2>
          <p className="voices__subtitle">
            See how Upward Pay is helping tenants across Nigeria turn their rent into reputational power.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="voices__grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="voices__card">
              <div className="voices__quote-icon-wrapper">
                <Quote size={20} className="voices__quote-icon" />
              </div>
              
              <p className="voices__quote-text">"{t.quote}"</p>
              
              <div className="voices__author">
                <img
                  src={t.avatar}
                  alt={`${t.author} profile picture`}
                  className="voices__avatar"
                />
                <div className="voices__author-info">
                  <h4 className="voices__name">{t.author}</h4>
                  <p className="voices__role">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        .voices {
          padding: 100px 40px;
          background: var(--surface);
          position: relative;
          z-index: 1;
        }

        .voices__container {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }

        .voices__header {
          text-align: center;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .voices__label {
          font-size: var(--font-xs);
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .voices__title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.15;
          letter-spacing: -0.04em;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .voices__subtitle {
          font-family: var(--font-body);
          font-size: clamp(14px, 1.4vw, 18px);
          color: var(--muted);
          line-height: 1.6;
        }

        .voices__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          width: 100%;
        }

        .voices__card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 32px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.01);
        }

        .voices__card:hover {
          transform: translateY(-6px);
          border-color: var(--accent-muted);
          box-shadow: 0 20px 40px rgba(217, 119, 87, 0.08);
        }

        .voices__quote-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }

        .voices__quote-icon {
          transform: rotate(180deg);
          fill: currentColor;
          opacity: 0.15;
        }

        .voices__quote-text {
          font-family: var(--font-body);
          font-size: var(--font-base);
          color: var(--text);
          line-height: 1.7;
          font-style: italic;
          flex-grow: 1;
        }

        .voices__author {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .voices__avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border);
        }

        .voices__author-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .voices__name {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
        }

        .voices__role {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        @media (max-width: 992px) {
          .voices__grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        @media (max-width: 768px) {
          .voices {
            padding: 60px 20px;
          }
          .voices__card {
            padding: 32px;
          }
        }
      `}</style>
    </section>
  )
}
