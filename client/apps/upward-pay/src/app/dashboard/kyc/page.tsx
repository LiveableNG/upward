'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Download, Share2, Award, CheckCircle2, MapPin, Calendar, Clock, BarChart3, Lock, CheckCircle } from 'lucide-react'
import { UpwardLogo } from '@/components/payment/PoweredByUpward'

export default function KYCReportPage() {
  const router = useRouter()

  const verifications = [
    { label: 'Identity (BVN/NIN)', status: 'Verified', date: 'Oct 2024' },
    { label: 'Work/Income', status: 'Verified', date: 'Jan 2025' },
    { label: 'Previous Landlord', status: 'Verified', date: 'Nov 2024' },
    { label: 'Phone Number', status: 'Verified', date: 'Sep 2024' }
  ]

  return (
    <div className="kyc-page dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
            <h2 className="dashboard__title">Housing Credibility Profile</h2>
        </div>
        <div className="dashboard__header-right">
           <button className="btn btn--sm" style={{ background: 'var(--clay)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
             <Share2 size={14} /> Share
           </button>
        </div>
      </header>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        
        <div className="kyc-report">
          
          {/* Watermark/Texture */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', opacity: 0.03, pointerEvents: 'none' }}>
            <UpwardLogo size={300} color="var(--clay)" />
          </div>

          <div className="kyc-report__header">
             <div className="kyc-report__badge">
               <ShieldCheck size={14} /> OFFICIAL TENANT CREDENTIAL
             </div>
             
             <div className="kyc-report__avatar-wrap">
                <span>J</span>
             </div>
             <h1 className="kyc-report__name">Johnathan Doe</h1>
             <div className="kyc-report__meta">
                <MapPin size={14} /> Lagos, Nigeria · Verified Tenant
             </div>

             <div className="kyc-report__score-box">
                <span className="kyc-report__score-label">Rent Credibility Score</span>
                <div className="kyc-report__score-value">882</div>
                <div className="kyc-report__score-tier">
                  Top 1% Performant Tenant
                </div>
             </div>
          </div>

          <div className="kyc-report__body">
            <h3 className="kyc-report__section-title">Verification Status</h3>
            <div className="kyc-report__verif-grid">
               {verifications.map((v, i) => (
                 <div key={i} className="kyc-report__verif-item">
                    <div className="kyc-report__verif-status">
                       <CheckCircle size={14} />
                       <span>{v.status}</span>
                    </div>
                    <span className="kyc-report__verif-label">{v.label}</span>
                 </div>
               ))}
            </div>

            <div className="kyc-report__insight-card">
               <div className="kyc-report__insight-header">
                  <Award size={20} color="var(--clay)" />
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Tenant Legacy Insights</span>
               </div>
               <div className="kyc-report__insight-grid">
                  <div>
                    <span style={{ fontSize: '10px', opacity: 0.6, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Rent-to-Income</span>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>24.2% <span style={{fontSize: '11px', opacity: 0.7}}>(Healthy)</span></span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', opacity: 0.6, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>On-time Rate</span>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>99.2%</span>
                  </div>
               </div>
            </div>

            <div className="kyc-report__footer">
               <div className="kyc-report__brand">
                 <UpwardLogo size={16} color="var(--clay)" />
                 <span>Powered by Upward Verified</span>
               </div>
               <p className="kyc-report__ref">Report Date: March 31, 2026 · Ref: UPW-882-JD</p>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button className="btn btn--primary btn--full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} /> Confirm & Share with Landlord
          </button>
          <button className="btn btn--secondary" title="Download PDF">
            <Download size={20} />
          </button>
        </div>

        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Sharing this report will grant the landlord 7-day access to your verified housing credentials. You can revoke access at any time.
        </p>

      </div>
    </div>
  )
}
