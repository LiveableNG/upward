import { useState, useEffect, useMemo } from 'react'
import {
  FlaskConical,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Search,
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface VariantMetric {
  variant: string
  assignedCount: number
  exposedCount: number
  viewedCount: number
  startedCount: number
  completedCount: number
  deferredCount: number
  dashboardEnteredCount: number
  activated7dCount: number
  recoveredCount: number
  avgTimeToCompleteMinutes: number | null
  completionRate: number
  ittCompletionRate: number
  activation7dRate: number
  deferralRate: number
  recoveryRate: number
  dropOffRate: number
}

interface FunnelStage {
  step: number
  name: string
  requiredCount: number
  requiredPct: number
  deferrableCount: number
  deferrablePct: number
}

interface ExperimentParticipant {
  userKey: string
  userEmail?: string | null
  variant: string
  isFallback: boolean
  assignedAt: string
  exposedAt?: string | null
  completedAt?: string | null
  deferredAt?: string | null
  activatedAt?: string | null
  status: 'COMPLETED' | 'DEFERRED' | 'IN_PROGRESS' | 'EXPOSED' | 'ASSIGNED'
}

interface RentalExperimentStatsResponse {
  experimentKey: string
  dateRange: {
    startDate: string
    endDate: string
  }
  summary: {
    totalAssigned: number
    totalExposed: number
    totalCompleted: number
    totalActivated7d: number
    fallbackCount: number
    overallCompletionRate: number
    overallActivationRate: number
    dataFreshness: string
  }
  variants: {
    required: VariantMetric
    deferrable: VariantMetric
    fallback: VariantMetric
  }
  funnel: FunnelStage[]
  participants: ExperimentParticipant[]
}

interface RentalOnboardingExperimentProps {
  token: string
  adminRole?: string
}

function calculateDelta(valB: number, valA: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (valA === 0) return { pct: 0, dir: 'flat' }
  const pct = Math.round(((valB - valA) / valA) * 100)
  return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

export default function RentalOnboardingExperiment({ token }: RentalOnboardingExperimentProps) {
  const [data, setData] = useState<RentalExperimentStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRangeDays, setDateRangeDays] = useState<number>(30)
  const [participantFilter, setParticipantFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const end = new Date()
      const start = new Date(end.getTime() - dateRangeDays * 24 * 60 * 60 * 1000)
      const res = await apiService.get(
        `/admin/experiments/rental-onboarding?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        token,
      )
      setData(res)
    } catch (err: any) {
      console.error('Failed to load experiment data:', err)
      setError(err?.message || 'Failed to fetch experiment telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token, dateRangeDays])

  const req = data?.variants.required
  const def = data?.variants.deferrable

  const activationDelta = useMemo(() => {
    if (!req || !def) return { pct: 0, dir: 'flat' as const }
    return calculateDelta(def.activation7dRate, req.activation7dRate)
  }, [req, def])

  const completionDelta = useMemo(() => {
    if (!req || !def) return { pct: 0, dir: 'flat' as const }
    return calculateDelta(def.completionRate, req.completionRate)
  }, [req, def])

  const filteredParticipants = useMemo(() => {
    if (!data?.participants) return []
    return data.participants.filter((p) => {
      const matchesFilter =
        participantFilter === 'all' ||
        (participantFilter === 'required' && p.variant === 'required-rental') ||
        (participantFilter === 'deferrable' && p.variant === 'deferrable-rental') ||
        (participantFilter === 'fallback' && p.isFallback)

      const matchesSearch =
        !searchQuery ||
        (p.userEmail && p.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.userKey.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [data?.participants, participantFilter, searchQuery])

  return (
    <div className="page-container" style={{ paddingBottom: '60px' }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FlaskConical size={20} />
              </div>
              <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 800 }}>
                Rental Onboarding A/B Experiment
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'var(--success-faint)',
                  color: 'var(--success)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: 'var(--success)',
                    display: 'inline-block',
                  }}
                />
                Active Experiment
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '780px', lineHeight: 1.5 }}>
              Determining whether requiring rental details immediately after signup (Variant A: Required) or allowing users to defer setup (Variant B: Deferrable) leads to higher 7-day core activation in UpwardPay.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
              }}
            >
              {[
                { label: '7D', days: 7 },
                { label: '14D', days: 14 },
                { label: '30D', days: 30 },
                { label: '90D', days: 90 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDateRangeDays(opt.days)}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: dateRangeDays === opt.days ? 'var(--accent)' : 'transparent',
                    color: dateRangeDays === opt.days ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            background: 'var(--danger-faint)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <AlertTriangle size={20} />
          <div style={{ flex: 1, fontSize: '13.5px' }}>{error}</div>
          <button
            type="button"
            onClick={fetchData}
            style={{
              padding: '6px 12px',
              background: 'var(--danger)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Aggregating experiment telemetry from event bus...</p>
        </div>
      ) : (
        <>
          {/* Section 1: Overview Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Enrolled Users
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>
                {(data?.summary.totalAssigned || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                50/50 target allocation
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Exposed Users
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>
                {(data?.summary.totalExposed || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {data?.summary.totalAssigned
                  ? Math.round(((data.summary.totalExposed || 0) / data.summary.totalAssigned) * 100)
                  : 0}
                % exposure rate
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Overall Completion Rate
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>
                {data?.summary.overallCompletionRate ?? 0}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {(data?.summary.totalCompleted || 0).toLocaleString()} completed
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                7-Day Core Activation
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>
                {data?.summary.overallActivationRate ?? 0}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {(data?.summary.totalActivated7d || 0).toLocaleString()} activated within 7d
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Safe Fallbacks
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>
                {(data?.summary.fallbackCount || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Excluded from ITT comparison
              </div>
            </div>
          </div>

          {/* Section 2: Variant Comparison (Side-by-Side) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Variant A Card */}
            <div
              className="card"
              style={{
                padding: '24px',
                borderTop: '4px solid #d97757',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97757', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Variant A (Control)
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '2px 0 0' }}>
                    Required Rental Setup
                  </h3>
                </div>
                <span
                  style={{
                    padding: '3px 8px',
                    background: 'var(--surface-hover)',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Gated Dashboard
                </span>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '18px' }}>
                Users must provide address, lease dates, and rent amount before accessing dashboard tools.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>7-Day Activation Rate</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                    {req?.activation7dRate ?? 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {req?.activated7dCount ?? 0} / {req?.assignedCount ?? 0} assigned
                  </div>
                </div>

                <div style={{ background: 'var(--surface-hover)', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Setup Completion Rate</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                    {req?.completionRate ?? 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {req?.completedCount ?? 0} / {req?.exposedCount ?? 0} exposed
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Enrolled Participants:</span>
                  <strong>{req?.assignedCount ?? 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Actually Exposed:</span>
                  <strong>{req?.exposedCount ?? 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Form Drop-Off Rate:</span>
                  <strong style={{ color: 'var(--danger)' }}>{req?.dropOffRate ?? 0}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Time to Complete:</span>
                  <strong>{req?.avgTimeToCompleteMinutes !== null ? `${req?.avgTimeToCompleteMinutes} min` : '—'}</strong>
                </div>
              </div>
            </div>

            {/* Variant B Card */}
            <div
              className="card"
              style={{
                padding: '24px',
                borderTop: '4px solid #6366f1',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Variant B (Test)
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '2px 0 0' }}>
                    Deferrable Rental Setup
                  </h3>
                </div>
                <span
                  style={{
                    padding: '3px 8px',
                    background: 'var(--surface-hover)',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Do This Later Action
                </span>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '18px' }}>
                Users can skip setup, explore the dashboard immediately, and resume saved drafts later.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>7-Day Activation Rate</span>
                    {activationDelta.dir !== 'flat' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: activationDelta.dir === 'up' ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {activationDelta.dir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {activationDelta.pct}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                    {def?.activation7dRate ?? 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {def?.activated7dCount ?? 0} / {def?.assignedCount ?? 0} assigned
                  </div>
                </div>

                <div style={{ background: 'var(--surface-hover)', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Setup Completion Rate</span>
                    {completionDelta.dir !== 'flat' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: completionDelta.dir === 'up' ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {completionDelta.dir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {completionDelta.pct}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                    {def?.completionRate ?? 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {def?.completedCount ?? 0} / {def?.exposedCount ?? 0} exposed
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Initial Deferral Rate:</span>
                  <strong style={{ color: '#6366f1' }}>{def?.deferralRate ?? 0}% ({def?.deferredCount ?? 0})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Deferral Recovery Rate:</span>
                  <strong style={{ color: 'var(--success)' }}>{def?.recoveryRate ?? 0}% ({def?.recoveredCount ?? 0} recovered)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Form Drop-Off Rate:</span>
                  <strong>{def?.dropOffRate ?? 0}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Time to Complete:</span>
                  <strong>{def?.avgTimeToCompleteMinutes !== null ? `${def?.avgTimeToCompleteMinutes} min` : '—'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Funnel Progression Visualization */}
          <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Onboarding Funnel Comparison
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Progressive user flow from assignment to 7-day verified core activation.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#d97757' }} />
                  <span>Required (A)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#6366f1' }} />
                  <span>Deferrable (B)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {(data?.funnel || []).map((stage) => (
                <div key={stage.step}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                      {stage.step}. {stage.name}
                    </span>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ color: '#d97757' }}>
                        {stage.requiredCount.toLocaleString()} ({stage.requiredPct}%)
                      </span>
                      <span style={{ color: '#6366f1' }}>
                        {stage.deferrableCount.toLocaleString()} ({stage.deferrablePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Dual comparative bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: '7px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, stage.requiredPct)}%`,
                          height: '100%',
                          background: '#d97757',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div style={{ height: '7px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, stage.deferrablePct)}%`,
                          height: '100%',
                          background: '#6366f1',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Deferral Recovery Branch Callout */}
            <div
              style={{
                marginTop: '22px',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="#6366f1" />
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Deferral Recovery Branch (Variant B):</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Out of {def?.deferredCount ?? 0} users who chose &quot;Do this later&quot;,{' '}
                    <strong>{def?.recoveredCount ?? 0} ({def?.recoveryRate ?? 0}%)</strong> subsequently resumed and completed rental setup.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Interpretation Guidelines */}
          <div
            className="card"
            style={{
              padding: '18px 20px',
              background: 'var(--accent-faint)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '28px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <Info size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text)' }}>Experiment Analysis & Decision Protocol:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>
                  <strong>Primary Metric:</strong> 7-Day Core Activation Rate under Intention-To-Treat (ITT). Both variants are evaluated based on their original assignment.
                </li>
                <li>
                  <strong>Sample Ratio Imbalance:</strong> Check that assignments stay near the target 50/50 allocation. Significant divergence indicates upstream assignment or gating anomalies.
                </li>
                <li>
                  <strong>Outcome Maturity:</strong> Participants enrolled fewer than 7 days ago have immature outcome windows. Avoid declaring a winner based on early incomplete windows.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 5: User-Level Telemetry Drilldown */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Recent Participant Journeys
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Audited participants from the telemetry pipeline for verification and diagnostic inspection.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by email or key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '7px 10px 7px 30px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '12px',
                      outline: 'none',
                      width: '220px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-hover)', padding: '3px', borderRadius: '8px' }}>
                  {(['all', 'required', 'deferrable', 'fallback'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setParticipantFilter(filter)}
                      style={{
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        background: participantFilter === filter ? 'var(--surface)' : 'transparent',
                        color: participantFilter === filter ? 'var(--text)' : 'var(--text-muted)',
                        boxShadow: participantFilter === filter ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>User Key / Email</th>
                    <th style={{ padding: '10px 12px' }}>Variant</th>
                    <th style={{ padding: '10px 12px' }}>Assigned</th>
                    <th style={{ padding: '10px 12px' }}>Exposed</th>
                    <th style={{ padding: '10px 12px' }}>Setup Status</th>
                    <th style={{ padding: '10px 12px' }}>7D Activation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No participants match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p, idx) => {
                      const isReq = p.variant === 'required-rental'
                      return (
                        <tr
                          key={p.userKey + idx}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {p.userEmail || p.userKey}
                            </div>
                            {p.userEmail && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {p.userKey}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isReq ? 'rgba(217, 119, 87, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                color: isReq ? '#d97757' : '#6366f1',
                              }}
                            >
                              {p.variant}
                            </span>
                            {p.isFallback && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'var(--warning-faint)',
                                  color: 'var(--warning)',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                }}
                              >
                                FALLBACK
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {new Date(p.assignedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {p.exposedAt ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background:
                                  p.status === 'COMPLETED'
                                    ? 'var(--success-faint)'
                                    : p.status === 'DEFERRED'
                                      ? 'rgba(99, 102, 241, 0.1)'
                                      : 'var(--surface-hover)',
                                color:
                                  p.status === 'COMPLETED'
                                    ? 'var(--success)'
                                    : p.status === 'DEFERRED'
                                      ? '#6366f1'
                                      : 'var(--text-secondary)',
                              }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {p.activatedAt ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: 'var(--success)',
                                  fontWeight: 700,
                                  fontSize: '11.5px',
                                }}
                              >
                                <CheckCircle2 size={13} />
                                Activated
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                                Not yet
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
