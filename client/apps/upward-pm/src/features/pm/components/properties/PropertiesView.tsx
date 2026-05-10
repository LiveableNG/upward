'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { isBefore, addDays, startOfDay } from 'date-fns'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
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

// Sub-components
import { PropertiesTable } from './PropertiesTable'
import { UnitsTable } from './UnitsTable'

// Modals
import { AddPropertyModal } from './modals/AddPropertyModal'
import { EditPropertyModal } from './modals/EditPropertyModal'
import { DeletePropertyModal } from './modals/DeletePropertyModal'
import { AddUnitModal } from './modals/AddUnitModal'
import { ImportModeModal } from './modals/ImportModeModal'
import { CreatePaymentRequestModal } from '../payments/modals/CreatePaymentRequestModal'
import { DocumentEditorView } from '../documents/DocumentEditorView'

type Tab = 'units' | 'properties'

export function PropertiesView() {
  const router = useRouter()
  const { success, info, error } = useToast()
  
  // View State
  const [activeTab, setActiveTab] = useState<Tab>('units')
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('All Properties')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending'>('all')
  const [dueFilter, setDueFilter] = useState<'all' | 'passed' | '30days' | '60days' | '90days'>('all')
  
  // Modal & Edit State
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [showImportModeModal, setShowImportModeModal] = useState(false)
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false)
  
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<any>(null)
  const [editingPropertyUuid, setEditingPropertyUuid] = useState('')
  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')

  // Payment -> Document Editor Flow
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [paymentContext, setPaymentContext] = useState<any>(null)
  
  // Data Hooks
  const { data: properties = [] } = useProperties()
  const { data: units = [] } = useUnits()
  const { data: paymentRequests = [] } = usePaymentRequests()
  
  const createPropertyMutation = useCreateProperty()
  const updatePropertyMutation = useUpdateProperty()
  const deletePropertyMutation = useDeleteProperty()
  const bulkCreateUnitsMutation = useBulkCreateUnits()

  // Form States
  const [propForm, setPropForm] = useState({
    name: '', address: '', totalUnits: '', propertyType: 'Residential',
    imageFile: null as File | null, imageUrl: '', country: 'Nigeria',
    state: '', area: '', landlordName: '', landlordEmail: '', landlordPhone: '',
    collaborationEnabled: false, collaboratorUuids: [] as string[]
  })

  const [unitForm, setUnitForm] = useState({
    unitName: '', tenantFirstName: '', tenantLastName: '', tenantEmail: '',
    tenantPhone: '', rentAmount: '', rentStartDate: '', rentDueDate: '',
    rentType: 'Monthly', managementFee: '', notes: '', tenantUuid: '',
    unitType: ''
  })

  // Handlers
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
        managementFee: parseFloat(unitForm.managementFee) || 0,
        status: (unitForm.tenantEmail?.trim() || unitForm.tenantFirstName?.trim() || unitForm.tenantLastName?.trim() || unitForm.tenantUuid) ? 'OCCUPIED' : 'VACANT'
      }]
    }, {
      onSuccess: () => {
        success('Unit created successfully!')
        setShowAddUnitModal(false)
        setUnitForm({ 
          unitName: '', tenantFirstName: '', tenantLastName: '', tenantEmail: '',
          tenantPhone: '', rentAmount: '', rentStartDate: '', rentDueDate: '',
          rentType: 'Monthly', managementFee: '', notes: '', tenantUuid: '',
          unitType: ''
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
      createPropertyMutation.mutate({ ...propForm, totalUnits: parseInt(propForm.totalUnits) || 0, imageUrl: finalImageUrl || undefined }, {
        onSuccess: () => {
          success('Property created successfully!')
          setShowAddPropertyModal(false)
          resetPropForm()
        }
      })
    } catch (err) { error("Failed to upload image") }
  }

  const openEditProperty = (prop: Property) => {
    setEditingPropertyUuid(prop.uuid)
    setPropForm({ ...prop, totalUnits: prop.totalUnits.toString(), imageFile: null, imageUrl: prop.imageUrl || '' } as any)
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
      updatePropertyMutation.mutate({ uuid: editingPropertyUuid, data: { ...propForm, totalUnits: parseInt(propForm.totalUnits) || 0, imageUrl: finalImageUrl } as any }, {
        onSuccess: () => {
          success('Property updated successfully!')
          setShowEditPropertyModal(false)
          resetPropForm()
        }
      })
    } catch (err) { error("Failed to upload image") }
  }

  const resetPropForm = () => {
    setPropForm({ 
      name: '', address: '', totalUnits: '', propertyType: 'Residential', 
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
    return units.filter(unit => {
      const prop = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId)
      const matchesSearch = 
        unit.unitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.tenant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.tenant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesProp = selectedPropertyFilter === 'All Properties' || prop?.name === selectedPropertyFilter
      const unitRequests = paymentRequests?.filter(r => r.unitId === unit.id) || []
      const hasPendingRequest = unitRequests.some(r => r.status !== 'PAID')
      const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'pending' && hasPendingRequest)

      let matchesDue = true
      if (dueFilter !== 'all' && unit.rentDueDate) {
        const dueDate = new Date(unit.rentDueDate)
        const today = startOfDay(new Date())
        if (dueFilter === 'passed') matchesDue = isBefore(dueDate, today)
        else if (dueFilter === '30days') matchesDue = isBefore(dueDate, addDays(today, 30)) && !isBefore(dueDate, today)
        else if (dueFilter === '60days') matchesDue = isBefore(dueDate, addDays(today, 60)) && !isBefore(dueDate, today)
        else if (dueFilter === '90days') matchesDue = isBefore(dueDate, addDays(today, 90)) && !isBefore(dueDate, today)
      } else if (dueFilter !== 'all' && !unit.rentDueDate) matchesDue = false

      return matchesSearch && matchesProp && matchesPayment && matchesDue
    })
  }, [units, properties, paymentRequests, searchQuery, selectedPropertyFilter, paymentFilter, dueFilter])

  const filteredProperties = useMemo(() => {
    return properties.filter(prop => 
      prop.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [properties, searchQuery])

  const renderContent = () => {
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
          onAddUnit={() => setShowAddUnitModal(true)}
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
        onViewPropertyDetail={(prop) => router.push(`/properties/${prop.uuid}`)}
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
            name: `${tenant.firstName} ${tenant.lastName}`,
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
