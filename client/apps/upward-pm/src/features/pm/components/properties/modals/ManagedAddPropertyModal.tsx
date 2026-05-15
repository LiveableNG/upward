import React, { useState } from 'react'
import { useToast } from '@/components/common/Toast'
import { useCreateProperty } from '@/features/pm/hooks/useProperties'
import { getPropertyImageUploadUrl } from '@/features/pm/services/propertyService'
import { AddPropertyModal } from './AddPropertyModal'

interface ManagedAddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManagedAddPropertyModal: React.FC<ManagedAddPropertyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { success, info, error } = useToast()
  const createPropertyMutation = useCreateProperty()

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
    landlordPhone: '',
    collaborationEnabled: false, 
    collaboratorUuids: [] as string[]
  })

  const resetForm = () => {
    setPropForm({ 
      name: '', address: '', totalUnits: '', propertyType: 'Residential', 
      imageFile: null, imageUrl: '', country: 'Nigeria', state: '', area: '',
      landlordName: '', landlordEmail: '', landlordPhone: '',
      collaborationEnabled: false, collaboratorUuids: []
    })
  }

  const handleSave = async () => {
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
      
      const payload = {
        name: propForm.name,
        address: propForm.address,
        totalUnits: parseInt(propForm.totalUnits) || 0,
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
          onClose()
          resetForm()
          if (onSuccess) onSuccess()
        },
        onError: (err: any) => error(err?.message || 'Failed to create property')
      })
    } catch (err) { 
        error("Failed to upload image") 
    }
  }

  return (
    <AddPropertyModal 
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      isPending={createPropertyMutation.isPending}
      formData={propForm}
      setFormData={setPropForm}
    />
  )
}
