'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Download, 
  Flame, 
  Target,
  CheckCircle2,
  Award,
  ChevronLeft
} from 'lucide-react'
import FallbackSuspense from '@/components/FallbackSuspense'
import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function ProfileClient() {
  const params = useParams()
  const slug = params?.slug as string
  const reportRef = useRef<HTMLDivElement>(null)
  const [isApp, setIsApp] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNative) {
      setIsApp(true)
    }
  }, [])

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-profile', slug],
    queryFn: () => api.getPublicProfile(slug as string),
    retry: false,
  })

  const downloadPDF = async () => {
    if (!reportRef.current) return
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 900,
      onclone: (doc) => {
        const el = doc.querySelector('.certificate') as HTMLElement
        if (el) {
          el.style.width = '860px'
          el.style.padding = '3rem'
        }
      }
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`Upward_Credibility_Report_${profile.fullName.replace(/\s+/g, '_')}.pdf`)
  }

  if (isLoading) return <FallbackSuspense message="Validating credentials..." />

  if (error || !profile) {
    return (
      <div className="profile-error">
        <div className="error-card">
          <ShieldCheck size={48} style={{ color: '#928e89' }} />
          <h2>Certificate Not Found</h2>
          <p>The credibility profile for this slug could not be verified or is set to private.</p>
          <Link href="/" className="btn btn--primary">Return Home</Link>
        </div>
      </div>
    )
  }

  const score = profile.creditScore || 300
  const rank = profile.reliabilityRank || 'A'
  const streak = profile.earlyPaymentStreak || 0
  const onTime = profile.onTimePercentage || 100
  const savingsImpact = profile.savingsImpact || 0
  const rankColor = rank === 'S' ? '#B8860B' : '#d97757'
  const rankBorderColor = rank === 'S' ? '#FFD700' : '#d97757'

  return (
    <div className="profile-page">
      <nav className="profile-nav">
        <div className="nav-container">
          <div className="nav-left">
            {isApp && (
              <Link href="/dashboard" className="back-btn">
                <ChevronLeft size={18} />
                <span>Back</span>
              </Link>
            )}
            <Link href="/" className="nav-logo">
              <span className="logo-text">UPWARD</span>
              <span className="logo-tag">VERIFIED</span>
            </Link>
          </div>
          <button className="download-btn-top" onClick={downloadPDF}>
            <Download size={16} />
            <span>Download Report</span>
          </button>
        </div>
      </nav>

      <main className="main-container">
        <div className="report-wrapper" ref={reportRef}>
          <div className="certificate">
            <header className="cert-header">
              <div className="cert-header__left">
                <div className="cert-badge">
                  <Award size={28} />
                </div>
                <div className="cert-header__text">
                  <h1 className="cert-title">Tenant Credibility Report</h1>
                  <p className="cert-subtitle">Official Verification by Upward Network</p>
                </div>
              </div>
              <div className="cert-id">
                <span className="cert-id__label">VERIFICATION ID</span>
                <strong className="cert-id__val">UPW-{profile.id?.slice(0, 8).toUpperCase() || 'VALID'}</strong>
              </div>
            </header>

            <div className="cert-body">
              <div className="profile-section">
                <div className="profile-top-row">
                  <div className="profile-avatar">
                    {profile.profilePic ? (
                      <img src={profile.profilePic} alt={profile.fullName} />
                    ) : (
                      profile.fullName?.charAt(0)
                    )}
                  </div>
                  <div className="profile-info">
                    <h2 className="profile-name">{profile.fullName}</h2>
                    <div className="profile-meta">
                      <span className="meta-tag">
                        <MapPin size={13} />
                        {profile.city || 'Lagos'}, {profile.country || 'Nigeria'}
                      </span>
                      <span className="meta-tag">
                        <Calendar size={13} />
                        Member since {new Date(profile.createdAt).getFullYear()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="score-summary">
                  <div className="score-main">
                    <span className="score-digit">{score}</span>
                    <span className="score-lbl">TRUST SCORE</span>
                  </div>
                  <div className="rank-summary" style={{ borderColor: rankBorderColor }}>
                    <span className="rank-val" style={{ color: rankColor }}>{rank}</span>
                    <span className="rank-lbl" style={{ color: rankColor }}>RELIABILITY</span>
                  </div>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-card__icon" style={{ color: '#22c55e' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="metric-card__content">
                    <span className="m-val">{onTime}%</span>
                    <span className="m-lbl">On-Time Payment Rate</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-card__icon" style={{ color: '#f59e0b' }}>
                    <Flame size={22} />
                  </div>
                  <div className="metric-card__content">
                    <span className="m-val">{streak}</span>
                    <span className="m-lbl">Early Payment Streak</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-card__icon" style={{ color: '#d97757' }}>
                    <Target size={22} />
                  </div>
                  <div className="metric-card__content">
                    <span className="m-val">{Math.floor(savingsImpact)}%</span>
                    <span className="m-lbl">Positive Savings Impact</span>
                  </div>
                </div>
              </div>

              <div className="verification-details">
                <h3 className="check-heading">Verification Checklist</h3>
                <div className="check-list">
                  <div className="check-item check-item--verified">
                    <CheckCircle2 size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span>Identity Verified</span>
                  </div>
                  <div className="check-item check-item--verified">
                    <CheckCircle2 size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span>Payment History Authenticated</span>
                  </div>
                  <div className="check-item check-item--verified">
                    <CheckCircle2 size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span>Wallet Integrity Confirmed</span>
                  </div>
                  <div className="check-item">
                    <ShieldCheck size={15} style={{ color: '#928e89', flexShrink: 0 }} />
                    <span>Tenancy Background: Verified by PMs</span>
                  </div>
                </div>
              </div>

              <div className="cert-footer">
                <div className="footer-note">
                  <p>Upward uses event-driven verified banking and transaction data to calculate credibility scores. This report is valid as of {new Date().toLocaleDateString()}.</p>
                </div>
                <div className="cert-seal">
                  <div className="seal-inner">
                    <span>UPWARD</span>
                    <span>CERTIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="join-cta">
          <h2>Trust is the New Currency</h2>
          <p>Join thousands of tenants using Upward to unlock better housing and financial opportunities.</p>
          <Link href="/signup" className="btn--premium">Build Your Reputation</Link>
        </div>
      </main>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: #f4f2ee;
          padding-bottom: 4rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #0a0a0f;
        }

        .profile-nav {
          background: #ffffff;
          padding: 0.85rem 0;
          border-bottom: 1px solid #e2ddd7;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .nav-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: #0a0a0f;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.4rem 0.75rem;
          background: #f8f6f2;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .back-btn:hover {
          background: #ede9e3;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
        }

        .logo-text {
          font-weight: 900;
          color: #0a0a0f;
          letter-spacing: 1.5px;
          font-size: 1rem;
        }

        .logo-tag {
          font-size: 0.55rem;
          background: #d97757;
          color: #ffffff;
          padding: 0.2rem 0.45rem;
          border-radius: 5px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .download-btn-top {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #0a0a0f;
          color: #ffffff;
          border: none;
          padding: 0.55rem 1.1rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: opacity 0.2s;
          white-space: nowrap;
        }

        .download-btn-top:hover {
          opacity: 0.85;
        }

        .main-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 2rem 1.25rem;
        }

        .report-wrapper {
          background: #ffffff;
          border-radius: 4px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        .certificate {
          padding: 2.5rem;
          background: #ffffff;
          position: relative;
        }

        .certificate::before {
          content: '';
          position: absolute;
          inset: 8px;
          border: 1px solid #f0ede8;
          pointer-events: none;
          border-radius: 2px;
        }

        .cert-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          border-bottom: 2px solid #0a0a0f;
          padding-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .cert-header__left {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .cert-badge {
          background: #d97757;
          color: #ffffff;
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cert-header__text {
          min-width: 0;
        }

        .cert-title {
          font-size: clamp(1rem, 3vw, 1.5rem);
          font-weight: 900;
          margin: 0;
          color: #0a0a0f;
          text-transform: uppercase;
          letter-spacing: -0.3px;
          line-height: 1.2;
        }

        .cert-subtitle {
          margin: 0.2rem 0 0;
          font-weight: 600;
          color: #928e89;
          font-size: 0.82rem;
        }

        .cert-id {
          text-align: right;
          flex-shrink: 0;
        }

        .cert-id__label {
          display: block;
          font-size: 0.58rem;
          font-weight: 800;
          color: #928e89;
          letter-spacing: 1.5px;
          margin-bottom: 0.2rem;
        }

        .cert-id__val {
          font-family: 'Courier New', monospace;
          font-size: 1rem;
          color: #0a0a0f;
          font-weight: 700;
        }

        .profile-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: #f8f6f2;
          padding: 1.5rem;
          border-radius: 16px;
          flex-wrap: wrap;
        }

        .profile-top-row {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex: 1;
          min-width: 0;
        }

        .profile-avatar {
          width: 70px;
          height: 70px;
          background: #e2ddd7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          color: #0a0a0f;
          overflow: hidden;
          flex-shrink: 0;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-info {
          min-width: 0;
        }

        .profile-name {
          font-size: clamp(1.1rem, 3.5vw, 1.6rem);
          font-weight: 800;
          margin: 0 0 0.4rem;
          color: #0a0a0f;
          line-height: 1.2;
        }

        .profile-meta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #928e89;
        }

        .score-summary {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-shrink: 0;
        }

        .score-main {
          text-align: center;
          background: #0a0a0f;
          color: #ffffff;
          padding: 0.9rem 1.25rem;
          border-radius: 16px;
        }

        .score-digit {
          display: block;
          font-size: 2rem;
          font-weight: 900;
          line-height: 1;
          color: #ffffff;
        }

        .score-lbl {
          font-size: 0.5rem;
          font-weight: 700;
          letter-spacing: 1px;
          opacity: 0.65;
          color: #ffffff;
        }

        .rank-summary {
          width: 62px;
          height: 62px;
          border: 2.5px solid #d97757;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .rank-val {
          font-size: 1.6rem;
          font-weight: 900;
          line-height: 1;
          color: #d97757;
        }

        .rank-lbl {
          font-size: 0.42rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #d97757;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          border: 1px solid #ede9e3;
          background: #faf8f5;
          padding: 1.25rem;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .metric-card__icon {
          flex-shrink: 0;
        }

        .metric-card__content {
          min-width: 0;
        }

        .m-val {
          display: block;
          font-size: 1.25rem;
          font-weight: 800;
          color: #0a0a0f;
          line-height: 1.1;
        }

        .m-lbl {
          font-size: 0.68rem;
          font-weight: 600;
          color: #928e89;
          line-height: 1.3;
        }

        .verification-details {
          margin-bottom: 2.5rem;
        }

        .check-heading {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #0a0a0f;
          margin-bottom: 1rem;
        }

        .check-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .check-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #928e89;
          background: #faf8f5;
          border: 1px solid #ede9e3;
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
        }

        .check-item--verified {
          color: #0a0a0f;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .cert-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #ede9e3;
          gap: 1.5rem;
        }

        .footer-note {
          flex: 1;
        }

        .footer-note p {
          font-size: 0.72rem;
          color: #928e89;
          line-height: 1.6;
          margin: 0;
        }

        .cert-seal {
          width: 88px;
          height: 88px;
          background: rgba(217, 119, 87, 0.08);
          border: 2px dashed #d97757;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-12deg);
          flex-shrink: 0;
        }

        .seal-inner {
          text-align: center;
          color: #d97757;
          font-weight: 900;
          font-size: 0.55rem;
          letter-spacing: 1px;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .join-cta {
          margin-top: 2.5rem;
          text-align: center;
          background: #0a0a0f;
          color: #ffffff;
          padding: 3.5rem 2rem;
          border-radius: 20px;
        }

        .join-cta h2 {
          font-size: clamp(1.5rem, 5vw, 2rem);
          font-weight: 900;
          margin-bottom: 0.75rem;
          color: #ffffff;
        }

        .join-cta p {
          font-size: 1rem;
          color: #928e89;
          margin-bottom: 2rem;
          max-width: 520px;
          margin-inline: auto;
          margin-bottom: 2rem;
        }

        .btn--premium {
          background: #d97757;
          color: #ffffff;
          padding: 1rem 2.25rem;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 800;
          text-decoration: none;
          display: inline-block;
          transition: transform 0.2s, opacity 0.2s;
        }

        .btn--premium:hover {
          transform: scale(1.04);
          opacity: 0.92;
        }

        .profile-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f4f2ee;
          padding: 2rem;
        }

        .error-card {
          text-align: center;
          background: #ffffff;
          padding: 3rem 2rem;
          border-radius: 20px;
          max-width: 400px;
        }

        @media (max-width: 640px) {
          .certificate {
            padding: 1.5rem 1.25rem;
          }

          .certificate::before {
            display: none;
          }

          .cert-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .cert-id {
            text-align: left;
          }

          .profile-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }

          .score-summary {
            width: 100%;
            justify-content: flex-start;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .check-list {
            grid-template-columns: 1fr;
          }

          .cert-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .cert-seal {
            align-self: center;
          }

          .join-cta {
            padding: 2.5rem 1.5rem;
          }
        }

        @media (min-width: 641px) and (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  )
}