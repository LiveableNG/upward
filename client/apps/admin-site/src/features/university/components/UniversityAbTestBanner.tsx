import React from 'react'
import type { AbVariantMetrics } from '../types'

interface UniversityAbTestBannerProps {
  abTestStats?: {
    variantA: AbVariantMetrics
    variantB: AbVariantMetrics
  }
}

export const UniversityAbTestBanner: React.FC<UniversityAbTestBannerProps> = ({ abTestStats }) => {
  if (!abTestStats) return null

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf9 100%)',
        border: '1px solid #e7dcd3',
        borderRadius: '16px',
        padding: '22px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(138, 74, 42, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#fdf0e9',
                color: '#8A4A2A',
                padding: '3px 9px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Live Experiment
            </span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              A/B Test: Upfront Pricing vs Post-Registration Pricing
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Comparing visitor conversion and paid ₦5,000 application fee completions between upfront pricing transparency and deferred post-registration pricing.
          </p>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Split: <b>50% / 50% Sticky Traffic</b>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Variant A Card */}
        <div
          style={{
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            background: '#f8fafc',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Control (Variant A)
              </span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Upfront Pricing (₦200k / ₦5k)
              </div>
            </div>
            <span style={{ fontSize: '11.5px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              Transparent
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Unique Visitors</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {abTestStats.variantA.uniqueViews}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Applications</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {abTestStats.variantA.applicationsCount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>App Conv. Rate</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8' }}>
                {abTestStats.variantA.applicationConversionRate}%
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Paid Apps (₦5k)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                {abTestStats.variantA.paidApplicationsCount} ({abTestStats.variantA.paidConversionRate}%)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Revenue</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                ₦{abTestStats.variantA.totalRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Variant B Card */}
        <div
          style={{
            border: '1px solid #e9d5ff',
            borderRadius: '12px',
            background: '#faf5ff',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Experiment (Variant B)
              </span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#581c87' }}>
                Post-Registration Pricing
              </div>
            </div>
            <span style={{ fontSize: '11.5px', background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              Deferred Price
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3e8ff' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#7e22ce' }}>Unique Visitors</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#581c87' }}>
                {abTestStats.variantB.uniqueViews}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7e22ce' }}>Applications</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#581c87' }}>
                {abTestStats.variantB.applicationsCount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7e22ce' }}>App Conv. Rate</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#7e22ce' }}>
                {abTestStats.variantB.applicationConversionRate}%
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3e8ff' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#7e22ce' }}>Paid Apps (₦5k)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                {abTestStats.variantB.paidApplicationsCount} ({abTestStats.variantB.paidConversionRate}%)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7e22ce' }}>Revenue</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                ₦{abTestStats.variantB.totalRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
