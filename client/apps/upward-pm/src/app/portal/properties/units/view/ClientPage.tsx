'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  User,
  CreditCard,
  Calendar,
  Trash2,
  Save,
  Hash,
  PlusCircle,
  Clock,
  MapPin,
  Globe,
  MoreVertical,
  UserPlus,
  Unlink,
  Download,
  Edit
} from 'lucide-react'
import { useUnit, useUpdateUnit, useDeleteUnit, useUnitPayments, useUpdateUnitPayment, useAddUnitPayment } from '@/features/pm/hooks/useProperties'
import { usePaymentRequests, useCreatePaymentRequest } from '@/features/pm/hooks/usePayments'
import { useTenants, useTenantActions } from '@/features/pm/hooks/useTenants'
import { AssignTenantToUnitModal } from '@/features/pm/components/tenants/modals/AssignTenantToUnitModal'
import { TenantAssignmentSection } from '@/features/pm/components/tenants/TenantAssignmentSection'
import { EditRentRecordModal } from '@/features/pm/components/properties/modals/EditRentRecordModal'
import { AddRentRecordModal } from '@/features/pm/components/properties/modals/AddRentRecordModal'
import { RentHistoryEntryModeModal } from '@/features/pm/components/properties/modals/RentHistoryEntryModeModal'
import { CreatePaymentRequestModal } from '@/features/pm/components/payments/modals/CreatePaymentRequestModal'
import { Modal } from '@/components/ui/Modal/Modal'
import { EditUnitModal } from '@/features/pm/components/properties/modals/EditUnitModal'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { useToast } from '@/components/common/Toast'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { cn, formatCurrency, formatTenantName } from '@/lib/utils'
import { DetailSkeleton } from '@/components/skeletons'

