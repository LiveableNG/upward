import {
  GraduationCap,
  Building,
  Users,
  MapPin,
  Eye,
  Award,
  TrendingUp,
  Gift,
  UserCheck,
  Sparkles,
  Briefcase,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import type {
  UniversityTab,
  ApplicationStats,
  EarlyAccessStats,
  TrafficStats,
  UniversityReferralStats,
  UniversityHireRequestStats,
  UniversityApplicationRecord,
  UniversityReferralRecord,
  UniversityHireRequestRecord,
} from '../types'

interface UniversityStatCardsProps {
  activeTab: UniversityTab
  appStats: ApplicationStats | null
  applications: UniversityApplicationRecord[]
  loadingApps: boolean
  stats: EarlyAccessStats | null
  loadingStats: boolean
  trafficStats: TrafficStats | null
  loadingTrafficStats: boolean
  referralStats: UniversityReferralStats | null
  referrals: UniversityReferralRecord[]
  loadingReferralStats: boolean
  hireStats: UniversityHireRequestStats | null
  hireRequests: UniversityHireRequestRecord[]
  loadingHireStats: boolean
}

export const UniversityStatCards: React.FC<UniversityStatCardsProps> = ({
  activeTab,
  appStats,
  applications,
  loadingApps,
  stats,
  loadingStats,
  trafficStats,
  loadingTrafficStats,
  referralStats,
  referrals,
  loadingReferralStats,
  hireStats,
  hireRequests,
  loadingHireStats,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {activeTab === 'APPLICATIONS' ? (
        <>
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#8A4A2A', fontWeight: 700 }}>
                TOTAL COHORT APPS
              </span>
              <GraduationCap size={20} color="#8A4A2A" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
              {loadingApps ? '...' : appStats?.totalApplications ?? applications.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Full application submissions
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700 }}>
                PAID FEES (₦5,000)
              </span>
              <Building size={20} color="#15803d" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#166534' }}>
              {loadingApps
                ? '...'
                : (appStats?.feePaidCount ?? applications.filter((a) => a.feeStatus === 'PAID').length)}
            </div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
              Verified paid ₦5,000 application fee
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#fffbf5',
              border: '1px solid #fde68a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 700 }}>
                SCHOLARSHIP CANDIDATES
              </span>
              <Award size={20} color="#b45309" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#92400e' }}>
              {loadingApps
                ? '...'
                : applications.filter((a) => a.isScholarship || a.scholarshipVideoUrl).length}
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontWeight: 500 }}>
              Submitted video link for scholarship
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                ADMITTED COHORT
              </span>
              <Users size={20} color="var(--accent)" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
              {loadingApps
                ? '...'
                : (appStats?.admittedCount ?? applications.filter((a) => a.status === 'ADMITTED').length)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Admitted into 2026 Cohort
            </div>
          </div>
        </>
      ) : activeTab === 'EARLY_ACCESS' ? (
        <>
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                TOTAL LEADS
              </span>
              <Users size={20} color="var(--accent)" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
              {loadingStats ? '...' : stats?.totalSubmissions || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Combined roster leads
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#d97757', fontWeight: 600 }}>
                STUDENT COHORT LEADS
              </span>
              <GraduationCap size={20} color="#d97757" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
              {loadingStats ? '...' : stats?.studentCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats && stats.totalSubmissions > 0
                ? `${Math.round((stats.studentCount / stats.totalSubmissions) * 100)}% of total leads`
                : '2026 Cohort'}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                LANDLORD PROGRAMME LEADS
              </span>
              <Building size={20} color="#166534" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
              {loadingStats ? '...' : stats?.landlordCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats && stats.totalSubmissions > 0
                ? `${Math.round((stats.landlordCount / stats.totalSubmissions) * 100)}% of total leads`
                : 'Micro-course registrations'}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                TOP ACTIVE CITIES
              </span>
              <MapPin size={20} color="var(--accent)" />
            </div>
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {stats?.cityBreakdown && stats.cityBreakdown.length > 0 ? (
                stats.cityBreakdown.slice(0, 4).map((c) => (
                  <span
                    key={c.city}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary, #f3f4f6)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {c.city}: <b>{c.count}</b>
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No city data yet</span>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'HIRE_REQUESTS' ? (
        /* ── COMPANY HIRE REQUEST STATS ── */
        <>
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#8A4A2A', fontWeight: 700 }}>
                TOTAL EMPLOYER INQUIRIES
              </span>
              <Briefcase size={20} color="#8A4A2A" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#8A4A2A' }}>
              {loadingHireStats ? '...' : (hireStats?.totalRequests ?? hireRequests.length).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Companies seeking academy graduates
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#fffbf5',
              border: '1px solid #fde68a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 700 }}>
                PENDING CONTACT
              </span>
              <Clock size={20} color="#b45309" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#92400e' }}>
              {loadingHireStats ? '...' : (hireStats?.pendingRequests ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontWeight: 500 }}>
              Awaiting outreach from admissions team
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#1d4ed8', fontWeight: 700 }}>
                CONTACTED EMPLOYERS
              </span>
              <Users size={20} color="#1d4ed8" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#1e40af' }}>
              {loadingHireStats ? '...' : (hireStats?.contactedRequests ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#1d4ed8', marginTop: '4px', fontWeight: 500 }}>
              Requirements verified with hiring team
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700 }}>
                TALENT MATCHED
              </span>
              <CheckCircle2 size={20} color="#15803d" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#166534' }}>
              {loadingHireStats ? '...' : (hireStats?.matchedRequests ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
              Graduates introduced / hired
            </div>
          </div>
        </>
      ) : activeTab === 'TRAFFIC' ? (
        <>
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#8A4A2A', fontWeight: 700 }}>
                UNIQUE VISITORS
              </span>
              <Users size={20} color="#8A4A2A" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#8A4A2A' }}>
              {loadingTrafficStats ? '...' : (trafficStats?.uniqueViews ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Deduplicated organic & referral visitors
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                TOTAL PAGEVIEWS
              </span>
              <Eye size={20} color="var(--accent)" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
              {loadingTrafficStats ? '...' : (trafficStats?.totalViews ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total session hits across all sources
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700 }}>
                ATTRIBUTED CONVERSIONS
              </span>
              <Award size={20} color="#15803d" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#166534' }}>
              {loadingTrafficStats ? '...' : (trafficStats?.totalConversions ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
              Applications & lead form completions
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#fffbf5',
              border: '1px solid #fde68a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 700 }}>
                OVERALL CONVERSION RATE
              </span>
              <TrendingUp size={20} color="#b45309" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#92400e' }}>
              {loadingTrafficStats ? '...' : `${trafficStats?.overallConversionRate ?? 0}%`}
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontWeight: 500 }}>
              Conversions / unique visitors
            </div>
          </div>
        </>
      ) : (
        /* REFERRALS (10% Rewards) Stats Cards */
        <>
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#8A4A2A', fontWeight: 700 }}>
                RECOMMENDATIONS
              </span>
              <Gift size={20} color="#8A4A2A" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#8A4A2A' }}>
              {loadingReferralStats
                ? '...'
                : (referralStats?.totalReferrals ?? referrals.length).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Friends recommended by applicants
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700 }}>
                ELIGIBLE LEADS
              </span>
              <UserCheck size={20} color="#15803d" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#166534' }}>
              {loadingReferralStats
                ? '...'
                : (referralStats?.eligibleReferrals ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
              Verified new prospective students
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#1d4ed8', fontWeight: 700 }}>
                JOINED & ENROLLED
              </span>
              <GraduationCap size={20} color="#1d4ed8" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#1e40af' }}>
              {loadingReferralStats
                ? '...'
                : (referralStats?.joinedReferrals ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#1d4ed8', marginTop: '4px', fontWeight: 500 }}>
              Enrolled students paying tuition
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#7e22ce', fontWeight: 700 }}>
                10% REWARDS EARNED
              </span>
              <Sparkles size={20} color="#7e22ce" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#6b21a8' }}>
              {loadingReferralStats
                ? '...'
                : `₦${Number(referralStats?.totalRewardAmountEarned || 0).toLocaleString()}`}
            </div>
            <div style={{ fontSize: '12px', color: '#7e22ce', marginTop: '4px', fontWeight: 500 }}>
              Paid out: ₦{Number(referralStats?.totalRewardAmountPaid || 0).toLocaleString()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
