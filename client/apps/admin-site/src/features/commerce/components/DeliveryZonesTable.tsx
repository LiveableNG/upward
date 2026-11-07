import React, { useState, useMemo } from 'react'
import {
  MapPin,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { DataTable, type ColumnDef } from '../../../components/common/table/DataTable'
import { ConfirmModal } from '../../../components/common/modal/ConfirmModal'
import type { AdminDeliveryZone } from '../types'
import { DeliveryZoneModal } from './DeliveryZoneModal'
import { PauseZoneModal } from './PauseZoneModal'

interface DeliveryZonesTableProps {
  zones: AdminDeliveryZone[]
  isLoading: boolean
  onRefresh: () => void
  onCreateZone: (data: any) => Promise<any>
  onUpdateZone: (uuid: string, data: any) => Promise<any>
  onToggleZone: (uuid: string, isDelivering: boolean, pauseReason?: string) => Promise<any>
  onDeleteZone: (uuid: string) => Promise<void>
}

function formatNgn(amountKobo: string | number | bigint): string {
  const kobo = typeof amountKobo === 'string' ? BigInt(amountKobo || '0') : BigInt(amountKobo)
  const ngn = Number(kobo / 100n)
  if (ngn === 0) return 'Free Delivery'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(ngn)
}

export const DeliveryZonesTable: React.FC<DeliveryZonesTableProps> = ({
  zones,
  isLoading,
  onRefresh,
  onCreateZone,
  onUpdateZone,
  onToggleZone,
  onDeleteZone,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<AdminDeliveryZone | null>(null)
  const [togglingUuid, setTogglingUuid] = useState<string | null>(null)
  const [pausingZone, setPausingZone] = useState<AdminDeliveryZone | null>(null)
  const [deletingZone, setDeletingZone] = useState<AdminDeliveryZone | null>(null)

  // Unique states list for filter dropdown
  const uniqueStates = useMemo(() => {
    const set = new Set<string>()
    zones.forEach((z) => {
      if (z.state) set.add(z.state)
    })
    return Array.from(set).sort()
  }, [zones])

  // Filtered zones
  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      if (stateFilter !== 'ALL' && zone.state !== stateFilter) {
        return false
      }
      if (statusFilter === 'ACTIVE' && !zone.isDelivering) {
        return false
      }
      if (statusFilter === 'PAUSED' && zone.isDelivering) {
        return false
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchName = zone.name?.toLowerCase().includes(query)
        const matchTag = zone.tag?.toLowerCase().includes(query)
        const matchState = zone.state?.toLowerCase().includes(query)
        const matchAreas = zone.areasCovered?.toLowerCase().includes(query)
        return matchName || matchTag || matchState || matchAreas
      }
      return true
    })
  }, [zones, stateFilter, statusFilter, searchTerm])

  const handleOpenCreate = () => {
    setEditingZone(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (zone: AdminDeliveryZone) => {
    setEditingZone(zone)
    setIsModalOpen(true)
  }

  const handleSaveModal = async (formData: any) => {
    if (editingZone) {
      const { tag, uuid, id, ...cleanUpdateData } = formData
      await onUpdateZone(editingZone.uuid, cleanUpdateData)
    } else {
      await onCreateZone(formData)
    }
  }

  const handleToggle = async (zone: AdminDeliveryZone) => {
    if (zone.isDelivering) {
      // Open PauseZoneModal so admin can enter tenant notice/reason cleanly without browser prompt
      setPausingZone(zone)
    } else {
      // Resuming delivery immediately
      try {
        setTogglingUuid(zone.uuid)
        await onToggleZone(zone.uuid, true)
      } finally {
        setTogglingUuid(null)
      }
    }
  }

  const handleConfirmPause = async (reason: string) => {
    if (!pausingZone) return
    try {
      setTogglingUuid(pausingZone.uuid)
      await onToggleZone(pausingZone.uuid, false, reason)
    } finally {
      setTogglingUuid(null)
      setPausingZone(null)
    }
  }

  const handleDelete = (zone: AdminDeliveryZone) => {
    setDeletingZone(zone)
  }

  const handleConfirmDelete = async () => {
    if (!deletingZone) return
    try {
      await onDeleteZone(deletingZone.uuid)
    } finally {
      setDeletingZone(null)
    }
  }

  const columns: ColumnDef<AdminDeliveryZone>[] = [
    {
      key: 'zoneInfo',
      label: 'Delivery Zone & Coverage',
      render: (zone) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: zone.isDelivering ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: zone.isDelivering ? '#059669' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <MapPin size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
              {zone.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'var(--bg-subtle, #f3f4f6)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: 'var(--text-muted)',
                }}
              >
                {zone.tag}
              </span>
              {zone.region && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Region: <strong>{zone.region}</strong>
                </span>
              )}
            </div>
            {zone.areasCovered && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                  maxWidth: '380px',
                  whiteSpace: 'normal',
                  lineHeight: 1.4,
                }}
              >
                {zone.areasCovered}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'state',
      label: 'State / Territory',
      render: (zone) => (
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#F0F9FF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
            }}
          >
            {zone.state}
          </span>
        </div>
      ),
    },
    {
      key: 'deliveryStatus',
      label: 'Live Operations Status',
      render: (zone) => {
        return (
          <div>
            {zone.isDelivering ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                }}
              >
                <CheckCircle size={13} />
                Delivering
              </span>
            ) : (
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#FEF2F2',
                    color: '#991B1B',
                    border: '1px solid #FECACA',
                  }}
                >
                  <XCircle size={13} />
                  Suspended
                </span>
                {zone.pauseReason && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#B91C1C',
                      marginTop: '4px',
                      maxWidth: '220px',
                      whiteSpace: 'normal',
                      lineHeight: 1.3,
                    }}
                  >
                    {zone.pauseReason}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'slaAndFee',
      label: 'SLA & Base Fee',
      render: (zone) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
            {formatNgn(zone.deliveryFeeKobo)}
          </div>
          {zone.estimatedDeliveryDays && (
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '3px',
              }}
            >
              <Clock size={12} />
              {zone.estimatedDeliveryDays}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (zone) => {
        const isToggling = togglingUuid === zone.uuid
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleToggle(zone)}
              disabled={isToggling}
              title={zone.isDelivering ? 'Pause delivery to this zone' : 'Resume delivery to this zone'}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: zone.isDelivering ? '#FEE2E2' : '#DCFCE7',
                color: zone.isDelivering ? '#991B1B' : '#166534',
                border: 'none',
                cursor: isToggling ? 'not-allowed' : 'pointer',
              }}
            >
              {zone.isDelivering ? (
                <>
                  <ToggleRight size={15} /> Pause
                </>
              ) : (
                <>
                  <ToggleLeft size={15} /> Resume
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleOpenEdit(zone)}
              title="Edit Zone Details"
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <Edit2 size={14} />
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleDelete(zone)}
              title="Delete Zone"
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #FCA5A5',
                background: '#FEF2F2',
                color: '#DC2626',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--surface)',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
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
              className="form-control"
              placeholder="Search by zone, state, tag or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '36px',
                fontSize: '13px',
                borderRadius: '8px',
                width: '100%',
              }}
            />
          </div>

          {/* State Filter */}
          <select
            className="form-control"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ fontSize: '13px', borderRadius: '8px', width: 'auto', minWidth: '130px' }}
          >
            <option value="ALL">All States ({zones.length})</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ fontSize: '13px', borderRadius: '8px', width: 'auto', minWidth: '130px' }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Currently Delivering</option>
            <option value="PAUSED">Suspended / Paused</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Zones"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            Add Delivery Zone
          </button>
        </div>
      </div>

      {/* Zones DataTable */}
      <DataTable
        data={filteredZones}
        columns={columns}
        keyExtractor={(zone) => zone.uuid}
        isLoading={isLoading}
        emptyIcon={<MapPin size={32} />}
        emptyTitle="No Delivery Zones Configured"
        emptyDescription={
          searchTerm || stateFilter !== 'ALL' || statusFilter !== 'ALL'
            ? 'No delivery coverage zones match your search or filter filters.'
            : 'Add state and regional delivery coverage zones to begin rolling out logistics.'
        }
      />

      {/* Modal for Create / Edit */}
      <DeliveryZoneModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        zone={editingZone}
      />

      {/* Modal for Pausing Delivery Coverage */}
      <PauseZoneModal
        isOpen={!!pausingZone}
        onClose={() => setPausingZone(null)}
        onConfirm={handleConfirmPause}
        zone={pausingZone}
      />

      {/* Modal for Deleting Delivery Coverage */}
      <ConfirmModal
        isOpen={!!deletingZone}
        title="Delete Delivery Zone"
        message={
          deletingZone
            ? `Are you sure you want to delete delivery zone "${deletingZone.name}" (${deletingZone.tag})? Customers in this location will no longer be matched to this zone.`
            : ''
        }
        danger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingZone(null)}
      />
    </div>
  )
}
