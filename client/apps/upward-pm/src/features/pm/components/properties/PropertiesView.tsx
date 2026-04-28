'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Download, Search, FileSpreadsheet, X, ArrowLeft, Filter, Calendar, CreditCard as CreditCardIcon } from 'lucide-react'
import { format, isBefore, addDays, startOfDay } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import Papa from 'papaparse'

import { useProperties, useUnits, useCreateProperty, useUpdateProperty, useBulkCreateUnits, useDeleteProperty } from '@/features/pm/hooks/useProperties'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { PropertyCard } from './PropertyCard'
import { UnitCard } from './UnitCard'
import { AddPropertyModal } from './modals/AddPropertyModal'
import { EditPropertyModal } from './modals/EditPropertyModal'
import { DeletePropertyModal } from './modals/DeletePropertyModal'
import { AddUnitModal } from './modals/AddUnitModal'
import { ImportModeModal } from './modals/ImportModeModal'
import { CreatePaymentRequestModal } from '../payments/modals/CreatePaymentRequestModal'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'

import { Property, getPropertyImageUploadUrl } from '../../services/propertyService'

type Tab = 'units' | 'properties'

export function PropertiesView() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('units')
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [showImportModeModal, setShowImportModeModal] = useState(false)
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false)
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<any>(null)
  const [editingPropertyUuid, setEditingPropertyUuid] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('All Properties')
  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const [previewUnits, setPreviewUnits] = useState<any[]>([])
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending'>('all')
  const [dueFilter, setDueFilter] = useState<'all' | 'passed' | '30days' | '60days' | '90days'>('all')
  
  // Form States
  const [propForm, setPropForm] = useState({
    name: '',
    address: '',
    totalUnits: '',
    propertyType: 'Residential',
    imageFile: null as File | null,
    imageUrl: '',
    country: 'Nigeria',
    state: '',
    area: '',
    landlordName: '',
    landlordEmail: '',
    landlordPhone: ''
  })

  const [unitForm, setUnitForm] = useState({
    unitName: '',
    tenantFirstName: '',
    tenantLastName: '',
    tenantEmail: '',
    tenantPhone: '',
    rentAmount: '',
    rentStartDate: '',
    rentDueDate: '',
    rentType: 'Monthly',
    managementFee: '',
    notes: '',
    tenantUuid: ''
  })

  const { success, info, error } = useToast()
  
  const { data: properties } = useProperties()
  const { data: units } = useUnits()
  const { data: paymentRequests } = usePaymentRequests()
  
  const createPropertyMutation = useCreateProperty()
  const updatePropertyMutation = useUpdateProperty()
  const deletePropertyMutation = useDeleteProperty()
  const bulkCreateUnitsMutation = useBulkCreateUnits()

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

  // Filters
  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      const prop = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId)
      
      // Search Filter
      const matchesSearch = 
        unit.unitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.tenant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.tenant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop?.name?.toLowerCase().includes(searchQuery.toLowerCase())

      // Property Filter
      const matchesProp = selectedPropertyFilter === 'All Properties' || prop?.name === selectedPropertyFilter

      // Payment Request Filter
      const unitRequests = paymentRequests?.filter(r => r.unitId === unit.id) || []
      const hasPendingRequest = unitRequests.some(r => r.status !== 'PAID')
      const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'pending' && hasPendingRequest)

      // Due Date Filter
      let matchesDue = true
      if (dueFilter !== 'all' && unit.rentDueDate) {
        const dueDate = new Date(unit.rentDueDate)
        const today = startOfDay(new Date())
        
        if (dueFilter === 'passed') {
          matchesDue = isBefore(dueDate, today)
        } else if (dueFilter === '30days') {
          matchesDue = isBefore(dueDate, addDays(today, 30)) && !isBefore(dueDate, today)
        } else if (dueFilter === '60days') {
          matchesDue = isBefore(dueDate, addDays(today, 60)) && !isBefore(dueDate, today)
        } else if (dueFilter === '90days') {
          matchesDue = isBefore(dueDate, addDays(today, 90)) && !isBefore(dueDate, today)
        }
      } else if (dueFilter !== 'all' && !unit.rentDueDate) {
        matchesDue = false
      }

      return matchesSearch && matchesProp && matchesPayment && matchesDue
    })
  }, [units, properties, paymentRequests, searchQuery, selectedPropertyFilter, paymentFilter, dueFilter])

  const filteredProperties = properties.filter(prop => 
    prop.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )


  const handleManualCreateUnit = () => {
    if (!targetPropertyUuid) return error("Please select a property")
    if (!unitForm.unitName) return error("Unit Name is required")
    
    if (unitForm.tenantPhone && !isValidPhoneNumber(unitForm.tenantPhone)) {
      return error("Please enter a valid international phone number")
    }
    
    bulkCreateUnitsMutation.mutate({
      propertyUuid: targetPropertyUuid,
      units: [{
        unitName: unitForm.unitName,
        tenantFirstName: unitForm.tenantFirstName,
        tenantLastName: unitForm.tenantLastName,
        tenantEmail: unitForm.tenantEmail,
        tenantPhone: unitForm.tenantPhone,
        rentAmount: parseFloat(unitForm.rentAmount) || 0,
        rentStartDate: unitForm.rentStartDate,
        rentDueDate: unitForm.rentDueDate,
        rentType: unitForm.rentType,
        managementFee: parseFloat(unitForm.managementFee) || 0,
        notes: unitForm.notes,
        tenantUuid: unitForm.tenantUuid,
        status: (unitForm.tenantEmail?.trim() || unitForm.tenantFirstName?.trim() || unitForm.tenantLastName?.trim() || unitForm.tenantUuid) ? 'OCCUPIED' : 'VACANT'
      }]
    }, {
      onSuccess: () => {
        success('Unit created successfully!')
        setShowAddUnitModal(false)
        setUnitForm({ 
          unitName: '', tenantFirstName: '', tenantLastName: '', 
          tenantEmail: '', tenantPhone: '', rentAmount: '',
          rentStartDate: '', rentDueDate: '', rentType: 'Monthly',
          managementFee: '', notes: '',
          tenantUuid: ''
        })
        setTargetPropertyUuid('')
      },
      onError: (err: any) => {
        error(err?.message || 'Failed to create unit')
      }
    })
  }

  const handleCreateProperty = async () => {
    if (!propForm.name || !propForm.address) return error("Name and Address are required")
    
    let finalImageUrl = ''
    
    try {
      if (propForm.imageFile) {
        info("Uploading image...")
        const { uploadUrl, publicUrl } = await getPropertyImageUploadUrl(propForm.imageFile.type, propForm.imageFile.name)
        await fetch(uploadUrl, {
          method: 'PUT',
          body: propForm.imageFile,
          headers: { 'Content-Type': propForm.imageFile.type }
        })
        finalImageUrl = publicUrl
      }

      createPropertyMutation.mutate({
        name: propForm.name,
        address: propForm.address,
        propertyType: propForm.propertyType,
        totalUnits: parseInt(propForm.totalUnits) || 0,
        imageUrl: finalImageUrl || undefined,
        country: propForm.country,
        state: propForm.state,
        area: propForm.area,
        landlordName: propForm.landlordName,
        landlordEmail: propForm.landlordEmail,
        landlordPhone: propForm.landlordPhone
      }, {
        onSuccess: () => {
          success('Property created successfully!')
          setShowAddPropertyModal(false)
          resetPropForm()
        }
      })
    } catch (err) {
      error("Failed to upload image")
    }
  }

  const openEditProperty = (prop: Property) => {
    setEditingPropertyUuid(prop.uuid)
    setPropForm({
      name: prop.name,
      address: prop.address || '',
      totalUnits: prop.totalUnits.toString(),
      propertyType: prop.propertyType,
      imageFile: null,
      imageUrl: prop.imageUrl || '',
      country: prop.country || 'Nigeria',
      state: prop.state || '',
      area: prop.area || '',
      landlordName: prop.landlordName || '',
      landlordEmail: prop.landlordEmail || '',
      landlordPhone: prop.landlordPhone || ''
    })
    setShowEditPropertyModal(true)
  }

  const handleUpdateProperty = async () => {
    if (!propForm.name || !propForm.address) return error("Name and Address are required")
    let finalImageUrl = propForm.imageUrl

    try {
      if (propForm.imageFile) {
        info("Uploading new image...")
        const { uploadUrl, publicUrl } = await getPropertyImageUploadUrl(propForm.imageFile.type, propForm.imageFile.name)
        await fetch(uploadUrl, {
          method: 'PUT',
          body: propForm.imageFile,
          headers: { 'Content-Type': propForm.imageFile.type }
        })
        finalImageUrl = publicUrl
      }

      updatePropertyMutation.mutate({
        uuid: editingPropertyUuid,
        data: {
          name: propForm.name,
          address: propForm.address,
          propertyType: propForm.propertyType,
          totalUnits: parseInt(propForm.totalUnits) || 0,
          imageUrl: finalImageUrl,
          country: propForm.country,
          state: propForm.state,
          area: propForm.area,
          landlordName: propForm.landlordName,
          landlordEmail: propForm.landlordEmail,
          landlordPhone: propForm.landlordPhone
        }
      }, {
        onSuccess: () => {
          success('Property updated successfully!')
          setShowEditPropertyModal(false)
          resetPropForm()
        }
      })
    } catch (err) {
      error("Failed to upload image")
    }
  }

  const resetPropForm = () => {
    setPropForm({ 
      name: '', address: '', totalUnits: '', propertyType: 'Residential', 
      imageFile: null, imageUrl: '', country: 'Nigeria', state: '', area: '',
      landlordName: '', landlordEmail: '', landlordPhone: '' 
    })
    setEditingPropertyUuid('')
  }

  const handleManageUnits = (propName: string) => {
    setSelectedPropertyFilter(propName)
    setActiveTab('units')
  }

  const handleOpenPaymentRequest = (unit: any) => {
    setSelectedUnitForPayment(unit)
    setShowPaymentRequestModal(true)
  }

  return (
    <>
      <div className="properties-page animate-fade-in">
        <header className="properties-header">
          <div>
            <h1 className="dashboard__title">{activeTab === 'units' ? 'Units Management' : 'Properties Overview'}</h1>
            <p className="dashboard__subtitle">
              {activeTab === 'units' 
                ? 'Manage your units, invite tenants, and track onboarding.' 
                : 'Monitor performance and occupancy across your buildings.'}
            </p>
          </div>
          <div className="properties-header__actions">
            {activeTab === 'units' ? (
              <>
                <button 
                  className="btn btn--secondary" 
                  onClick={() => properties.length > 0 ? setShowAddUnitModal(true) : error("Please add a property first")}
                  disabled={properties.length === 0}
                >
                  <Plus size={18} />
                  Add Unit
                </button>
                <button 
                  className="btn btn--primary" 
                  onClick={() => setShowImportModeModal(true)}
                >
                  <FileSpreadsheet size={18} />
                  Bulk Import
                </button>
              </>
            ) : (
              <button className="btn btn--primary" onClick={() => setShowAddPropertyModal(true)}>
                <Plus size={18} />
                Add Property
              </button>
            )}
          </div>
        </header>

        <div className="properties-tabs">
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

        <div className="filters-bar">
          <div className="search-input">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder={activeTab === 'units' ? "Search units, tenants, properties..." : "Search properties by name or address..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'units' && (
            <>
              <select className="filter-select" value={selectedPropertyFilter} onChange={e => setSelectedPropertyFilter(e.target.value)}>
                <option>All Properties</option>
                {properties.map(p => <option key={p.uuid}>{p.name}</option>)}
              </select>

              <div className="filter-group">
                <CreditCardIcon size={14} className="filter-group__icon" />
                <select className="filter-select-minimal" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)}>
                  <option value="all">All Payments</option>
                  <option value="pending">Pending Requests</option>
                </select>
              </div>

              <div className="filter-group">
                <Calendar size={14} className="filter-group__icon" />
                <select className="filter-select-minimal" value={dueFilter} onChange={e => setDueFilter(e.target.value as any)}>
                  <option value="all">Any Due Date</option>
                  <option value="passed">Overdue</option>
                  <option value="30days">Due in 30 days</option>
                  <option value="60days">Due in 60 days</option>
                  <option value="90days">Due in 90 days</option>
                </select>
              </div>
            </>
          )}
        </div>

        {activeTab === 'units' ? (
          <div className="units-grid">
            {filteredUnits.map((unit) => {
              const propName = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId)?.name || 'Unknown Property'
              const unitRequests = paymentRequests?.filter(r => r.unitId === unit.id) || []
              return (
                <UnitCard 
                  key={unit.uuid} 
                  unit={unit} 
                  propertyName={propName} 
                  onRequestPayment={handleOpenPaymentRequest}
                  paymentRequests={unitRequests}
                />
              )
            })}
          </div>
        ) : (
          <div className="properties-grid">
            {filteredProperties.map((prop) => (
              <PropertyCard key={prop.uuid} property={prop} onEdit={openEditProperty} onManageUnits={handleManageUnits} />
            ))}
          </div>
        )}
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
      />

      <ImportModeModal 
        isOpen={showImportModeModal}
        onClose={() => setShowImportModeModal(false)}
        hasProperties={properties.length > 0}
      />
    </>
  )
}
