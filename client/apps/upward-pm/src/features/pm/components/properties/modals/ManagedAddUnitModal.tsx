"use client"

import React, { useState, useEffect } from 'react'
import { useToast } from '@/components/common/Toast'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { useProperties, useBulkCreateUnits } from '@/features/pm/hooks/useProperties'
import { AddUnitModal } from './AddUnitModal'
import { Property } from '../../../services/propertyService'

interface ManagedAddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyUuid?: string;
  onSuccess?: () => void;
  properties?: Property[];
}

export const ManagedAddUnitModal: React.FC<ManagedAddUnitModalProps> = ({
  isOpen,
  onClose,
  propertyUuid,
  onSuccess,
  properties: passedProperties
}) => {
  const { success, error } = useToast()
  const { data: propertiesData } = useProperties()
  const properties = passedProperties || propertiesData || []
  const bulkCreateUnitsMutation = useBulkCreateUnits()

  const [targetPropertyUuid, setTargetPropertyUuid] = useState(propertyUuid || '')
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
    tenantUuid: '',
    unitType: '', 
    rentAmountPaid: '0'
  })

  // Sync target property uuid if it changes from props
  useEffect(() => {
    if (propertyUuid) setTargetPropertyUuid(propertyUuid)
  }, [propertyUuid])

  const handleSave = () => {
    if (!targetPropertyUuid) return error("Please select a property")
    if (!unitForm.unitName) return error("Unit Name is required")
    if (unitForm.tenantPhone && !isValidPhoneNumber(unitForm.tenantPhone)) {
        return error("Please enter a valid international phone number")
    }
    
    bulkCreateUnitsMutation.mutate({
      propertyUuid: targetPropertyUuid,
      units: [{
        ...unitForm,
        rentAmount: parseFloat(unitForm.rentAmount) || 0,
        rentAmountPaid: parseFloat(unitForm.rentAmountPaid) || 0,
        managementFee: parseFloat(unitForm.managementFee) || 0,
        status: (unitForm.tenantEmail?.trim() || unitForm.tenantFirstName?.trim() || unitForm.tenantLastName?.trim() || unitForm.tenantUuid) ? 'OCCUPIED' : 'VACANT'
      }]
    }, {
      onSuccess: () => {
        success('Unit created successfully!')
        onClose()
        if (onSuccess) onSuccess()
        // Reset form
        setUnitForm({ 
          unitName: '', tenantFirstName: '', tenantLastName: '', tenantEmail: '',
          tenantPhone: '', rentAmount: '', rentStartDate: '', rentDueDate: '',
          rentType: 'Monthly', managementFee: '', notes: '', tenantUuid: '',
          unitType: '', rentAmountPaid: '0'
        })
      },
      onError: (err: any) => error(err?.message || 'Failed to create unit')
    })
  }

  return (
    <AddUnitModal 
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      isPending={bulkCreateUnitsMutation.isPending}
      properties={properties}
      targetPropertyUuid={targetPropertyUuid}
      setTargetPropertyUuid={setTargetPropertyUuid}
      formData={unitForm}
      setFormData={setUnitForm}
    />
  )
}
