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
  const maxStepCount = funnelSteps.length > 0 ? Math.max(...funnelSteps.map((s) => s.count), 0) : 0
  const totalSessions = metrics?.totalSessions || 0

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
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
            Checkout & Rent Conversion Pipeline
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ({totalSessions} {totalSessions === 1 ? 'tracked session' : 'tracked sessions'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Platform Filter */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            <option value="ALL">All Platforms</option>
            <option value="ios">iOS Native</option>
            <option value="android">Android Native</option>
            <option value="web">Web Browser</option>
          </select>

          {/* Timeframe */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text)',
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
            style={{ padding: '7px 12px', borderRadius: '8px' }}
          >
            <RefreshCcw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Conversion Pipeline Card */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Payment Funnel Progression
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Measures authentic user progression from viewing rent obligations to Paystack checkout completion.
          </p>
        </div>

        {funnelSteps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            {loading ? 'Calculating conversion funnel...' : 'No session activity recorded for this period.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {funnelSteps.map((step, idx) => {
              // Never artificially inflate width when count is 0
              const widthPct = step.count > 0 && maxStepCount > 0
                ? Math.max(4, Math.round((step.count / maxStepCount) * 100))
                : 0

              const isLast = idx === funnelSteps.length - 1
              const hasActivity = step.count > 0

              return (
                <div key={step.step} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          background: hasActivity ? (isLast ? 'rgba(16, 185, 129, 0.12)' : 'var(--accent-faint)') : 'var(--surface-hover)',
                          color: hasActivity ? (isLast ? '#059669' : 'var(--accent)') : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                        }}
                      >
                        {step.step}
                      </span>
                      <span style={{ fontWeight: 700, color: hasActivity ? 'var(--text)' : 'var(--text-muted)' }}>
                        {step.name.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: hasActivity ? 'var(--text)' : 'var(--text-muted)' }}>
                        {step.count.toLocaleString()}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: hasActivity ? (isLast ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-hover)') : 'var(--surface-hover)',
                          color: hasActivity ? (isLast ? '#059669' : 'var(--text-secondary)') : 'var(--text-muted)',
                        }}
                      >
                        {hasActivity ? `${step.conversionRate}% retained` : '—'}
                      </span>
                      {step.dropOffRate > 0 && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--danger)',
                          }}
                        >
                          -{step.dropOffRate}% drop-off ({step.dropOffCount})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funnel Visual Track */}
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '999px',
                      background: 'var(--border)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {widthPct > 0 && (
                      <div
                        style={{
                          height: '100%',
                          width: `${widthPct}%`,
                          borderRadius: '999px',
                          background: isLast ? '#10b981' : 'var(--accent)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Breakdown Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Payment Leakage */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
              Payment Leakage Diagnostics
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block' }}>
                  Abandoned Without Paying
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  User opened Paystack but closed or dismissed checkout
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: (metrics?.paymentFunnel?.leakage?.dismissedWithoutPaying || 0) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {metrics?.paymentFunnel?.leakage?.dismissedWithoutPaying || 0}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block' }}>
                  Gateway Errors
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Card declines, insufficient funds, or gateway timeouts
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: (metrics?.paymentFunnel?.leakage?.failedWithErrors || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {metrics?.paymentFunnel?.leakage?.failedWithErrors || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Drop-off by Stage Breakdown */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
              Top Drop-off Stages
            </span>
          </div>

          {(!metrics?.dropOffBreakdown || metrics.dropOffBreakdown.length === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-hover)',
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
            padding: '20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
              Top Locations
            </span>
          </div>

          {(!metrics?.topLocations || metrics.topLocations.length === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-hover)',
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
