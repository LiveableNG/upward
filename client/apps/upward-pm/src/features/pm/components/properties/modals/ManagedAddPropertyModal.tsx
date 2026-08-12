import React, { useState } from 'react'
import { useToast } from '@/components/common/Toast'
import { useCreateProperty } from '@/features/pm/hooks/useProperties'
import { uploadPropertyImage } from '@/features/pm/services/propertyService'
import { AddPropertyModal } from './AddPropertyModal'

interface ManagedAddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isLandlordPortal?: boolean;
}

export const ManagedAddPropertyModal: React.FC<ManagedAddPropertyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isLandlordPortal = false
}) => {
  const { success, info, error } = useToast()
  const createPropertyMutation = useCreateProperty()

  const [propForm, setPropForm] = useState({
    name: '', 
    address: '', 
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
      name: '', address: '', propertyType: 'Residential', 
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
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
        const base64Data = await toBase64(propForm.imageFile);
        const { publicUrl } = await uploadPropertyImage({ 
            base64Data, 
            contentType: propForm.imageFile.type,
            filename: propForm.imageFile.name 
        })
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
      isLandlordPortal={isLandlordPortal}
    />
  )
}
