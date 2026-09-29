'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Edit, AlertCircle } from 'lucide-react'
import { useAllianceListing, useUpdateAllianceListing } from '@/features/alliance/hooks/useAlliance'
import { ListingBasicsForm, ListingFormData } from '@/features/alliance/components/ListingBasicsForm'
import { ListingMediaManager } from '@/features/alliance/components/ListingMediaManager'
import { useToast } from '@/components/common/Toast'

export default function EditAllianceListingPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const uuid = params?.uuid as string

  const { data: listing, isLoading: loadingListing, error: listingError } = useAllianceListing(uuid)
  const updateMutation = useUpdateAllianceListing()

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

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        intent: listing.intent || 'RENT',
        price: listing.price || 0,
        currency: listing.currency || 'NGN',
        address: listing.address || '',
        city: listing.city || '',
        state: listing.state || '',
        country: listing.country || 'Nigeria',
        propertyType: listing.propertyType || '',
        bedrooms: listing.bedrooms ?? undefined,
        bathrooms: listing.bathrooms ?? undefined,
      })
    }
  }, [listing])

  const handleFormFieldChange = (field: keyof ListingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Listing title is required.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        uuid,
        payload: {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          intent: formData.intent,
          price: formData.price,
          currency: formData.currency,
          address: formData.address?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          state: formData.state?.trim() || undefined,
          country: formData.country?.trim() || undefined,
          propertyType: formData.propertyType?.trim() || undefined,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
        },
      })

      toast.success('Listing updated successfully!')
      router.push(`/alliance/listings/${uuid}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update listing')
    }
  }

  if (loadingListing) {
    return (
      <div className="page-container" style={{ padding: '48px 20px', textAlign: 'center' }}>
        <div className="loader" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading listing details...</p>
      </div>
    )
  }

  if (listingError || !listing) {
    return (
      <div className="page-container" style={{ padding: '48px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ color: 'var(--text)', marginBottom: '8px' }}>Listing Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          The requested listing could not be found.
        </p>
        <Link href="/alliance/listings" className="btn btn--secondary">
          <ArrowLeft size={16} /> Return to Listings
        </Link>
      </div>
    )
  }

  if (listing.status === 'ARCHIVED') {
    return (
      <div className="page-container" style={{ padding: '48px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--warning)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ color: 'var(--text)', marginBottom: '8px' }}>Archived Listing</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          This listing is archived and cannot be edited.
        </p>
        <Link href={`/alliance/listings/${uuid}`} className="btn btn--secondary">
          <ArrowLeft size={16} /> Back to Details
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href={`/alliance/listings/${uuid}`}
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
          <ArrowLeft size={16} /> Back to Listing Details
        </Link>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={22} color="var(--forest)" /> Edit Alliance Listing
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Update presentation marketing details. Structural source and canonical target identity remain fixed.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ListingBasicsForm
            sourceType={listing.sourceType}
            data={formData}
            onChange={handleFormFieldChange}
            disabled={updateMutation.isPending}
            canonicalReference={
              listing.sourceType === 'LINKED_INVENTORY'
                ? {
                    name: listing.targetProperty ? listing.targetProperty.name : listing.targetUnit?.unitName,
                    address: listing.targetProperty?.address || undefined,
                  }
                : null
            }
          />

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <ListingMediaManager
              listingUuid={uuid}
              isArchived={false}
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
              href={`/alliance/listings/${uuid}`}
              className="btn btn--secondary"
              style={{ height: '44px', padding: '0 20px' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn btn--primary"
              style={{ height: '44px', padding: '0 24px', gap: '8px', fontWeight: 700 }}
            >
              <Save size={16} />
              {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
