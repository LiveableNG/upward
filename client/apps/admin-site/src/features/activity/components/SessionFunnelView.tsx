import React, { useState, useEffect } from 'react'
import {
  TrendingDown,
  AlertTriangle,
  MapPin,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'

interface FunnelMetrics {
  totalSessions: number
  paymentFunnel: {
    steps: Array<{
      step: number
      name: string
      count: number
      conversionRate: number
      dropOffCount: number
      dropOffRate: number
    }>
    leakage: {
      dismissedWithoutPaying: number
      failedWithErrors: number
    }
  }
  dropOffBreakdown: Array<{ stage: string; count: number }>
  platformBreakdown: Array<{ platform: string; count: number }>
  topLocations: Array<{ city: string; countryCode: string; count: number }>
}

interface SessionFunnelViewProps {
  token?: string
  onSelectDropOffFilter?: (stage: string) => void
}

export const SessionFunnelView: React.FC<SessionFunnelViewProps> = ({
  token,
  onSelectDropOffFilter,
}) => {
  const [platform, setPlatform] = useState<string>('ALL')
  const [days, setDays] = useState<number>(30)
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)

  const fetchFunnels = async () => {
    setLoading(true)
    try {
      let url = `/admin/app-activity/funnels?days=${days}`
      if (platform !== 'ALL') url += `&platform=${platform}`
      const res = await apiService.get(url, token)
      if (res) {
        setMetrics(res)
      }
    } catch (err) {
      console.error('Failed to fetch funnel analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFunnels()
  }, [platform, days, token])

  const funnelSteps = metrics?.paymentFunnel?.steps || []
  const maxStepCount = funnelSteps.length > 0 ? Math.max(...funnelSteps.map((s) => s.count), 1) : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Control Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
            Funnel Analysis
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ({metrics?.totalSessions || 0} tracked sessions)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Platform Filter */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Platforms</option>
            <option value="ios">iOS Only</option>
            <option value="android">Android Only</option>
            <option value="web">Web App Only</option>
          </select>

          {/* Timeframe */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <button
            type="button"
            onClick={fetchFunnels}
            className="btn btn-secondary"
            disabled={loading}
            style={{ padding: '6px 10px', borderRadius: '8px' }}
          >
            <RefreshCcw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Conversion Pipeline Card */}
      <div
        className="card"
        style={{
          padding: '20px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
              Payment & Checkout Conversion Pipeline
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Tracks drop-off from app launch to completed verified payment.
            </p>
          </div>
        </div>

        {funnelSteps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
            {loading ? 'Calculating conversion funnel...' : 'No session activity recorded for this period.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {funnelSteps.map((step, idx) => {
              const widthPct = Math.max(12, Math.round((step.count / maxStepCount) * 100))
              const isLast = idx === funnelSteps.length - 1

              return (
                <div key={step.step} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isLast ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-faint)',
                          color: isLast ? '#059669' : 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                        }}
                      >
                        {step.step}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {step.name.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px' }}>
                        {step.count.toLocaleString()}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isLast ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-highlight)',
                          color: isLast ? '#059669' : 'var(--text-secondary)',
                        }}
                      >
                        {step.conversionRate}% retained
                      </span>
                      {step.dropOffRate > 0 && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#dc2626',
                          }}
                        >
                          -{step.dropOffRate}% drop-off ({step.dropOffCount})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funnel Visual Bar */}
                  <div
                    style={{
                      height: '10px',
                      borderRadius: '5px',
                      background: 'var(--border)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${widthPct}%`,
                        borderRadius: '5px',
                        background: isLast
                          ? 'linear-gradient(90deg, #10b981, #059669)'
                          : 'linear-gradient(90deg, var(--accent), var(--accent-hover, #ca5a2f))',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Leakage & Drop-off Breakdown Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Payment Leakage Card */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: '13px', fontWeight: 800 }}>Payment Leakage Summary</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#b45309', display: 'block' }}>
                  Abandoned Without Paying
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  User opened Paystack but closed or cancelled modal
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#b45309' }}>
                {metrics?.paymentFunnel?.leakage?.dismissedWithoutPaying || 0}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', display: 'block' }}>
                  Failed with Errors
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Card declines, network timeouts, or CDN errors
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>
                {metrics?.paymentFunnel?.leakage?.failedWithErrors || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Drop-off by Stage Breakdown */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={16} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 800 }}>Top Exit / Drop-off Stages</span>
          </div>

          {(!metrics?.dropOffBreakdown || metrics.dropOffBreakdown.length === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
              No drop-offs recorded for this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metrics.dropOffBreakdown.slice(0, 5).map((item) => (
                <div
                  key={item.stage}
                  onClick={() => onSelectDropOffFilter && onSelectDropOffFilter(item.stage)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    cursor: onSelectDropOffFilter ? 'pointer' : 'default',
                    fontSize: '12px',
                  }}
                  title={onSelectDropOffFilter ? `Filter sessions at ${item.stage}` : undefined}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.stage}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{item.count}</span>
                    {onSelectDropOffFilter && <ArrowRight size={12} color="var(--text-muted)" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geographic Distribution */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 800 }}>Top Geographies</span>
          </div>

          {(!metrics?.topLocations || metrics.topLocations.length === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
              No location data recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metrics.topLocations.slice(0, 5).map((loc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {loc.city ? `${loc.city}, ` : ''}{loc.countryCode || 'Unknown'}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>
                    {loc.count.toLocaleString()} sessions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
