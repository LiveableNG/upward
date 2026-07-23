'use client'

import React, { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isBefore, addDays, startOfDay } from 'date-fns'
import { useToast } from '@/components/common/Toast'
import { cn, formatTenantName } from '@/lib/utils'
import { isValidPhoneNumber } from 'libphonenumber-js'

import { 
  useProperties, 
  useUnits, 
  useCreateProperty, 
  useUpdateProperty, 
  useBulkCreateUnits, 
  useDeleteProperty 
} from '@/features/pm/hooks/useProperties'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'
import { Property, getPropertyImageUploadUrl } from '../../services/propertyService'

import { PropertiesTable } from './PropertiesTable'
import { UnitsTable } from './UnitsTable'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { AddPropertyModal } from './modals/AddPropertyModal'
import { EditPropertyModal } from './modals/EditPropertyModal'
import { DeletePropertyModal } from './modals/DeletePropertyModal'
import { AddUnitModal } from './modals/AddUnitModal'
import { ImportModeModal } from './modals/ImportModeModal'
import { CreatePaymentRequestModal } from '../payments/modals/CreatePaymentRequestModal'
import { DocumentEditorView } from '../documents/DocumentEditorView'

type Tab = 'units' | 'properties'

export function PropertiesView({ initialProperties, initialUnits }: { initialProperties?: any, initialUnits?: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, info, error } = useToast()
  
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'units')
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('All Properties')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>((searchParams.get('paymentFilter') as any) || 'all')
  const [dueFilter, setDueFilter] = useState<'all' | 'passed' | '30days' | '60days' | '90days'>((searchParams.get('dueFilter') as any) || 'all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'vacant' | 'occupied'>((searchParams.get('statusFilter') as any) || 'all')
  
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [showImportModeModal, setShowImportModeModal] = useState(false)
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false)
  
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<any>(null)
  const [editingPropertyUuid, setEditingPropertyUuid] = useState('')
  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')

  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [paymentContext, setPaymentContext] = useState<any>(null)

  React.useEffect(() => {
    if (searchParams.get('action') === 'add-property') {
      setShowAddPropertyModal(true)
    }
  }, [searchParams])
  
  const { data: properties = [], isLoading: loadingProperties } = useProperties(initialProperties)
  const { data: units = [], isLoading: loadingUnits } = useUnits(undefined, initialUnits)
  const { data: paymentRequests = [] } = usePaymentRequests()
  
  const isLoading = loadingProperties || loadingUnits
  
  const createPropertyMutation = useCreateProperty()
  const updatePropertyMutation = useUpdateProperty()
  const deletePropertyMutation = useDeleteProperty()
  const bulkCreateUnitsMutation = useBulkCreateUnits()

  const [propForm, setPropForm] = useState({
    name: '', address: '', propertyType: 'Residential',
    imageFile: null as File | null, imageUrl: '', country: 'Nigeria',
    state: '', area: '', landlordName: '', landlordEmail: '', landlordPhone: '',
    collaborationEnabled: false, collaboratorUuids: [] as string[]
  })

  const [unitForm, setUnitForm] = useState({
    unitName: '', tenantFirstName: '', tenantLastName: '', tenantEmail: '',
    tenantPhone: '', rentAmount: '', rentStartDate: '', rentDueDate: '',
    rentType: 'Annually', leaseYears: 1, managementFee: '', notes: '', tenantUuid: '',
    unitType: '', rentAmountPaid: '', isFullyPaid: true
  })

  const handleConfirmDelete = () => {
    deletePropertyMutation.mutate(editingPropertyUuid, {
      onSuccess: () => {
        success('Property and all associated units deleted permanently')
        setShowDeletePropertyModal(false)
        setShowEditPropertyModal(false)
        resetPropForm()
      }
    })
  }

  const handleManualCreateUnit = () => {
    if (!targetPropertyUuid) return error("Please select a property")
    if (!unitForm.unitName) return error("Unit Name is required")
    if (unitForm.tenantPhone && !isValidPhoneNumber(unitForm.tenantPhone)) return error("Please enter a valid international phone number")
    
    bulkCreateUnitsMutation.mutate({
      propertyUuid: targetPropertyUuid,
      units: [{
        ...unitForm,
        rentAmount: parseFloat(unitForm.rentAmount) || 0,
        rentAmountPaid: parseFloat(unitForm.rentAmountPaid) || 0,
        managementFee: parseFloat(unitForm.managementFee) || 0,
        leaseYears: unitForm.rentType === 'Lease' ? (parseInt(String((unitForm as any).leaseYears || 1), 10) || 1) : undefined,
        status: (unitForm.tenantEmail?.trim() || unitForm.tenantFirstName?.trim() || unitForm.tenantLastName?.trim() || unitForm.tenantUuid) ? 'OCCUPIED' : 'VACANT'
      }]
    }, {
      onSuccess: () => {
        success('Unit created successfully!')
        setShowAddUnitModal(false)
        setUnitForm({ 
          unitName: '', tenantFirstName: '', tenantLastName: '', tenantEmail: '',
          tenantPhone: '', rentAmount: '', rentStartDate: '', rentDueDate: '',
          rentType: 'Annually', leaseYears: 1, managementFee: '', notes: '', tenantUuid: '',
          unitType: '', rentAmountPaid: '', isFullyPaid: true
        })
        setTargetPropertyUuid('')
      },
      onError: (err: any) => error(err?.message || 'Failed to create unit')
    })
  }

  const handleCreateProperty = async () => {
    if (!propForm.name || !propForm.address) return error("Name and Address are required")
    let finalImageUrl = ''
    try {
      if (propForm.imageFile) {
        info("Uploading image...")
        const { uploadUrl, publicUrl } = await getPropertyImageUploadUrl(propForm.imageFile.type, propForm.imageFile.name)
        await fetch(uploadUrl, { method: 'PUT', body: propForm.imageFile, headers: { 'Content-Type': propForm.imageFile.type } })
        finalImageUrl = publicUrl
      }
      const payload = {
        name: propForm.name,
        address: propForm.address,
        propertyType: propForm.propertyType,
        imageUrl: finalImageUrl || undefined,
        country: propForm.country,
        state: propForm.state,
        area: propForm.area,
        landlordName: propForm.landlordName,
        landlordEmail: propForm.landlordEmail,
        landlordPhone: propForm.landlordPhone,
        collaboratorUuids: propForm.collaboratorUuids,
      }

      createPropertyMutation.mutate(payload, {
        onSuccess: () => {
          success('Property created successfully!')
          setShowAddPropertyModal(false)
          resetPropForm()
        },
        onError: (err: any) => error(err?.message || 'Failed to create property')
      })
    } catch (err) { error("Failed to upload image") }
  }

  const openEditProperty = (prop: Property) => {
    setEditingPropertyUuid(prop.uuid)
    setPropForm({ ...prop, imageFile: null, imageUrl: prop.imageUrl || '' } as any)
    setShowEditPropertyModal(true)
  }

  const handleUpdateProperty = async () => {
    if (!propForm.name || !propForm.address) return error("Name and Address are required")
    let finalImageUrl = propForm.imageUrl
    try {
      if (propForm.imageFile) {
        info("Uploading new image...")
        const { uploadUrl, publicUrl } = await getPropertyImageUploadUrl(propForm.imageFile.type, propForm.imageFile.name)
        await fetch(uploadUrl, { method: 'PUT', body: propForm.imageFile, headers: { 'Content-Type': propForm.imageFile.type } })
        finalImageUrl = publicUrl
      }
      
      const payload = {
        name: propForm.name,
        address: propForm.address,
        propertyType: propForm.propertyType,
        imageUrl: finalImageUrl,
        country: propForm.country,
        state: propForm.state,
        area: propForm.area,
        landlordName: propForm.landlordName,
        landlordEmail: propForm.landlordEmail,
        landlordPhone: propForm.landlordPhone,
      }

      updatePropertyMutation.mutate({ 
        uuid: editingPropertyUuid, 
        data: payload as any 
      }, {
        onSuccess: () => {
          success('Property updated successfully!')
          setShowEditPropertyModal(false)
          resetPropForm()
        },
        onError: (err: any) => error(err?.message || 'Failed to update property')
      })
    } catch (err) { error("Failed to upload image") }
  }

  const resetPropForm = () => {
    setPropForm({ 
      name: '', address: '', propertyType: 'Residential', 
      imageFile: null, imageUrl: '', country: 'Nigeria', state: '', area: '',
      landlordName: '', landlordEmail: '', landlordPhone: '',
      collaborationEnabled: false, collaboratorUuids: []
    })
    setEditingPropertyUuid('')
  }

  const handleOpenPaymentRequest = (unit: any) => {
    setSelectedUnitForPayment(unit)
    setShowPaymentRequestModal(true)
  }

  const handleProceedToEditor = (template: any, context: any) => {
    setEditingTemplate(template)
    setPaymentContext(context)
    setShowPaymentRequestModal(false)
    setShowEditor(true)
  }

  // Memoized Filters
  const filteredUnits = useMemo(() => {
    return units.filter((unit: any) => {
      const prop = properties.find((p: any) => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId)
      const matchesSearch = 
        unit.unitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.tenant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.tenant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesProp = selectedPropertyFilter === 'All Properties' || prop?.name === selectedPropertyFilter
      const unitRequests = paymentRequests?.filter((r: any) => r.unitId === unit.id) || []
      const hasPendingRequest = unitRequests.some((r: any) => r.status !== 'PAID')
      const hasPaidRequest = unitRequests.some((r: any) => r.status === 'PAID')
      let matchesPayment = true
      if (paymentFilter === 'pending') matchesPayment = hasPendingRequest
      else if (paymentFilter === 'paid') matchesPayment = hasPaidRequest && !hasPendingRequest

      let matchesDue = true
      if (dueFilter !== 'all' && unit.rentDueDate) {
        const dueDate = new Date(unit.rentDueDate)
        const today = startOfDay(new Date())
        if (dueFilter === 'passed') matchesDue = isBefore(dueDate, today)
        else if (dueFilter === '30days') matchesDue = isBefore(dueDate, addDays(today, 30)) && !isBefore(dueDate, today)
        else if (dueFilter === '60days') matchesDue = isBefore(dueDate, addDays(today, 60)) && !isBefore(dueDate, today)
        else if (dueFilter === '90days') matchesDue = isBefore(dueDate, addDays(today, 90)) && !isBefore(dueDate, today)
      } else if (dueFilter !== 'all') {
        matchesDue = false
      }

      let matchesStatus = true
      if (statusFilter === 'vacant') matchesStatus = unit.status === 'VACANT'
      else if (statusFilter === 'occupied') matchesStatus = unit.status === 'OCCUPIED'

      return matchesSearch && matchesProp && matchesPayment && matchesDue && matchesStatus
    }).sort((a: any, b: any) => {
      const aRequests = paymentRequests?.filter((r: any) => r.unitId === a.id) || []
      const bRequests = paymentRequests?.filter((r: any) => r.unitId === b.id) || []
      const aHasPending = aRequests.some((r: any) => r.status !== 'PAID' && r.status !== 'CANCELLED')
      const bHasPending = bRequests.some((r: any) => r.status !== 'PAID' && r.status !== 'CANCELLED')

      // Prioritize units with pending payment requests
      if (aHasPending && !bHasPending) return -1
      if (!aHasPending && bHasPending) return 1

      // Then handle units with no due date (often considered pending setup)
      if (!a.rentDueDate && !b.rentDueDate) return 0;
      if (!a.rentDueDate) return -1;
      if (!b.rentDueDate) return 1;

      // Finally sort by due date ascending
      return new Date(a.rentDueDate).getTime() - new Date(b.rentDueDate).getTime();
    })
  }, [units, properties, paymentRequests, searchQuery, selectedPropertyFilter, paymentFilter, dueFilter, statusFilter])

  const filteredProperties = useMemo(() => {
    return properties.filter((prop: any) => 
      prop.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [properties, searchQuery])

  const renderContent = () => {
    if (isLoading) {
      return <TableSkeleton />
    }
    if (activeTab === 'units') {
      return (
        <UnitsTable 
          units={filteredUnits}
          properties={properties}
          paymentRequests={paymentRequests}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedPropertyFilter={selectedPropertyFilter}
          setSelectedPropertyFilter={setSelectedPropertyFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          dueFilter={dueFilter}
          setDueFilter={setDueFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddUnit={() => {
            if (properties.length === 0) {
              info("Please add a property first before adding units.")
              setShowAddPropertyModal(true)
            } else {
              setShowAddUnitModal(true)
            }
          }}
          onBulkImport={() => setShowImportModeModal(true)}
          onRequestPayment={handleOpenPaymentRequest}
          hasProperties={properties.length > 0}
        />
      )
    }

    return (
      <PropertiesTable 
        properties={filteredProperties}
        units={units}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddProperty={() => setShowAddPropertyModal(true)}
        onEditProperty={openEditProperty}
        onManageUnits={(name) => {
          setSelectedPropertyFilter(name)
          setActiveTab('units')
        }}
        onViewPropertyDetail={(prop) => router.push(`/properties/view?uuid=${prop.uuid}`)}
      />
    )
  }

  if (showEditor) {
    const tenant = selectedUnitForPayment?.tenant;
    return (
      <div className="container" style={{ padding: '40px' }}>
        <DocumentEditorView 
          initialTemplate={editingTemplate}
          initialRecipient={tenant ? {
            type: 'existing',
            uuid: tenant.uuid,
            name: formatTenantName(tenant),
            email: tenant.email,
            deliveryMode: 'email'
          } : undefined}
          paymentContext={paymentContext}
          onBack={() => setShowEditor(false)}
        />
      </div>
    )
  }

  return (
    <>
      <div className="properties-page animate-fade-in">
        <div className="properties-tabs" style={{ marginBottom: 32 }}>
            <button 
              className={cn('properties-tabs__btn', activeTab === 'units' && 'properties-tabs__btn--active')}
              onClick={() => setActiveTab('units')}
            >
              Units ({units.length})
            </button>
            <button 
              className={cn('properties-tabs__btn', activeTab === 'properties' && 'properties-tabs__btn--active')}
              onClick={() => setActiveTab('properties')}
            >
              Properties ({properties.length})
            </button>
          </div>
        
        {renderContent()}
      </div>

      <AddUnitModal 
        isOpen={showAddUnitModal}
        onClose={() => setShowAddUnitModal(false)}
        onSave={handleManualCreateUnit}
        isPending={bulkCreateUnitsMutation.isPending}
        properties={properties}
        targetPropertyUuid={targetPropertyUuid}
        setTargetPropertyUuid={setTargetPropertyUuid}
        formData={unitForm}
        setFormData={setUnitForm}
      />

      <AddPropertyModal 
        isOpen={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
        onSave={handleCreateProperty}
        isPending={createPropertyMutation.isPending}
        formData={propForm}
        setFormData={setPropForm}
      />

      <EditPropertyModal 
        isOpen={showEditPropertyModal}
        onClose={() => setShowEditPropertyModal(false)}
        onSave={handleUpdateProperty}
        onDelete={() => setShowDeletePropertyModal(true)}
        isPending={updatePropertyMutation.isPending}
        formData={propForm}
        setFormData={setPropForm}
      />

      <DeletePropertyModal 
        isOpen={showDeletePropertyModal}
        onClose={() => setShowDeletePropertyModal(false)}
        onConfirm={handleConfirmDelete}
        isPending={deletePropertyMutation.isPending}
        propertyName={propForm.name}
      />

      <CreatePaymentRequestModal 
        isOpen={showPaymentRequestModal}
        onClose={() => setShowPaymentRequestModal(false)}
        unit={selectedUnitForPayment}
        onProceedToEditor={handleProceedToEditor}
      />

      <ImportModeModal 
        isOpen={showImportModeModal}
        onClose={() => setShowImportModeModal(false)}
        hasProperties={properties.length > 0}
      />
    </>
  )
}
