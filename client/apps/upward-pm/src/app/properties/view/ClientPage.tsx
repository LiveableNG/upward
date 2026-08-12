'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useProperty, useUnits, useUpdateProperty, useDeleteProperty } from '@/features/pm/hooks/useProperties'
import { getPropertyImageUploadUrl, uploadPropertyImage } from '@/features/pm/services/propertyService'
import { PropertyDetailView } from '@/features/pm/components/properties/PropertyDetailView'
import { DetailSkeleton } from '@/components/skeletons'
import { EditPropertyModal } from '@/features/pm/components/properties/modals/EditPropertyModal'
import { DeletePropertyModal } from '@/features/pm/components/properties/modals/DeletePropertyModal'
import { useToast } from '@/components/common/Toast'

function PropertyDetailContent() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')
  const router = useRouter()
  const { success, error: notifyError } = useToast()
  
  const { data: property, refetch } = useProperty(uuid as string)
  const { data: units = [] } = useUnits(uuid as string)
  const updatePropertyMutation = useUpdateProperty()
  const deletePropertyMutation = useDeleteProperty()

  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [propForm, setPropForm] = React.useState({
    name: '', address: '', totalUnits: '', propertyType: 'Residential',
    imageUrl: '', country: 'Nigeria', state: '', area: '',
    landlordName: '', landlordEmail: '', landlordPhone: '',
    imageFile: null as File | null
  })

  const handleEditClick = () => {
    if (!property) return
    setPropForm({
      name: property.name,
      address: property.address,
      totalUnits: property.totalUnits.toString(),
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

  const handleSave = async () => {
    let finalImageUrl = propForm.imageUrl;
    
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
    } catch (err) {
      notifyError("Failed to upload image")
      return;
    }

    const { imageFile, ...restForm } = propForm;
    const dataToSend = {
      ...restForm,
      imageUrl: finalImageUrl,
      totalUnits: parseInt(propForm.totalUnits, 10) || 0
    }

    updatePropertyMutation.mutate({ uuid: uuid as string, data: dataToSend as any }, {
      onSuccess: () => {
        success('Property updated successfully')
        setShowEditModal(false)
        refetch()
      },
      onError: (err: any) => notifyError(err.message || 'Failed to update property')
    })
  }

  const handleDelete = () => {
    deletePropertyMutation.mutate(uuid as string, {
      onSuccess: () => {
        success('Property deleted successfully')
        router.push('/properties')
      },
      onError: (err: any) => notifyError(err.message || 'Failed to delete property')
    })
  }

  if (!property) return null

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 40px 0' }}>
      <PropertyDetailView 
        property={property} 
        units={units} 
        onBack={() => router.push('/properties')}
        onViewUnit={(unit) => router.push(`/properties/units/view?uuid=${unit.uuid}`)}
        onEdit={handleEditClick}
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
    </div>
  )
}

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PropertyDetailContent />
    </Suspense>
  )
}
