import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Target, Users, Package, Store, ArrowRight, RefreshCcw } from 'lucide-react'
import { apiService } from '../../../services/api.service'

interface LifestyleCommerceCardProps {
  token: string
}

interface GoalsOverviewData {
  totalCategories: number
  totalGoals: number
  activeUserGoals: number
  totalActiveUserGoals?: number
  uniqueTenantsWithGoals?: number
  totalOfferings: number
  publishedOfferings?: number
  totalVendors: number
  activeVendors?: number
}

export const LifestyleCommerceCard: React.FC<LifestyleCommerceCardProps> = ({ token }) => {
  const [data, setData] = useState<GoalsOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiService.get('/admin/goals/overview', token)
      if (res && res.data) {
        setData(res.data)
      }
    } catch (err: unknown) {
      console.warn('Could not load goals overview on dashboard:', err)
      setError('Unable to load lifestyle metrics')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  return (
    <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent-faint)',
                border: '1px solid var(--accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Target size={18} />
            </div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', color: 'var(--text)' }}>
              Lifestyle Goals & Commerce
            </h3>
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
              COMMERCE SUBSYSTEM
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Tenant lifestyle aspirations, product bundles, artisan packages, and verified merchants.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchOverview}
            className="btn btn-secondary"
            style={{ height: '36px', padding: '0 10px', color: 'var(--text-muted)' }}
            title="Refresh metrics"
            disabled={loading}
          >
            <RefreshCcw size={14} className={loading ? 'loader' : ''} />
          </button>
          <Link
            to="/tenant-goals"
            className="btn btn-secondary"
            style={{
              height: '36px',
              padding: '0 14px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Target size={14} />
            <span>Tenant Goals Insights</span>
          </Link>
          <Link
            to="/commerce"
            className="btn btn-primary"
            style={{
              height: '36px',
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Manage Commerce Hub</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                minHeight: '88px',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            background: 'var(--bg)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
          }}
        >
          {error}. <button onClick={fetchOverview} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Tile 1: Active Goals */}
          <Link
            to="/tenant-goals"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                ACTIVE TENANT GOALS
              </span>
              <Users size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
              {data?.activeUserGoals ?? data?.totalActiveUserGoals ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {data?.uniqueTenantsWithGoals != null
                ? `Across ${data.uniqueTenantsWithGoals} ${data.uniqueTenantsWithGoals === 1 ? 'tenant' : 'tenants'} · View breakdown`
                : 'Tenants actively pursuing lifestyle goals'}
            </div>
          </Link>

          {/* Tile 2: Published Offerings */}
          <Link
            to="/commerce/offerings"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1' }}>
                PUBLISHED OFFERINGS
              </span>
              <Package size={16} color="#6366f1" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
              {data?.publishedOfferings ?? data?.totalOfferings ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {data?.totalOfferings != null && data?.publishedOfferings != null && data.totalOfferings !== data.publishedOfferings
                ? `${data.totalOfferings} total configured offerings`
                : 'Products, services, and bundled packages'}
            </div>
          </Link>

          {/* Tile 3: Verified Vendors */}
          <Link
            to="/commerce/vendors"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                VERIFIED VENDORS
              </span>
              <Store size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
              {data?.activeVendors ?? data?.totalVendors ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {data?.totalVendors != null && data?.activeVendors != null && data.totalVendors !== data.activeVendors
                ? `${data.totalVendors} total merchants onboarded`
                : 'Approved merchants and artisan partners'}
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
