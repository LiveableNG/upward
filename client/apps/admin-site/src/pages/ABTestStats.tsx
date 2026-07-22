import React, { useState, useEffect } from 'react'
import {
  FlaskConical,
  MousePointerClick,
  Eye,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import {
  Sparkline,
  StatCard,
  BarChart,
  TrendChart,
  delta,
  type TargetStat,
  type TypeStat,
  type DayTrend,
} from '../features/ab-test/components/ABTestCharts'

interface VariantStats {
  variant: string
  totalEvents: number
  uniqueVisitors: number
  totalClicks: number
  ctr: number
  signups: number
  completedSignups: number
  conversionRate: number
  topTargets: TargetStat[]
  typeBreakdown: TypeStat[]
  dailyTrend: DayTrend[]
}

interface ABTestStatsProps {
  token: string
}

const VARIANT_COLORS: Record<string, string> = {
  A: '#d97757', // brand accent
  B: '#6366f1', // indigo
}

const VARIANT_CONTENT: Record<string, { title: string; subtitle: string }> = {
  A: {
    title: 'Paid millions in rent? What do you have to show for it?',
    subtitle:
      'Upward records every payment, builds your housing reputation, unlocks benefits and opens the door to home ownership.',
  },
  B: {
    title: "Don't Just Pay Rent. Build With It.",
    subtitle:
      'Turn every rent payment into proof of financial responsibility—unlock rewards, credit opportunities, and pathways to owning your home.',
  },
}

const VARIANT_BG: Record<string, string> = {
  A: 'rgba(217, 119, 87, 0.08)',
  B: 'rgba(99, 102, 241, 0.08)',
}

const TYPE_COLORS: Record<string, string> = {
  VIEW: '#10b981',
  CLICK: '#d97757',
  SCROLL: '#6366f1',
}

const ABTestStats: React.FC<ABTestStatsProps> = ({ token }) => {
  const [data, setData] = useState<VariantStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiService.get('/admin/ab-stats', token)
        setData(res.data)
      } catch {
        setError('Failed to load A/B test statistics')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [token])

  if (loading) {
    return (
      <div className="page-container">
        <div
          style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <div className="loader" />
          Loading A/B test statistics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div
          style={{ color: '#dc2626', padding: '20px', background: '#fee2e2', borderRadius: '12px' }}
        >
          {error}
        </div>
      </div>
    )
  }

  const varA = data.find((d) => d.variant === 'A')
  const varB = data.find((d) => d.variant === 'B')

  if (!varA || !varB) {
    return (
      <div className="page-container fade-in">
        <h2 className="section-title" style={{ marginBottom: '24px' }}>
          A/B Test Statistics
        </h2>
        <div
          className="card"
          style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}
        >
          <FlaskConical size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <p>No interaction data collected yet.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            Data will appear here once visitors start interacting with the site.
          </p>
        </div>
      </div>
    )
  }

  const allTargetMax = Math.max(
    ...varA.topTargets.map((t) => t.count),
    ...varB.topTargets.map((t) => t.count),
    1,
  )

  return (
    <div className="page-container fade-in" style={{ paddingTop: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--accent-faint)',
            border: '1px solid var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
          }}
        >
          <FlaskConical size={22} />
        </div>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            A/B Test Statistics
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Comparing Variant A vs Variant B across interactions and conversions
          </p>
        </div>
      </div>

      {/* Variant badges */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[varA, varB].map((v) => (
          <div
            key={v.variant}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              borderRadius: '12px',
              background: VARIANT_BG[v.variant],
              border: `1px solid ${VARIANT_COLORS[v.variant]}30`,
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: VARIANT_COLORS[v.variant],
              }}
            />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Variant {v.variant}</span>
            <Sparkline data={v.dailyTrend} color={VARIANT_COLORS[v.variant]} height={32} />
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {['A', 'B'].map((v) => (
          <div
            key={v}
            className="card"
            style={{
              flex: '1 1 300px',
              borderLeft: `4px solid ${VARIANT_COLORS[v]}`,
              padding: '24px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: VARIANT_COLORS[v],
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: VARIANT_BG[v],
                }}
              >
                VARIANT {v} CONTENT
              </div>
            </div>
            <h4
              style={{
                fontSize: '18px',
                fontWeight: 800,
                marginBottom: '12px',
                color: 'var(--text)',
                lineHeight: 1.3,
              }}
            >
              {VARIANT_CONTENT[v].title}
            </h4>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {VARIANT_CONTENT[v].subtitle}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          label="Total Events"
          valueA={varA.totalEvents}
          valueB={varB.totalEvents}
          icon={Eye}
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
        <StatCard
          label="Unique Visitors"
          valueA={varA.uniqueVisitors}
          valueB={varB.uniqueVisitors}
          icon={Users}
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
        <StatCard
          label="Total Clicks"
          valueA={varA.totalClicks}
          valueB={varB.totalClicks}
          icon={MousePointerClick}
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
        <StatCard
          label="Click-Through Rate"
          valueA={varA.ctr}
          valueB={varB.ctr}
          icon={TrendingUp}
          format={(v) => `${v}`}
          suffix="%"
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
        <StatCard
          label="Signups"
          valueA={varA.signups}
          valueB={varB.signups}
          icon={Users}
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
        <StatCard
          label="Conversions"
          valueA={varA.completedSignups}
          valueB={varB.completedSignups}
          icon={CheckCircle2}
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
        <StatCard
          label="Conversion Rate"
          valueA={varA.conversionRate}
          valueB={varB.conversionRate}
          icon={TrendingUp}
          format={(v) => `${v}`}
          suffix="%"
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Daily Interaction Trend (Last 30 days)
          </h3>
          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
            {['A', 'B'].map((v) => (
              <div
                key={v}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '3px',
                    borderRadius: '2px',
                    background: VARIANT_COLORS[v],
                  }}
                />
                Variant {v}
              </div>
            ))}
          </div>
        </div>
        <TrendChart
          variantA={varA.dailyTrend}
          variantB={varB.dailyTrend}
          colorA={VARIANT_COLORS['A']}
          colorB={VARIANT_COLORS['B']}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        {[varA, varB].map((v) => (
          <div key={v.variant} className="card" style={{ flex: '1 1 300px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: VARIANT_COLORS[v.variant],
                }}
              />
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Variant {v.variant} — Top targets
              </h3>
            </div>
            {v.topTargets.length === 0 ? (
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                No data
              </p>
            ) : (
              <BarChart
                data={v.topTargets.map((t) => ({ label: t.target, count: t.count }))}
                color={VARIANT_COLORS[v.variant]}
                max={allTargetMax}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        {[varA, varB].map((v) => {
          const total = v.typeBreakdown.reduce((s, t) => s + t.count, 0)
          return (
            <div key={v.variant} className="card" style={{ flex: '1 1 300px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: VARIANT_COLORS[v.variant],
                  }}
                />
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Variant {v.variant} — Event types
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {v.typeBreakdown.map((t) => {
                  const pct = total > 0 ? Math.round((t.count / total) * 100) : 0
                  const color = TYPE_COLORS[t.type] ?? 'var(--accent)'
                  return (
                    <div key={t.type}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          marginBottom: '5px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color,
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            background: `${color}15`,
                          }}
                        >
                          {t.type}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          {t.count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'var(--surface-hover)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: color,
                            borderRadius: '3px',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                {v.typeBreakdown.length === 0 && (
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      textAlign: 'center',
                      padding: '20px',
                    }}
                  >
                    No data
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Conversion Summary</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Waitlist signup completion rates per variant (from{' '}
            <code>upward_waitlist.abVariant</code>)
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {['Variant', 'Signups Started', 'Completed', 'Conversion Rate', 'vs Other'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '14px 20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {[varA, varB].map((v, idx) => {
                const other = idx === 0 ? varB : varA
                const d = delta(v.conversionRate, other.conversionRate)
                const DeltaIcon =
                  d.dir === 'up' ? ArrowUpRight : d.dir === 'down' ? ArrowDownRight : Minus
                const deltaColor =
                  d.dir === 'up' ? '#10b981' : d.dir === 'down' ? '#ef4444' : '#6b7280'
                return (
                  <tr key={v.variant} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '14px',
                          color: VARIANT_COLORS[v.variant],
                          background: VARIANT_BG[v.variant],
                          padding: '4px 12px',
                          borderRadius: '20px',
                        }}
                      >
                        Variant {v.variant}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                      {v.signups.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                      {v.completedSignups.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '16px',
                          color: 'var(--text)',
                        }}
                      >
                        {v.conversionRate}%
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {d.pct > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: deltaColor,
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          <DeltaIcon size={14} />
                          {d.pct}%
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ABTestStats
