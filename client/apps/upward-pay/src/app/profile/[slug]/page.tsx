'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Award, ShieldCheck, MapPin, Calendar, Star, TrendingUp } from 'lucide-react'
import FallbackSuspense from '@/components/FallbackSuspense'
import Link from 'next/link'

export default function PublicProfilePage() {
  const { slug } = useParams()

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-profile', slug],
    queryFn: () => api.getPublicProfile(slug as string),
    retry: false,
  })

  if (isLoading) return <FallbackSuspense message="Fetching profile..." />

  if (error || !profile) {
    return (
      <div className="public-profile public-profile--error">
        <div className="container">
          <h2>Profile Not Found</h2>
          <p>The tenant profile you are looking for does not exist or is private.</p>
          <Link href="/" className="btn btn--secondary">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const scorePercentage = Math.min(((profile.creditScore || 0) / 1000) * 100, 100)

  return (
    <div className="public-profile">
      <header className="public-profile__header">
        <div className="container">
          <div className="profile-hero">
            <div className="profile-hero__avatar">{profile.fullName.charAt(0)}</div>
            <div className="profile-hero__info">
              <h1 className="profile-hero__name">{profile.fullName}</h1>
              <div className="profile-hero__meta">
                <span className="profile-hero__tag">
                  <ShieldCheck size={14} />
                  Verified Tenant
                </span>
                <span className="profile-hero__tag">
                  <Award size={14} />
                  Legacy Member
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="profile-grid">
          {/* Left Column: Score & Stats */}
          <div className="profile-grid__main">
            <section className="profile-card profile-card--premium">
              <div className="profile-card__header">
                <h2 className="profile-card__title">Rent Credibility Score</h2>
                <div className="profile-card__badge">Top 1%</div>
              </div>

              <div className="score-display">
                <div className="score-display__visual">
                  <div
                    className="score-display__gauge"
                    style={{
                      background: `conic-gradient(var(--clay) 0% ${scorePercentage}%, var(--border-solid) ${scorePercentage}% 100%)`,
                    }}
                  >
                    <div className="score-display__value">
                      <span className="score-display__number">{profile.creditScore}</span>
                      <span className="score-display__label">LEGACY SCORE</span>
                    </div>
                  </div>
                </div>

                <div className="score-display__stats">
                  <div className="score-stat">
                    <TrendingUp size={20} className="text--clay" />
                    <div>
                      <span className="score-stat__val">Elite</span>
                      <span className="score-stat__label">Status</span>
                    </div>
                  </div>
                  <div className="score-stat">
                    <Star size={20} className="text--clay" />
                    <div>
                      <span className="score-stat__val">{profile.reliabilityRank || 'A'} Tier</span>
                      <span className="score-stat__label">Reliability</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-bio">
                <h3 className="profile-bio__title">About this Tenant</h3>
                <p className="profile-bio__text">
                  {profile.bio ||
                    'This tenant has built a consistent legacy of excellence and housing stability through Upward.'}
                </p>
              </div>
            </section>

            <section className="profile-card">
              <h3 className="profile-card__title">Performance Stats</h3>
              <div className="achievements-grid">
                <div className="achievement-box achievement-box--premium">
                  <TrendingUp size={24} className="text--clay" />
                  <span className="achievement-box__val">{profile.onTimePercentage || 100}%</span>
                  <span className="achievement-box__label">On-Time Rate</span>
                </div>
                <div className="achievement-box achievement-box--premium">
                  <Award size={24} className="text--clay" />
                  <span className="achievement-box__val">+{profile.earlyPaymentStreak || 0}</span>
                  <span className="achievement-box__label">Early Bird Streak</span>
                </div>
                <div className="achievement-box achievement-box--premium">
                  <Star size={24} className="text--clay" />
                  <span className="achievement-box__val">
                    {Math.floor(profile.savingsImpact || 0)}%
                  </span>
                  <span className="achievement-box__label">Savings Impact</span>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <h3 className="profile-card__title">Housing Achievements</h3>
              <div className="achievements-grid">
                <div className="achievement-box">
                  <Calendar size={24} className="text--clay" />
                  <span>Consistent History</span>
                </div>
                <div className="achievement-box">
                  <ShieldCheck size={24} className="text--clay" />
                  <span>Verified Identity</span>
                </div>
                <div className="achievement-box">
                  <MapPin size={24} className="text--clay" />
                  <span>Stable Residency</span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Call to Action */}
          <div className="profile-grid__side">
            <div className="cta-card">
              <h3 className="cta-card__title">Want a profile like this?</h3>
              <p className="cta-card__text">
                Join Upward to start building your own rent credibility and unlock better housing
                opportunities.
              </p>
              <Link href="/?ref=shared-profile" className="btn btn--clay btn--block">
                Join Upward Today
              </Link>
              <p className="cta-card__footer">
                Already a member? <Link href="/login">Sign in</Link>
              </p>
            </div>

            <div className="signature-box">
              <p className="signature-box__quote">"Carrying this profile to my next landlord."</p>
              <p className="signature-box__author">— Upward Member</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .public-profile {
          min-height: 100vh;
          background: var(--bg);
          padding-bottom: 4rem;
        }

        .public-profile__header {
          background: var(--dark);
          padding: 4rem 0;
          color: white;
          margin-bottom: -3rem;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .profile-hero {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .profile-hero__avatar {
          width: 80px;
          height: 80px;
          background: var(--clay);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .profile-hero__name {
          font-size: 2rem;
          margin: 0 0 0.5rem 0;
        }

        .profile-hero__meta {
          display: flex;
          gap: 1rem;
        }

        .profile-hero__tag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          color: var(--text-muted);
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 2rem;
          align-items: start;
        }

        .profile-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px var(--shadow-color);
          border: 1px solid var(--border-solid);
        }

        .profile-card--premium {
          border: 2px solid var(--clay);
          position: relative;
          overflow: hidden;
        }

        .profile-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .profile-card__badge {
          background: var(--clay);
          color: white;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: 3rem;
          margin-bottom: 2rem;
        }

        .score-display__visual {
          position: relative;
        }

        .score-display__gauge {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
        }

        .score-display__value {
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .score-display__number {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--dark);
          line-height: 1;
        }

        .score-display__label {
          font-size: 0.6rem;
          color: var(--text-muted);
          letter-spacing: 1px;
          margin-top: 0.2rem;
        }

        .score-display__stats {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .score-stat {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .score-stat__val {
          display: block;
          font-weight: 700;
          color: var(--dark);
        }

        .score-stat__label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .profile-bio__title {
          font-size: 1.1rem;
          margin-bottom: 0.8rem;
          color: var(--dark);
        }

        .profile-bio__text {
          color: var(--text-muted);
          line-height: 1.6;
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .achievement-box {
          background: var(--bg);
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--dark);
          border: 1px solid var(--border-solid);
        }

        .achievement-box--premium {
          border: 1px solid rgba(var(--clay-rgb), 0.2);
          background: white;
          box-shadow: 0 4px 12px rgba(var(--clay-rgb), 0.05);
        }

        .achievement-box__val {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--dark);
          line-height: 1;
          margin-top: 0.5rem;
        }

        .achievement-box__label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cta-card {
          background: var(--dark);
          color: white;
          padding: 2rem;
          border-radius: 20px;
          text-align: center;
        }

        .cta-card__title {
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }

        .cta-card__text {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .btn--block {
          width: 100%;
        }

        .cta-card__footer {
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .cta-card__footer :global(a) {
          color: var(--clay);
          text-decoration: none;
          font-weight: 600;
        }

        .signature-box {
          margin-top: 2rem;
          padding: 1.5rem;
          border-left: 3px solid var(--clay);
          background: rgba(var(--clay-rgb), 0.05);
        }

        .signature-box__quote {
          font-style: italic;
          color: var(--dark);
          margin-bottom: 0.5rem;
        }

        .signature-box__author {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--clay);
        }

        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }

          .profile-hero {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .score-display {
            flex-direction: column;
            gap: 2rem;
          }

          .achievements-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