function UnitDetailContent() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')
  const router = useRouter()
  const { success, error, info } = useToast()

  const { data: unit, isLoading } = useUnit(uuid as string)
  const { data: payments = [] } = useUnitPayments(uuid as string)
  const { data: allRequests = [] } = usePaymentRequests()
  const { data: tenants = [] } = useTenants()
  const { assignTenant, unassignTenant } = useTenantActions()

  const updateUnitMutation = useUpdateUnit()
  const deleteUnitMutation = useDeleteUnit()
  const updatePaymentMutation = useUpdateUnitPayment()
  const addPaymentMutation = useAddUnitPayment()
  const createPaymentRequestMutation = useCreatePaymentRequest()

  const [isEditRentModalOpen, setIsEditRentModalOpen] = useState(false)
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<any>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedRequestForEdit, setSelectedRequestForEdit] = useState<any>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEntryModeModalOpen, setIsEntryModeModalOpen] = useState(false)
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false)

  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [paymentContext, setPaymentContext] = useState<any>(null)

  const [formData, setFormData] = useState<any>({
    unitName: '',
    rentAmount: 0,
    rentType: 'Annually',
    status: 'VACANT',
    rentStartDate: '',
    rentDueDate: '',
    address: '',
    state: '',
    country: 'Nigeria',
    area: '',
  })

  useEffect(() => {
    if (unit) {
      setFormData({
        unitName: unit.unitName || '',
        rentAmount: unit.rentAmount || 0,
        rentType: unit.rentType || 'Annually',
        status: unit.status || 'VACANT',
        rentStartDate: unit.rentStartDate ? new Date(unit.rentStartDate).toISOString().split('T')[0] : '',
        rentDueDate: unit.rentDueDate ? new Date(unit.rentDueDate).toISOString().split('T')[0] : '',
        address: unit.property?.address || '',
        state: unit.property?.state || '',
        country: unit.property?.country || 'Nigeria',
        area: unit.property?.area || '',
      })
    }
  }, [unit])

  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'rent'>('overview')
  const [rentFilters, setRentFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all'
  })

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const lastPayment = payments[0] || null

  const unitRequests = allRequests.filter(r => r.unitId === unit?.id && r.tenantId === unit?.tenantId)
  const activeRequest = unitRequests.find(r => r.status !== 'PAID')
  const amountRemaining = activeRequest ? (activeRequest.amount - activeRequest.amountPaid) : 0

  useEffect(() => {
    if (isEditing && formData.rentStartDate && formData.rentType) {
      const start = new Date(formData.rentStartDate)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (formData.rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (formData.rentType === 'Annually' || formData.rentType === 'Yearly') {
        end.setFullYear(end.getFullYear() + 1)
      }

      end.setDate(end.getDate() - 1)

      const formattedEnd = end.toISOString().split('T')[0]
      if (formattedEnd !== formData.rentDueDate) {
        setFormData((prev: any) => ({ ...prev, rentDueDate: formattedEnd }))
      }
    }
  }, [formData.rentStartDate, formData.rentType, isEditing])

  if (isLoading || !unit) {
    return <DetailSkeleton />
  }

  const handleUpdate = (data: any) => {
    updateUnitMutation.mutate({
      uuid: uuid as string,
      data: data || formData
    }, {
      onSuccess: () => {
        success('Unit updated successfully')
        setIsEditModalOpen(false)
        setIsEditing(false)
      },
      onError: () => error('Failed to update unit')
    })
  }

  const handleUnassign = () => {
    if (unit?.tenant?.uuid) {
      unassignTenant.mutate({
        tenantUuid: unit.tenant.uuid,
        unitUuid: uuid as string
      }, {
        onSuccess: () => {
          setIsUnassignConfirmOpen(false)
          info('Tenant unassigned')
        },
        onError: () => error('Failed to unassign tenant')
      })
    }
  }

  const handleAssign = (tenantUuid: string) => {
    assignTenant.mutate({
      tenantUuid,
      unitUuid: uuid as string
    }, {
      onSuccess: () => {
        setIsAssignModalOpen(false)
        success('Tenant assigned successfully')
      },
      onError: () => error('Failed to assign tenant')
    })
  }

  const handleDelete = () => {
    deleteUnitMutation.mutate(uuid as string, {
      onSuccess: () => {
        success('Unit deleted')
        setIsDeleteConfirmOpen(false)
        router.back()
      },
      onError: () => error('Failed to delete unit')
    })
  }

  const addRentRecord = () => {
    setIsEntryModeModalOpen(true)
  }

  const handleManualEntry = () => {
    setIsEntryModeModalOpen(false)
    setIsAddRecordModalOpen(true)
  }

  const handleBulkEntry = () => {
    setIsEntryModeModalOpen(false)
    router.push(`/portal/properties/units/view/bulk-rent?uuid=${uuid}`)
  }

  const handleSaveNewPayment = (data: any) => {
    addPaymentMutation.mutate({
      unitUuid: uuid as string,
      data
    }, {
      onSuccess: () => {
        success('Rent record added successfully')
        setIsAddRecordModalOpen(false)
      },
      onError: (err: any) => {
        error(err.message || 'Failed to add rent record')
      }
    })
  }

  const requestRent = () => {
    if (!unit?.tenant) {
      error("No tenant assigned to this unit. Cannot request rent.")
      return
    }
    setSelectedRequestForEdit(null)
    setIsRequestModalOpen(true)
  }

  const handleEditPaymentRequest = (request: any) => {
    setSelectedRequestForEdit(request)
    setIsRequestModalOpen(true)
  }

  const handleProceedToEditor = (template: any, context: any) => {
    setEditingTemplate(template)
    setPaymentContext(context)
    setIsRequestModalOpen(false)
    setShowEditor(true)
  }

  const handleUpdatePayment = (data: any) => {
    if (!selectedRecordForEdit) return
    updatePaymentMutation.mutate({
      unitUuid: uuid as string,
      paymentUuid: selectedRecordForEdit.uuid,
      data
    }, {
      onSuccess: () => {
        success('Rent record updated successfully')
        setIsEditRentModalOpen(false)
        setSelectedRecordForEdit(null)
      },
      onError: (err: any) => {
        error(err.message || 'Failed to update rent record')
      }
    })
  }

  if (showEditor) {
    return (
      <div className="container" style={{ padding: '20px 0' }}>
        <DocumentEditorView
          initialTemplate={editingTemplate}
          initialRecipient={unit?.tenant ? {
            type: 'existing',
            uuid: unit.tenant.uuid,
            name: formatTenantName(unit.tenant),
            email: unit.tenant.email,
            deliveryMode: 'email'
          } : undefined}
          paymentContext={paymentContext}
          onBack={() => setShowEditor(false)}
        />
      </div>
    )
  }

  return (
    <div className="unit-detail animate-fade-in" style={{ padding: '24px 40px' }}>
      <header className="unit-detail__header" style={{ marginBottom: 24, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="btn btn--secondary btn--sm" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', padding: 0 }}>
            <ChevronLeft size={16} /> Back
          </button>

          <div className="unit-detail__actions" style={{ position: 'relative', display: 'flex', gap: 12 }}>
            <button className="btn btn--primary" onClick={() => setIsEditModalOpen(true)} style={{ borderRadius: 100, background: 'var(--forest)', color: 'white', border: 'none' }}>
              <Edit size={16} style={{ marginRight: 6 }} color="white" /> Edit Unit
            </button>

            <button
              className="btn btn--secondary"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <MoreVertical size={20} color="var(--text)" />
            </button>

            {isMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsMenuOpen(false)} />
                <div className="glass shadow-lg" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 220,
                  zIndex: 100, borderRadius: 12, padding: 8, border: '1px solid var(--border)'
                }}>
                  {unit?.tenant ? (
                    <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); setIsUnassignConfirmOpen(true) }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                      <Unlink size={16} color="var(--error)" /> Remove Tenant
                    </button>
                  ) : (
                    <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); setIsAssignModalOpen(true) }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                      <UserPlus size={16} color="var(--forest)" /> Assign Tenant
                    </button>
                  )}
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); setIsDeleteConfirmOpen(true) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--error)' }}>
                    <Trash2 size={16} /> Delete Unit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <h1 className="dashboard__title" style={{ marginBottom: 20 }}>About Unit</h1>

      <div style={{ background: '#ef4444', color: 'white', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 500 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>!</div>
        High Priority Note: Ensure unit details and tenant assignments are up to date.
      </div>

      <div style={{ background: '#fff0e6', padding: '24px', borderRadius: 8, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>Unit - {unit?.unitName}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{unit?.unitName}</span>
          <span className={`badge badge--${unit?.status?.toLowerCase() || 'vacant'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
            {unit?.status?.replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="unit-tabs" style={{ marginBottom: 32, display: 'flex', gap: 40, borderBottom: '1px solid var(--border)' }}>
        {['Overview', 'Rent History'].map(tab => {
          const tabKey = tab.toLowerCase().replace(' ', '') === 'renthistory' ? 'rent' : tab.toLowerCase().replace(' ', '');
          return (
            <button key={tab} className={cn("unit-tab", activeTab === tabKey && "unit-tab--active")}
              onClick={() => setActiveTab(tabKey as any)}
              style={{ padding: '12px 4px', fontSize: 14, fontWeight: 600, color: activeTab === tabKey ? 'var(--forest)' : 'var(--text-muted)', borderBottom: activeTab === tabKey ? '2px solid var(--forest)' : '2px solid transparent', transition: 'all 0.2s', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}>
              {tab}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ background: 'var(--ivory-dim)', border: '1px solid var(--border)', padding: '24px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ color: 'var(--forest)', marginTop: 4, fontSize: 20, fontWeight: 700 }}>↗</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>Automate Unit Payments</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 500 }}>Request rent from your tenant on this unit.</p>
              </div>
            </div>
            <button className="btn btn--primary" style={{ height: 48, padding: '0 24px', borderRadius: 12 }} onClick={requestRent}>Request Rent</button>
          </div>

          <div className="unit-detail__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#333' }}>Unit Information</h3>
              <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 16px' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Property</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{unit?.property?.name || 'N/A'}</div>
                    <a href={`/portal/properties/view?uuid=${unit?.property?.uuid}`} style={{ fontSize: 11, color: 'var(--info)', marginTop: 4, display: 'inline-block' }}>Go to property &gt;</a>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Unit Type</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.unitType || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Status</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: unit?.status === 'OCCUPIED' ? 'var(--success)' : 'var(--text-muted)' }}>{unit?.status?.replace('-', ' ') || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent Type</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.rentType || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Address</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.property?.address || 'N/A'}<br />{unit?.property?.area}, {unit?.property?.state}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Management Fee</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{formatCurrency(unit?.managementFee || 0, unit?.currency || 'NGN')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#333' }}>Occupancy</h3>
              <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
                {unit?.tenant ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>
                          {(unit.tenant.commercialName || unit.tenant.firstName || 'T')[0]?.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{formatTenantName(unit.tenant)}</div>
                      </div>
                      <button className="btn btn--secondary btn--sm" onClick={() => router.push(`/portal/tenants/view?uuid=${unit.tenant?.uuid}`)} style={{ borderRadius: 100, fontSize: 12 }}>
                        View Tenant
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 16px' }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{formatCurrency(unit?.rentAmount || 0, unit?.currency || 'NGN')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent Start</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.rentStartDate ? new Date(unit.rentStartDate).toDateString() : 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent End</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.rentDueDate ? new Date(unit.rentDueDate).toDateString() : 'N/A'}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: '#888' }}>
                    <TenantAssignmentSection unit={unit} onAssignClick={() => setIsAssignModalOpen(true)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'rent' && (
        <div className="unit-rent-view animate-fade-in" style={{ paddingBottom: 60 }}>
          <div style={{ background: 'var(--ivory-dim)', border: '1px solid var(--border)', padding: '24px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ color: 'var(--forest)', marginTop: 4, fontSize: 20, fontWeight: 700 }}>↗</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>Automate Unit Payments</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Request rent from your tenant on this unit.</p>
              </div>
            </div>
            <button className="btn btn--primary" style={{ height: 48, padding: '0 24px', borderRadius: 12 }} onClick={requestRent}>Request Rent</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 32 }}>
            <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Paid to Date</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--forest)' }}>{formatCurrency(totalPaid || 0, unit?.currency || 'NGN')}</div>
            </div>
            <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Outstanding Balance</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: amountRemaining > 0 ? 'var(--error)' : 'var(--forest)' }}>{formatCurrency(amountRemaining || 0, unit?.currency || 'NGN')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>Rent Payment History</h2>
            <button className="btn btn--primary" onClick={addRentRecord} style={{ borderRadius: 12, height: 42 }}>Enter Rent Payment</button>
          </div>

          <div className="rent-history glass" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--ivory-dim)' }}>
                <tr>
                  {['Tenant Name', 'Rent Period', 'Date Paid', 'Amount Paid', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '16px 24px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length > 0 ? (payments as any[]).map((row, index) => {
                  const samePeriodPayments = (payments as any[]).filter(p => p.periodStart === row.periodStart && p.periodEnd === row.periodEnd)
                  const totalPaidForPeriod = samePeriodPayments.reduce((sum, p) => sum + p.amount, 0)
                  const isFullyPaid = totalPaidForPeriod >= (unit?.rentAmount || 0)
                  const isLatestForPeriod = row.uuid === samePeriodPayments[0]?.uuid
                  const statusLabel = (isFullyPaid && isLatestForPeriod) ? 'Paid' : 'Part-Payment'

                  return (
                    <tr key={row.uuid} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '20px 24px', fontSize: 14, fontWeight: 500, color: 'var(--dark)' }}>
                        {row.tenant ? formatTenantName(row.tenant) : unit?.tenant ? formatTenantName(unit.tenant) : 'Past Tenant'}
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {row.periodStart ? `${new Date(row.periodStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${row.periodEnd ? new Date(row.periodEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '...'}` : 'N/A'}
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: 13, color: 'var(--text-muted)' }}>{new Date(row.paymentDate).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '20px 24px' }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{formatCurrency(row.amount, unit?.currency || 'NGN')}</div></td>
                      <td style={{ padding: '20px 24px' }}><span style={{ fontSize: 12, fontWeight: 600, color: statusLabel === 'Paid' ? 'var(--forest)' : 'var(--text-muted)' }}>{statusLabel}</span></td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', position: 'relative' }}>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === row.uuid ? null : row.uuid) }}>
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === row.uuid && (
                          <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setActiveMenuId(null)} />
                            <div style={{ position: 'absolute', top: '100%', right: 24, background: 'white', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 11, minWidth: 140, overflow: 'hidden' }}>
                              <button style={{ width: '100%', padding: '12px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--dark)', background: 'none', border: 'none', cursor: 'pointer' }}
                                onClick={() => { setSelectedRecordForEdit(row); setIsEditRentModalOpen(true); setActiveMenuId(null) }}>
                                <Edit size={14} /> Edit Record
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No rent payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditRentRecordModal isOpen={isEditRentModalOpen} onClose={() => { setIsEditRentModalOpen(false); setSelectedRecordForEdit(null) }} onSave={handleUpdatePayment} isPending={updatePaymentMutation.isPending} unitName={unit?.unitName || ''} rentType={unit?.rentType} record={selectedRecordForEdit} />

      {unit && <EditUnitModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} unit={unit} onSave={handleUpdate} isPending={updateUnitMutation.isPending} hasPayments={totalPaid > 0} />}

      {unit && <CreatePaymentRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} unit={unit} payments={payments} existingRequest={selectedRequestForEdit} onProceedToEditor={handleProceedToEditor} />}

      <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Delete Unit" message="Are you sure you want to delete this unit? This action cannot be undone." confirmText="Delete Unit" type="danger" isPending={deleteUnitMutation.isPending} />

      <AddRentRecordModal isOpen={isAddRecordModalOpen} onClose={() => setIsAddRecordModalOpen(false)} onSave={handleSaveNewPayment} isPending={addPaymentMutation.isPending} unitName={unit?.unitName || ''} rentType={unit?.rentType} initialAmount={unit?.rentAmount} currentUnitStartDate={unit?.rentStartDate ? new Date(unit.rentStartDate).toISOString().split('T')[0] : undefined} currentTenantName={unit?.tenant ? formatTenantName(unit.tenant) : ''} />

      <RentHistoryEntryModeModal isOpen={isEntryModeModalOpen} onClose={() => setIsEntryModeModalOpen(false)} onManualEntry={handleManualEntry} onBulkEntry={handleBulkEntry} />

      <ConfirmationModal isOpen={isUnassignConfirmOpen} onClose={() => setIsUnassignConfirmOpen(false)} onConfirm={handleUnassign} title="Remove Tenant" message={activeRequest ? `Are you sure you want to remove ${formatTenantName(unit?.tenant)} from this unit? They have a pending invoice of ${formatCurrency(amountRemaining, 'NGN')}.` : `Are you sure you want to remove ${formatTenantName(unit?.tenant)} from this unit?`} confirmText="Remove Tenant" type="danger" isPending={unassignTenant.isPending} />

      {unit && <AssignTenantToUnitModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} unitUuid={unit.uuid} unitName={unit.unitName} initialRentAmount={unit.rentAmount} initialRentType={unit.rentType} initialRentStartDate={unit.rentStartDate} initialRentDueDate={unit.rentDueDate} />}
    </div>
  )
}

export default function LandlordUnitDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <UnitDetailContent />
    </Suspense>
  )
}
