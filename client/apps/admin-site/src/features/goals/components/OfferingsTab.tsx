import React from 'react'
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  Boxes,
  CheckCircle2,
  XCircle,
  Truck,
  Star,
} from 'lucide-react'
import { DataTable, type ColumnDef, type ActionItem } from '../../../components/common/table/DataTable'
import type { Offering, CommerceVendor, OfferingType } from '../types'

interface OfferingsTabProps {
  offerings: Offering[]
  vendors: CommerceVendor[]
  totalOfferings: number
  currentPage: number
  onPageChange: (page: number) => void
  search: string
  onSearchChange: (val: string) => void
  typeFilter: OfferingType | undefined
  onTypeFilterChange: (type: OfferingType | undefined) => void
  vendorFilter: number | undefined
  onVendorFilterChange: (vendorId: number | undefined) => void
  publishedFilter: boolean | undefined
  onPublishedFilterChange: (pub: boolean | undefined) => void
  isLoading: boolean
  onNewOffering: () => void
  onEditOffering: (offering: Offering) => void
  onManagePackageItems: (offering: Offering) => void
  onDeleteOffering: (offering: Offering) => void
  onTogglePublish: (offering: Offering) => void
}

export const OfferingsTab: React.FC<OfferingsTabProps> = ({
  offerings,
  vendors,
  totalOfferings,
  currentPage,
  onPageChange,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  vendorFilter,
  onVendorFilterChange,
  publishedFilter,
  onPublishedFilterChange,
  isLoading,
  onNewOffering,
  onEditOffering,
  onManagePackageItems,
  onDeleteOffering,
  onTogglePublish,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalOfferings / 20))

  const formatPrice = (price: number, currency = 'NGN') => {
    const symbol = currency === 'NGN' ? '₦' : '$'
    return `${symbol}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
  }

  const columns: ColumnDef<Offering>[] = [
    {
      key: 'title',
      label: 'Offering Title',
      render: (offering) => {
        const coverMedia = offering.media?.find((m) => m.isCover) || offering.media?.[0]
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {coverMedia?.url ? (
                <img
                  src={coverMedia.url}
                  alt={offering.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Package size={18} color="var(--text-muted)" />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{offering.title}</span>
                {offering.isFeatured && (
                  <span title="Featured Offering">
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                /{offering.slug}
                {offering.isDeliverable && (
                  <span style={{ marginLeft: '6px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <Truck size={11} /> Deliverable
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'type',
      label: 'Type',
      width: '150px',
      render: (offering) => {
        const typeConfig: Record<OfferingType, { label: string; bg: string; color: string }> = {
          PRODUCT: { label: 'Product', bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
          SERVICE_INDIVIDUAL: { label: 'Service', bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
          SERVICE_PACKAGE: { label: 'Bundle Package', bg: 'rgba(217, 119, 87, 0.1)', color: 'var(--accent)' },
        }
        const conf = typeConfig[offering.type] || { label: offering.type, bg: 'var(--surface-hover)', color: 'var(--text)' }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '8px',
                background: conf.bg,
                color: conf.color,
              }}
            >
              {conf.label}
            </span>
            {offering.type === 'SERVICE_PACKAGE' && (
              <button
                onClick={() => onManagePackageItems(offering)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  padding: '2px',
                }}
                title="Manage Package Components"
              >
                <Boxes size={14} />
              </button>
            )}
          </div>
        )
      },
    },
    {
      key: 'price',
      label: 'Price',
      width: '140px',
      render: (offering) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text)' }}>
            {formatPrice(offering.price, offering.currency)}
          </div>
          {offering.compareAtPrice && offering.compareAtPrice > offering.price && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {formatPrice(offering.compareAtPrice, offering.currency)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'vendor',
      label: 'Merchant / Vendor',
      render: (offering) => (
        <span style={{ fontSize: '13px', color: offering.vendor ? 'var(--text)' : 'var(--text-muted)' }}>
          {offering.vendor?.name || 'Direct / Platform'}
        </span>
      ),
    },
    {
      key: 'goals',
      label: 'Linked Goal(s)',
      width: '170px',
      render: (offering) => {
        const links = offering.goalLinks || []
        if (links.length === 0) {
          return (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Not linked to a goal
            </span>
          )
        }
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {links.map((link, idx) => (
              <span
                key={link.id || idx}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(217, 119, 87, 0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(217, 119, 87, 0.25)',
                }}
              >
                {link.goal?.title || `Goal #${link.goalId}`}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (offering) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePublish(offering)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: offering.isPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            color: offering.isPublished ? '#10b981' : '#64748b',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Click to toggle publish status"
        >
          {offering.isPublished ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{offering.isPublished ? 'Published' : 'Draft'}</span>
        </button>
      ),
    },
  ]

  const rowActions = (offering: Offering): ActionItem<Offering>[] => {
    const actions: ActionItem<Offering>[] = [
      {
        label: 'Edit Offering',
        icon: <Edit2 size={14} />,
        onClick: () => onEditOffering(offering),
      },
    ]

    if (offering.type === 'SERVICE_PACKAGE') {
      actions.push({
        label: 'Manage Package Items',
        icon: <Boxes size={14} />,
        onClick: () => onManagePackageItems(offering),
      })
    }

    actions.push({
      label: 'Delete Offering',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onDeleteOffering(offering),
    })

    return actions
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search offerings & bundles..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <select
            className="input"
            value={typeFilter ?? ''}
            onChange={(e) => onTypeFilterChange(e.target.value ? (e.target.value as OfferingType) : undefined)}
            style={{ width: '170px', height: '40px' }}
          >
            <option value="">All Offering Types</option>
            <option value="PRODUCT">Products</option>
            <option value="SERVICE_INDIVIDUAL">Individual Services</option>
            <option value="SERVICE_PACKAGE">Service Packages</option>
          </select>

          <select
            className="input"
            value={vendorFilter ?? ''}
            onChange={(e) => onVendorFilterChange(e.target.value ? Number(e.target.value) : undefined)}
            style={{ width: '170px', height: '40px' }}
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={publishedFilter === undefined ? '' : String(publishedFilter)}
            onChange={(e) => {
              const val = e.target.value
              onPublishedFilterChange(val === '' ? undefined : val === 'true')
            }}
            style={{ width: '140px', height: '40px' }}
          >
            <option value="">All Statuses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>

        <button
          onClick={onNewOffering}
          className="btn btn-primary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>New Offering</span>
        </button>
      </div>

      {/* Offerings DataTable */}
      <DataTable
        data={offerings}
        columns={columns}
        keyExtractor={(offering) => String(offering.id)}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        rowActions={rowActions}
        emptyIcon={<Package size={36} color="var(--text-muted)" />}
        emptyTitle="No Offerings Found"
        emptyDescription="Create physical products (desks, ergonomic chairs), services (interior design, fitness coaches), or bundled lifestyle packages."
      />
    </div>
  )
}
