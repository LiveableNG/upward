import React from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  Package,
  Store,
  FolderTree,
  Truck,
  ShieldAlert,
  MapPin,
  ArrowRight,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Commerce KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
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
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
            {isLoading ? '...' : overview?.totalOfferings ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {overview?.publishedOfferings != null
              ? `${overview.publishedOfferings} published · Products, services & bundles`
              : 'Products, services, and bundled packages'}
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
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
            {isLoading ? '...' : overview?.totalVendors ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {overview?.activeVendors != null
              ? `${overview.activeVendors} active merchants & service partners`
              : 'Merchants and service partners'}
          </div>
        </div>

        <Link
          to="/commerce/orders"
          className="card"
          style={{ cursor: 'pointer', transition: 'var(--transition)', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#10b981' }}>
              COMMERCE ORDERS
            </span>
            <Truck size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#10b981' }}>
            {isLoading ? '...' : overview?.totalOrders ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {overview?.activeQuoteOrders
              ? `${overview.activeQuoteOrders} active service price ${overview.activeQuoteOrders === 1 ? 'request' : 'requests'}`
              : 'All product, package & service orders'}
          </div>
        </Link>

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
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
            {isLoading ? '...' : overview?.totalGoals ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {overview?.totalCategories ?? 0} lifestyle categories
          </div>
        </div>
      </div>

      {/* 2. Operations Shortcuts & Quick Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Operations & Tenant Goals Handoff */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Fulfilment &amp; Insights
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Jump straight to live operations or dedicated tenant goal setup analytics
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/commerce/orders"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 14px', height: 'auto', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={17} color="#10b981" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>Orders &amp; Fulfilment Desk</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Manage paid orders, service requests &amp; dispatches</div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" />
            </Link>

            <Link
              to="/commerce/disputes"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 14px', height: 'auto', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={17} color="#f59e0b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>Inquiries &amp; Disputes</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Resolve customer questions and fulfilment issues</div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" />
            </Link>

            <Link
              to="/commerce/zones"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 14px', height: 'auto', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={17} color="#6366f1" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>Delivery Coverage Zones</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Configure serviceable areas and delivery fees</div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" />
            </Link>

            <Link
              to="/tenant-goals"
              className="btn btn-secondary"
              style={{
                justifyContent: 'space-between',
                padding: '12px 14px',
                height: 'auto',
                textDecoration: 'none',
                borderColor: 'var(--accent-muted)',
                background: 'var(--accent-faint)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BarChart3 size={17} color="var(--accent)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>Tenant Goals Insights</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Dedicated page for tenant goals setup &amp; selection statistics
                  </div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--accent)" />
            </Link>
          </div>
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
              style={{ justifyContent: 'flex-start', padding: '14px', height: 'auto', textAlign: 'left' }}
            >
              <Target size={18} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ New Goal</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Publish life goal</div>
              </div>
            </button>

            <button
              onClick={onNewCategory}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '14px', height: 'auto', textAlign: 'left' }}
            >
              <FolderTree size={18} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ New Category</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>E.g. Home, Fitness</div>
              </div>
            </button>

            <button
              onClick={onNewOffering}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '14px', height: 'auto', textAlign: 'left' }}
            >
              <Package size={18} color="#6366f1" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ New Offering</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Product or bundle</div>
              </div>
            </button>

            <button
              onClick={onNewVendor}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '14px', height: 'auto', textAlign: 'left' }}
            >
              <Store size={18} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>+ Onboard Vendor</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Partner merchants</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Architectural Domain Isolation Intact</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 24px' }}>
              Lifestyle Goals and Commerce domains are fully decoupled from Alliance Property Marketplace and rent payment workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
