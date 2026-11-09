import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCcw, Plus, Package, Store } from 'lucide-react'

interface GoalManagementHeaderProps {
  onRefresh: () => void
  onNewGoal: () => void
  onNewOffering: () => void
  onNewVendor: () => void
  isRefreshing?: boolean
}

export const GoalManagementHeader: React.FC<GoalManagementHeaderProps> = ({
  onRefresh,
  onNewGoal,
  onNewOffering,
  onNewVendor,
  isRefreshing = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          to="/dashboard"
          className="btn btn-secondary"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="section-title" style={{ margin: 0 }}>
              Goal & Commerce Management
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--accent-faint)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-muted)',
              }}
            >
              LIFESTYLE SUBSYSTEM
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Configure lifestyle goals, product bundles, artisan packages, and verified commerce
            vendors
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onRefresh}
          className="btn btn-secondary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
          disabled={isRefreshing}
          title="Refresh Data"
        >
          <RefreshCcw size={16} className={isRefreshing ? 'loader' : ''} />
          <span>Refresh</span>
        </button>

        <button
          onClick={onNewVendor}
          className="btn btn-secondary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Store size={16} />
          <span>+ Vendor</span>
        </button>

        <button
          onClick={onNewOffering}
          className="btn btn-secondary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Package size={16} />
          <span>+ Offering</span>
        </button>

        <button
          onClick={onNewGoal}
          className="btn btn-primary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>+ New Goal</span>
        </button>
      </div>
    </div>
  )
}
