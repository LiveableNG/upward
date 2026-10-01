'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
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
      <div className="alliance-page-shell" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="loader" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading listing details...</p>
      </div>
    )
  }

  if (listingError || !listing) {
    return (
      <div className="alliance-page-shell">
        <div className="alliance-gate-card">
          <div className="alliance-gate-card__icon-wrap" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
            <AlertCircle size={28} />
          </div>
          <h2 className="alliance-gate-card__title">Listing Not Found</h2>
          <p className="alliance-gate-card__desc">
            The requested listing could not be found or has been removed.
          </p>
          <Link href="/alliance/listings" className="alliance-btn alliance-btn--secondary" style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} /> Return to Listings
          </Link>
        </div>
      </div>
    )
  }

  if (listing.status === 'ARCHIVED') {
    return (
      <div className="alliance-page-shell">
        <div className="alliance-gate-card">
          <div className="alliance-gate-card__icon-wrap">
            <AlertCircle size={28} />
          </div>
          <h2 className="alliance-gate-card__title">Archived Listing</h2>
          <p className="alliance-gate-card__desc">
            This listing is archived and cannot be modified.
          </p>
          <Link href={`/alliance/listings/${uuid}`} className="alliance-btn alliance-btn--secondary" style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} /> Back to Details
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="alliance-page-shell">
      {/* Back Link */}
      <div style={{ maxWidth: '860px', margin: '0 auto 16px auto' }}>
        <Link
          href={`/alliance/listings/${uuid}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Listing Details
        </Link>
      </div>

      {/* Form Card */}
      <div className="alliance-form-card" style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div className="alliance-form-card__header">
          <h1 className="alliance-form-card__title">
            Edit Alliance Listing
          </h1>
          <p className="alliance-form-card__desc">
            Update presentation marketing details and media photography. Canonical source identities remain preserved.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '28px' }}>
            <ListingMediaManager
              listingUuid={uuid}
              isArchived={false}
            />
          </div>

          {/* Submit Actions */}
          <div className="alliance-action-bar">
            <Link
              href={`/alliance/listings/${uuid}`}
              className="alliance-btn alliance-btn--secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="alliance-btn alliance-btn--primary"
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
