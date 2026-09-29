'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Sparkles, Building2, Home } from 'lucide-react'
import {
  AllianceTargetType,
  AllianceSourceType,
} from '@/features/alliance/types/alliance.types'
import { useAllianceProfile, useCreateAllianceListing } from '@/features/alliance/hooks/useAlliance'
import { ListingSourceSelector } from '@/features/alliance/components/ListingSourceSelector'
import { LinkedInventorySelector } from '@/features/alliance/components/LinkedInventorySelector'
import { ListingBasicsForm, ListingFormData } from '@/features/alliance/components/ListingBasicsForm'
import { Property, Unit } from '@/features/pm/services/propertyService'
import { useToast } from '@/components/common/Toast'

export default function CreateAllianceListingPage() {
  const router = useRouter()
  const toast = useToast()

  const { data: profile, isLoading: loadingProfile } = useAllianceProfile()
  const createMutation = useCreateAllianceListing()

  // Source / Target selection
  const [targetType, setTargetType] = useState<AllianceTargetType>('PROPERTY')
  const [sourceType, setSourceType] = useState<AllianceSourceType>('LINKED_INVENTORY')

  // Selected canonical inventory
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

  // Presentation form data
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    intent: 'RENT',
    price: 0,
    currency: 'NGN',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    propertyType: '',
    bedrooms: undefined,
    bathrooms: undefined,
  })

  // When canonical inventory is selected, prefill some default title/price suggestions for convenience
  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property)
    if (!formData.title) {
      setFormData((prev) => ({
        ...prev,
        title: property.name,
        address: property.address || prev.address,
        city: property.area || prev.city,
        state: property.state || prev.state,
      }))
    }
  }

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit)
    if (!formData.title) {
      setFormData((prev) => ({
        ...prev,
        title: `${unit.unitName} - ${unit.property?.name || 'Property'}`,
        price: unit.rentAmount || prev.price,
      }))
    }
  }

  const handleFormFieldChange = (field: keyof ListingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.isEnabled) {
      toast.error('Upward Alliance access is currently disabled for your account.')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a listing title.')
      return
    }

    if (sourceType === 'LINKED_INVENTORY') {
      if (targetType === 'PROPERTY' && !selectedProperty) {
        toast.error('Please select a canonical property from your inventory.')
        return
      }
      if (targetType === 'UNIT' && !selectedUnit) {
        toast.error('Please select a canonical unit from your inventory.')
        return
      }
    }

    try {
      const created = await createMutation.mutateAsync({
        sourceType,
        targetType,
        intent: formData.intent,
        targetPropertyUuid: sourceType === 'LINKED_INVENTORY' && targetType === 'PROPERTY' ? selectedProperty?.uuid : undefined,
        targetUnitUuid: sourceType === 'LINKED_INVENTORY' && targetType === 'UNIT' ? selectedUnit?.uuid : undefined,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        currency: formData.currency,
        price: formData.price,
        address: formData.address?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        propertyType: formData.propertyType?.trim() || undefined,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
      })

      toast.success('Listing created as draft!')
      router.push(`/alliance/listings/${created.uuid}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create listing')
    }
  }

  if (loadingProfile) {
    return (
      <div className="page-container" style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div className="loader" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading Alliance profile...</p>
      </div>
    )
  }

  if (profile && !profile.isEnabled) {
    return (
      <div className="page-container" style={{ padding: '32px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Alliance Access Required</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Your property management account has not been enabled for Upward Alliance. Please contact platform support.
        </p>
        <Link href="/alliance/listings" className="btn btn--secondary">
          <ArrowLeft size={16} /> Back to Listings
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/alliance/listings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Alliance Listings
        </Link>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="var(--forest)" /> Create New Alliance Listing
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure your marketing representation. New listings are created as drafts before publication.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Step 1: Target & Source selection */}
          <ListingSourceSelector
            targetType={targetType}
            sourceType={sourceType}
            onTargetTypeChange={(t) => {
              setTargetType(t)
              setSelectedProperty(null)
              setSelectedUnit(null)
            }}
            onSourceTypeChange={(s) => {
              setSourceType(s)
              setSelectedProperty(null)
              setSelectedUnit(null)
            }}
            disabled={createMutation.isPending}
          />

          {/* Step 2: Canonical inventory selection (if LINKED_INVENTORY) */}
          {sourceType === 'LINKED_INVENTORY' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>
                3. Choose Canonical Inventory
              </div>
              <LinkedInventorySelector
                targetType={targetType}
                selectedPropertyUuid={selectedProperty?.uuid}
                selectedUnitUuid={selectedUnit?.uuid}
                onSelectProperty={handleSelectProperty}
                onSelectUnit={handleSelectUnit}
                disabled={createMutation.isPending}
              />
            </div>
          )}

          {/* Step 3: Presentation Marketing Information */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
              {sourceType === 'LINKED_INVENTORY' ? '4.' : '3.'} Alliance Marketing Information
            </div>
            <ListingBasicsForm
              sourceType={sourceType}
              data={formData}
              onChange={handleFormFieldChange}
              disabled={createMutation.isPending}
              canonicalReference={
                sourceType === 'LINKED_INVENTORY'
                  ? {
                      name: targetType === 'PROPERTY' ? selectedProperty?.name : selectedUnit?.unitName,
                      address: selectedProperty?.address,
                      canonicalRent: selectedUnit?.rentAmount,
                    }
                  : null
              }
            />
          </div>

          {/* Submit Actions */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Link
              href="/alliance/listings"
              className="btn btn--secondary"
              style={{ height: '44px', padding: '0 20px' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn--primary"
              style={{ height: '44px', padding: '0 24px', gap: '8px', fontWeight: 700 }}
            >
              <Save size={16} />
              {createMutation.isPending ? 'Saving Draft...' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
