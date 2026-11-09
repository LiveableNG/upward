import React from 'react'
import { Target, Users, Package, Store, FolderTree, TrendingUp, ShieldCheck } from 'lucide-react'
import type { GoalsOverview, GoalTab } from '../types'

interface OverviewTabProps {
  overview: GoalsOverview | null
  isLoading: boolean
  onNavigateTab: (tab: GoalTab) => void
  onNewGoal: () => void
  onNewCategory: () => void
  onNewOffering: () => void
  onNewVendor: () => void
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  overview,
  isLoading,
  onNavigateTab,
  onNewGoal,
  onNewCategory,
  onNewOffering,
  onNewVendor,
}) => {
  const topGoals = overview?.topGoals || []
  const maxUserCount = Math.max(...topGoals.map((g) => g.userCount), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Stat Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          className="card"
          onClick={() => onNavigateTab('GOALS')}
          style={{ cursor: 'pointer', transition: 'var(--transition)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: 'var(--accent)' }}>
              CONFIGURED GOALS
            </span>
            <Target size={20} color="var(--accent)" />
          </div>
          <div
            style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}
          >
            {isLoading ? '...' : (overview?.totalGoals ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {overview?.totalCategories ?? 0} lifestyle categories
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#10b981' }}>
              ACTIVE USER ADOPTIONS
            </span>
            <Users size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#10b981' }}>
            {isLoading ? '...' : (overview?.activeUserGoals ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Tenants pursuing active lifestyle goals
          </div>
        </div>

        <div
          className="card"
          onClick={() => onNavigateTab('OFFERINGS')}
          style={{ cursor: 'pointer', transition: 'var(--transition)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#6366f1' }}>
              COMMERCE OFFERINGS
            </span>
            <Package size={20} color="#6366f1" />
          </div>
          <div
            style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}
          >
            {isLoading ? '...' : (overview?.totalOfferings ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Products, services, and bundled packages
          </div>
        </div>

        <div
          className="card"
          onClick={() => onNavigateTab('VENDORS')}
          style={{ cursor: 'pointer', transition: 'var(--transition)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#f59e0b' }}>
              COMMERCE VENDORS
            </span>
            <Store size={20} color="#f59e0b" />
          </div>
          <div
            style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}
          >
            {isLoading ? '...' : (overview?.totalVendors ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Artisans, fitness clubs, and merchants
          </div>
        </div>
      </div>

      {/* 2. Top Goals Analytics & Quick Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Top Goals Distribution */}
        <div className="card" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Top Goals Selected by Tenants
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Most popular lifestyle aspirations across the tenant base
              </p>
            </div>
            <TrendingUp size={20} color="var(--accent)" />
          </div>

          {topGoals.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No user goal selections recorded yet. Once tenants select goals during onboarding or
              from their dashboard, adoption distribution will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topGoals.map((item, index) => {
                const percent = Math.round((item.userCount / maxUserCount) * 100)
                return (
                  <div key={item.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {index + 1}. {item.title}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                        {item.userCount} {item.userCount === 1 ? 'tenant' : 'tenants'}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '4px',
                        background: 'var(--surface-hover)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          borderRadius: '4px',
                          background: 'var(--accent)',
                          transition: 'width 0.4s ease-out',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Management Shortcuts */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Subsystem Quick Actions
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 18px 0' }}>
            Fast configuration shortcuts for managing the lifestyle commerce catalog
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={onNewGoal}
              className="btn btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '14px',
                height: 'auto',
                textAlign: 'left',
              }}
            >
              <Target size={18} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ New Goal</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Publish life goal
                </div>
              </div>
            </button>

            <button
              onClick={onNewCategory}
              className="btn btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '14px',
                height: 'auto',
                textAlign: 'left',
              }}
            >
              <FolderTree size={18} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ New Category</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  E.g. Home, Fitness
                </div>
              </div>
            </button>

            <button
              onClick={onNewOffering}
              className="btn btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '14px',
                height: 'auto',
                textAlign: 'left',
              }}
            >
              <Package size={18} color="#6366f1" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ New Offering</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Product or bundle
                </div>
              </div>
            </button>

            <button
              onClick={onNewVendor}
              className="btn btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '14px',
                height: 'auto',
                textAlign: 'left',
              }}
            >
              <Store size={18} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ Onboard Vendor</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Partner merchants
                </div>
              </div>
            </button>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: '10px',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              <ShieldCheck size={16} color="#10b981" />
              <span>Architectural Domain Isolation Intact</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 24px' }}>
              Lifestyle Goals and Commerce domains are fully decoupled from Alliance Property
              Marketplace and rent payment workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
