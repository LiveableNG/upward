'use client'

import React, { useState } from 'react'
import { Plus, Download, Search, FileSpreadsheet, X, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import Papa from 'papaparse'

import { useProperties, useUnits, useCreateProperty, useUpdateProperty, useBulkCreateUnits, useDeleteProperty } from '@/features/pm/hooks/useProperties'
import { PropertyCard } from './PropertyCard'
import { UnitCard } from './UnitCard'
import { AddPropertyModal } from './modals/AddPropertyModal'
import { EditPropertyModal } from './modals/EditPropertyModal'
import { DeletePropertyModal } from './modals/DeletePropertyModal'
import { AddUnitModal } from './modals/AddUnitModal'

import { Property, getPropertyImageUploadUrl } from '../../services/propertyService'

type Tab = 'units' | 'properties'

export function PropertiesView() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('units')
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [editingPropertyUuid, setEditingPropertyUuid] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('All Properties')
  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const [previewUnits, setPreviewUnits] = useState<any[]>([])
  
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
    area: ''
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
    rentFrequency: 'Monthly',
    tenantUuid: ''
  })

  const { success, info, error } = useToast()
  
  const { data: properties } = useProperties()
  const { data: units } = useUnits()
  
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
  const filteredUnits = units.filter(unit => {
    const prop = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId)
    const matchesSearch = 
      unit.unitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.tenant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.tenant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProp = selectedPropertyFilter === 'All Properties' || prop?.name === selectedPropertyFilter
    return matchesSearch && matchesProp
  })

  const filteredProperties = properties.filter(prop => 
    prop.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handlers
  const handleDownloadTemplate = () => {
    const headers = ["Unit Name", "TenantFirstName", "TenantLastName", "TenantEmail", "TenantPhone", "Rent Amount", "RentStartDate", "RentDueDate", "RentFrequency"]
    const rows = [
      ["101", "John", "Doe", "john@example.com", "+2348012345678", "2000000", "2024-01-01", "2024-05-01", "Monthly"],
      ["102", "Jane", "Smith", "jane@example.com", "+2348012345679", "1500000", "2024-02-01", "2024-06-01", "Monthly"],
      ["201", "Alice", "Johnson", "alice@example.com", "+2348012345680", "3000000", "2024-03-01", "2024-07-01", "Annually"],
      ["202", "Bob", "Brown", "bob@example.com", "+2348012345681", "2500000", "2024-04-01", "2024-08-01", "Bi-Annually"]
    ]
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "upward_units_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    success('Template downloaded!')
  }


  const handleManualCreateUnit = () => {
    if (!targetPropertyUuid) return error("Please select a property")
    if (!unitForm.unitName) return error("Unit Name is required")
    
    if (unitForm.tenantPhone && !/^\+234\d{10}$/.test(unitForm.tenantPhone)) {
      return error("Tenant phone must be in format +2348000000000")
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
        rentFrequency: unitForm.rentFrequency,
        tenantUuid: unitForm.tenantUuid,
        status: 'OCCUPIED'
      }]
    }, {
      onSuccess: () => {
        success('Unit created successfully!')
        setShowAddUnitModal(false)
        setUnitForm({ 
          unitName: '', tenantFirstName: '', tenantLastName: '', 
          tenantEmail: '', tenantPhone: '', rentAmount: '',
          rentStartDate: '', rentDueDate: '', rentFrequency: 'Monthly',
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
        area: propForm.area
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
      area: prop.area || ''
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
          area: propForm.area
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
    setPropForm({ name: '', address: '', totalUnits: '', propertyType: 'Residential', imageFile: null, imageUrl: '', country: 'Nigeria', state: '', area: '' })
    setEditingPropertyUuid('')
  }

  const handleManageUnits = (propName: string) => {
    setSelectedPropertyFilter(propName)
    setActiveTab('units')
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
                <button className="btn btn--secondary" onClick={handleDownloadTemplate}>
                  <Download size={18} />
                  Template
                </button>
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
                  onClick={() => properties.length > 0 ? router.push('/properties/import') : error("Please add a property first")}
                  disabled={properties.length === 0}
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
            <select className="filter-select" value={selectedPropertyFilter} onChange={e => setSelectedPropertyFilter(e.target.value)}>
              <option>All Properties</option>
              {properties.map(p => <option key={p.uuid}>{p.name}</option>)}
            </select>
          )}
        </div>

        {activeTab === 'units' ? (
          <div className="units-grid">
            {filteredUnits.map((unit) => {
              const propName = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId)?.name || 'Unknown Property'
              return <UnitCard key={unit.uuid} unit={unit} propertyName={propName} />
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
    </>
  )
}
