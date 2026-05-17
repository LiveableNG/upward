'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Building2, 
  Wallet, 
  Mail, 
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  Plus, 
  CreditCard, 
  RefreshCw, 
  Settings2
} from 'lucide-react'
import { getLandlordPropertyDetails } from '@/features/auth/services/landlordAuthService'
import styles from './page.module.css'
import { CreatePaymentRequestModal } from '@/features/pm/components/payments/modals/CreatePaymentRequestModal'
import { ManagedAddUnitModal } from '@/features/pm/components/properties/modals/ManagedAddUnitModal'
import { EditPropertyModal } from '@/features/pm/components/properties/modals/EditPropertyModal'
import { DeletePropertyModal } from '@/features/pm/components/properties/modals/DeletePropertyModal'
import { useSyncToUpward, useUpdateProperty, useDeleteProperty } from '@/features/pm/hooks/useProperties'
import { useToast } from '@/components/common/Toast'

export default function LandlordPropertyDetail() {
  const { uuid } = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  
  const [selectedUnit, setSelectedUnit] = React.useState<any | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  const [isAddUnitOpen, setIsAddUnitOpen] = React.useState(false)

  // Edit / Delete Property State
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [propForm, setPropForm] = React.useState({
    name: '', address: '', totalUnits: '', propertyType: 'Residential',
    imageUrl: '', country: 'Nigeria', state: '', area: '',
    landlordName: '', landlordEmail: '', landlordPhone: '',
    imageFile: null as File | null
  })

  const { data: property, isLoading, error, refetch } = useQuery({
    queryKey: ['landlord-property', uuid],
    queryFn: () => getLandlordPropertyDetails(uuid as string),
    enabled: !!uuid
  })

  const syncMutation = useSyncToUpward()
  const updatePropertyMutation = useUpdateProperty()
  const deletePropertyMutation = useDeleteProperty()

  const handleSync = (unitUuid: string) => {
    syncMutation.mutate(unitUuid, {
      onSuccess: () => {
        success('Unit synced to Upward Pay successfully!')
        refetch()
      },
      onError: (err: any) => {
        toastError(err?.message || 'Failed to sync unit')
      }
    })
  }

  const handleEditClick = () => {
    if (!property) return
    setPropForm({
      name: property.name,
      address: property.address,
      totalUnits: (property.summary?.totalUnits || 0).toString(),
      propertyType: property.propertyType,
      imageUrl: property.imageUrl || '',
      country: property.country || 'Nigeria',
      state: property.state || '',
      area: property.area || '',
      landlordName: property.landlordName || '',
      landlordEmail: property.landlordEmail || '',
      landlordPhone: property.landlordPhone || '',
      imageFile: null
    })
    setShowEditModal(true)
  }

  const handleSave = () => {
    const dataToSend = {
      ...propForm,
      totalUnits: parseInt(propForm.totalUnits, 10) || 0
    }
    updatePropertyMutation.mutate({ uuid: uuid as string, data: dataToSend as any }, {
      onSuccess: () => {
        success('Property updated successfully')
        setShowEditModal(false)
        queryClient.invalidateQueries({ queryKey: ['landlord-property', uuid] })
        queryClient.invalidateQueries({ queryKey: ['landlord-portfolio'] })
        refetch()
      },
      onError: (err: any) => toastError(err.message || 'Failed to update property')
    })
  }

  const handleDelete = () => {
    deletePropertyMutation.mutate(uuid as string, {
      onSuccess: () => {
        success('Property deleted successfully')
        queryClient.invalidateQueries({ queryKey: ['landlord-portfolio'] })
        router.push('/portal')
      },
      onError: (err: any) => toastError(err.message || 'Failed to delete property')
    })
  }

  if (isLoading) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--forest)" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className={styles.container}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <h2 style={{ color: 'var(--error)' }}>Property Not Found</h2>
          <p style={{ color: 'var(--text-muted)' }}>We couldn't find the property you're looking for or you don't have access.</p>
        </div>
      </div>
    )
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/portal')} className={styles.backBtn}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div>
            <h1 className={styles.title}>{property.name}</h1>
            <div className={styles.address}>
              <MapPin size={16} />
              {property.address}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button 
              className="btn btn--secondary" 
              style={{ padding: '10px 20px', fontSize: 14 }}
              onClick={handleEditClick}
            >
              Edit Property
            </button>
            <button 
              className="btn btn--primary" 
              style={{ padding: '10px 20px', fontSize: 14 }}
              onClick={() => setIsAddUnitOpen(true)}
            >
              <Plus size={18} /> Add Unit
            </button>
            <div className={styles.badge}>{property.propertyType}</div>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.mainContent}>
          {/* Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Occupancy</div>
              <div className={styles.statValue}>
                {property.summary.occupiedUnits} / {property.summary.totalUnits}
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({property.summary.totalUnits > 0 ? Math.round((property.summary.occupiedUnits / property.summary.totalUnits) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Units</div>
              <div className={styles.statValue}>{property.summary.totalUnits}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Property Revenue</div>
              <div className={`${styles.statValue} ${styles.revenue}`}>₦{property.summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Outstanding Balance</div>
              <div className={`${styles.statValue} ${styles.outstanding}`}>₦{property.summary.totalOutstanding.toLocaleString()}</div>
            </div>
          </div>

          {/* Unit Breakdown */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Building2 size={20} />
              Unit Breakdown
            </h2>
            <div className={styles.unitList}>
              {property.units.map((unit: any) => (
                <div key={unit.uuid} className={styles.unitCard}>
                  <div className={styles.unitInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <h4>Unit {unit.unitNumber}</h4>
                       {!unit.isSynced && <span style={{ fontSize: 10, background: 'var(--error-faint)', color: 'var(--error)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>NOT SYNCED</span>}
                    </div>
                    <p>{unit.unitType}</p>
                  </div>
                  <div>
                    <div className={`${styles.status} ${unit.status === 'OCCUPIED' ? styles.occupied : styles.vacant}`}>
                      {unit.status}
                    </div>
                    {unit.tenant && (
                      <div style={{ fontSize: '13px', marginTop: '4px', fontWeight: 600 }}>{unit.tenant.name}</div>
                    )}
                  </div>
                  <div>
                    <div className={styles.statLabel}>Revenue</div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>₦{unit.revenue.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        className="btn btn--secondary btn--sm" 
                        onClick={() => router.push(`/portal/properties/units/${unit.uuid}`)}
                        style={{ fontSize: 12, height: 32, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        View Unit
                      </button>
                      {!unit.isSynced ? (
                        <button 
                          className="btn-text" 
                          onClick={() => handleSync(unit.uuid)}
                          style={{ color: 'var(--clay)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} /> Sync
                        </button>
                      ) : (
                        <button 
                          className="btn-text" 
                          onClick={() => {
                            setSelectedUnit(unit);
                            setIsPaymentModalOpen(true);
                          }}
                          style={{ color: 'var(--forest)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <CreditCard size={14} /> Request Rent
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <div className={styles.managerCard}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, marginBottom: '24px' }}>
              Managed By
            </h3>
            <div className={styles.managerHeader}>
              <div className={styles.managerAvatar}>{getInitials(property.manager.name)}</div>
              <div>
                <span className={styles.managerName}>{property.manager.name}</span>
                <span className={styles.managerBusiness}>{property.manager.business || 'Individual'}</span>
              </div>
            </div>
            
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <Mail size={16} />
                {property.manager.email}
              </div>
              {property.manager.phone && (
                <div className={styles.contactItem}>
                  <Phone size={16} />
                  {property.manager.phone}
                </div>
              )}
              <div className={styles.contactItem}>
                <ShieldCheck size={16} color="var(--clay)" />
                Verified Context
              </div>
            </div>

            <button 
              className="auth-btn auth-btn--primary" 
              style={{ marginTop: '32px', width: '100%', background: 'white', color: 'var(--dark)' }}
              onClick={() => window.location.href = `mailto:${property.manager.email}`}
            >
              Contact Manager
            </button>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <ManagedAddUnitModal 
        isOpen={isAddUnitOpen}
        onClose={() => {
          setIsAddUnitOpen(false);
          refetch();
        }}
        propertyUuid={uuid as string}
        properties={property ? [property] : []}
      />

      <EditPropertyModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSave}
        isPending={updatePropertyMutation.isPending}
        formData={propForm}
        setFormData={setPropForm}
        onDelete={() => setShowDeleteModal(true)}
      />

      <DeletePropertyModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isPending={deletePropertyMutation.isPending}
        propertyName={property.name}
      />

      {selectedUnit && (
        <CreatePaymentRequestModal 
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedUnit(null);
            refetch();
          }}
          unit={{
            uuid: selectedUnit.uuid,
            unitName: selectedUnit.unitNumber,
            rentAmount: selectedUnit.rentAmount || 0,
            tenant: selectedUnit.tenant ? {
              firstName: selectedUnit.tenant.name.split(' ')[0],
              lastName: selectedUnit.tenant.name.split(' ').slice(1).join(' '),
            } : null,
            isSynced: true
          } as any}
        />
      )}
    </div>
  )
}
