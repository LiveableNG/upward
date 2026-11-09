import React from 'react'
import {
  Plus,
  Search,
  Store,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Mail,
  Phone,
  Globe,
} from 'lucide-react'
import {
  DataTable,
  type ColumnDef,
  type ActionItem,
} from '../../../components/common/table/DataTable'
import type { CommerceVendor } from '../types'

interface VendorsTabProps {
  vendors: CommerceVendor[]
  isLoading: boolean
  search: string
  onSearchChange: (val: string) => void
  activeFilter: boolean | undefined
  onActiveFilterChange: (act: boolean | undefined) => void
  onNewVendor: () => void
  onEditVendor: (vendor: CommerceVendor) => void
  onDeleteVendor: (vendor: CommerceVendor) => void
  onToggleActive: (vendor: CommerceVendor) => void
}

export const VendorsTab: React.FC<VendorsTabProps> = ({
  vendors,
  isLoading,
  search,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  onNewVendor,
  onEditVendor,
  onDeleteVendor,
  onToggleActive,
}) => {
  const columns: ColumnDef<CommerceVendor>[] = [
    {
      key: 'name',
      label: 'Vendor / Partner',
      render: (vendor) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
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
            {vendor.logoUrl ? (
              <img
                src={vendor.logoUrl}
                alt={vendor.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Store size={18} color="var(--accent)" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{vendor.name}</span>
              {vendor.isVerified && (
                <span title="Verified Commerce Partner">
                  <ShieldCheck size={14} color="#10b981" />
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              /{vendor.slug} {vendor.legalName && `• ${vendor.legalName}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact Details',
      render: (vendor) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
          {vendor.email && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
              }}
            >
              <Mail size={12} color="var(--text-muted)" />
              <span>{vendor.email}</span>
            </div>
          )}
          {vendor.phone && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
              }}
            >
              <Phone size={12} color="var(--text-muted)" />
              <span>{vendor.phone}</span>
            </div>
          )}
          {vendor.website && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={12} color="var(--text-muted)" />
              <a
                href={
                  vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`
                }
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                {vendor.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'settlement',
      label: 'Settlement Account',
      render: (vendor) => (
        <div>
          {vendor.bankName && vendor.accountNumber ? (
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                {vendor.bankName} • {vendor.accountNumber}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {vendor.accountName || '—'}
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not configured</span>
          )}
        </div>
      ),
    },
    {
      key: 'offeringsCount',
      label: 'Offerings',
      width: '100px',
      align: 'center',
      render: (vendor) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--surface-hover)',
            color: 'var(--text)',
          }}
        >
          {vendor._count?.offerings ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (vendor) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleActive(vendor)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: vendor.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            color: vendor.isActive ? '#10b981' : '#64748b',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Click to toggle active status"
        >
          {vendor.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{vendor.isActive ? 'Active' : 'Inactive'}</span>
        </button>
      ),
    },
  ]

  const rowActions = (vendor: CommerceVendor): ActionItem<CommerceVendor>[] => [
    {
      label: 'Edit Vendor',
      icon: <Edit2 size={14} />,
      onClick: () => onEditVendor(vendor),
    },
    {
      label: 'Delete Vendor',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onDeleteVendor(vendor),
    },
  ]

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
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}
        >
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
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <select
            className="input"
            value={activeFilter === undefined ? '' : String(activeFilter)}
            onChange={(e) => {
              const val = e.target.value
              onActiveFilterChange(val === '' ? undefined : val === 'true')
            }}
            style={{ width: '150px', height: '40px' }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={onNewVendor}
          className="btn btn-primary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Onboard Vendor</span>
        </button>
      </div>

      {/* Vendors DataTable */}
      <DataTable
        data={vendors}
        columns={columns}
        keyExtractor={(vendor) => String(vendor.id)}
        isLoading={isLoading}
        rowActions={rowActions}
        emptyIcon={<Store size={36} color="var(--text-muted)" />}
        emptyTitle="No Commerce Vendors"
        emptyDescription="Onboard furniture artisans, fitness partners, or merchants to fulfill tenant lifestyle goals."
      />
    </div>
  )
}
