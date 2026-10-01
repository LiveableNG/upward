'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Building2,
  Home,
  CheckCircle2,
  AlertCircle,
  Eye,
  Globe,
  MapPin,
  Info,
} from 'lucide-react'
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

type WizardStep = 1 | 2 | 3 | 4

export default function CreateAllianceListingPage() {
  const router = useRouter()
  const toast = useToast()

  const { data: profile, isLoading: loadingProfile } = useAllianceProfile()
  const createMutation = useCreateAllianceListing()

  // Multi-step Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)

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
    visibility: 'ALLIANCE',
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

  // Prefill when canonical inventory is selected
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

  // Navigation validation handlers
  const canGoToStep2 = true // Step 1 is always valid because defaults are set

  const canGoToStep3 = () => {
    if (sourceType === 'LINKED_INVENTORY') {
      if (targetType === 'PROPERTY') return !!selectedProperty
      if (targetType === 'UNIT') return !!selectedUnit
    }
    return true
  }

  const canGoToStep4 = () => {
    return !!formData.title.trim() && formData.price > 0
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (sourceType === 'LINKED_INVENTORY') {
        setCurrentStep(2)
      } else {
        // Independent listing skips step 2 directly to marketing details
        setCurrentStep(3)
      }
    } else if (currentStep === 2) {
      if (!canGoToStep3()) {
        toast.error(
          targetType === 'PROPERTY'
            ? 'Please select a canonical property before proceeding.'
            : 'Please select a canonical unit before proceeding.'
        )
        return
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      if (!formData.title.trim()) {
        toast.error('Please enter a marketing title.')
        return
      }
      if (!formData.price || formData.price <= 0) {
        toast.error('Please enter a valid price.')
        return
      }
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    if (currentStep === 4) {
      setCurrentStep(3)
    } else if (currentStep === 3) {
      if (sourceType === 'LINKED_INVENTORY') {
        setCurrentStep(2)
      } else {
        setCurrentStep(1)
      }
    } else if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

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
        targetPropertyUuid:
          sourceType === 'LINKED_INVENTORY' && targetType === 'PROPERTY'
            ? selectedProperty?.uuid
            : undefined,
        targetUnitUuid:
          sourceType === 'LINKED_INVENTORY' && targetType === 'UNIT'
            ? selectedUnit?.uuid
            : undefined,
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

      const listingUuid = created?.uuid || (created as any)?.data?.uuid
      toast.success('Listing created as draft!')
      if (listingUuid) {
        router.push(`/alliance/listings/${listingUuid}`)
      } else {
        router.push('/alliance/listings')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create listing')
    }
  }

  if (loadingProfile) {
    return (
      <div className="alliance-page-shell" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="loader" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading Alliance profile...</p>
      </div>
    )
  }

  if (profile && !profile.isEnabled) {
    return (
      <div className="alliance-page-shell">
        <div className="alliance-gate-card">
          <div className="alliance-gate-card__icon-wrap">
            <AlertCircle size={28} />
          </div>
          <h2 className="alliance-gate-card__title">Alliance Access Required</h2>
          <p className="alliance-gate-card__desc">
            Your property management account has not been enabled for Upward Alliance. Please contact platform support.
          </p>
          <Link href="/alliance/listings" className="alliance-btn alliance-btn--secondary" style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} /> Return to Listings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="alliance-page-shell">
      {/* Top Header & Back Link */}
      <div style={{ maxWidth: '860px', margin: '0 auto 20px auto' }}>
        <Link
          href="/alliance/listings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} /> Back to Alliance Listings
        </Link>
      </div>

      <div className="alliance-wizard">
        {/* Stepper Progress Header */}
        <div className="alliance-stepper">
          <button
            type="button"
            className={`alliance-stepper__item ${currentStep === 1 ? 'alliance-stepper__item--active' : ''} ${
              currentStep > 1 ? 'alliance-stepper__item--completed' : ''
            }`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="alliance-stepper__circle">
              {currentStep > 1 ? <CheckCircle2 size={16} /> : 1}
            </div>
            <div className="alliance-stepper__text">
              <span className="alliance-stepper__title">Asset Scope</span>
              <span className="alliance-stepper__subtitle">Scope & Origin</span>
            </div>
          </button>

          {sourceType === 'LINKED_INVENTORY' && (
            <>
              <div
                className={`alliance-stepper__divider ${
                  currentStep > 2 ? 'alliance-stepper__divider--completed' : ''
                }`}
              />
              <button
                type="button"
                className={`alliance-stepper__item ${currentStep === 2 ? 'alliance-stepper__item--active' : ''} ${
                  currentStep > 2 ? 'alliance-stepper__item--completed' : ''
                }`}
                disabled={!canGoToStep2}
                onClick={() => setCurrentStep(2)}
              >
                <div className="alliance-stepper__circle">
                  {currentStep > 2 ? <CheckCircle2 size={16} /> : 2}
                </div>
                <div className="alliance-stepper__text">
                  <span className="alliance-stepper__title">Inventory</span>
                  <span className="alliance-stepper__subtitle">Canonical Asset</span>
                </div>
              </button>
            </>
          )}

          <div
            className={`alliance-stepper__divider ${
              currentStep > 3 ? 'alliance-stepper__divider--completed' : ''
            }`}
          />

          <button
            type="button"
            className={`alliance-stepper__item ${currentStep === 3 ? 'alliance-stepper__item--active' : ''} ${
              currentStep > 3 ? 'alliance-stepper__item--completed' : ''
            }`}
            disabled={!canGoToStep3()}
            onClick={() => canGoToStep3() && setCurrentStep(3)}
          >
            <div className="alliance-stepper__circle">
              {currentStep > 3 ? <CheckCircle2 size={16} /> : sourceType === 'LINKED_INVENTORY' ? 3 : 2}
            </div>
            <div className="alliance-stepper__text">
              <span className="alliance-stepper__title">Marketing Info</span>
              <span className="alliance-stepper__subtitle">Pricing & Details</span>
            </div>
          </button>

          <div
            className={`alliance-stepper__divider ${
              currentStep === 4 ? 'alliance-stepper__divider--completed' : ''
            }`}
          />

          <button
            type="button"
            className={`alliance-stepper__item ${currentStep === 4 ? 'alliance-stepper__item--active' : ''}`}
            disabled={!canGoToStep4()}
            onClick={() => canGoToStep4() && setCurrentStep(4)}
          >
            <div className="alliance-stepper__circle">
              {sourceType === 'LINKED_INVENTORY' ? 4 : 3}
            </div>
            <div className="alliance-stepper__text">
              <span className="alliance-stepper__title">Review & Save</span>
              <span className="alliance-stepper__subtitle">Final Draft</span>
            </div>
          </button>
        </div>

        {/* Step Card Content */}
        <div className="alliance-form-card">
          {/* Step 1: Asset Scope & Source */}
          {currentStep === 1 && (
            <div>
              <div className="alliance-form-card__header">
                <h1 className="alliance-form-card__title">
                  Step 1: Select Scope & Origin
                </h1>
                <p className="alliance-form-card__desc">
                  Choose whether to market an entire property or a specific unit, and connect it to existing inventory or create standalone.
                </p>
              </div>

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

              <div className="alliance-action-bar">
                <Link href="/alliance/listings" className="alliance-btn alliance-btn--secondary">
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleNext}
                  className="alliance-btn alliance-btn--primary"
                >
                  {sourceType === 'LINKED_INVENTORY' ? 'Next: Choose Inventory' : 'Next: Marketing Details'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Canonical Inventory Selection (LINKED_INVENTORY only) */}
          {currentStep === 2 && sourceType === 'LINKED_INVENTORY' && (
            <div>
              <div className="alliance-form-card__header">
                <h1 className="alliance-form-card__title">
                  Step 2: Choose Canonical Inventory
                </h1>
                <p className="alliance-form-card__desc">
                  Select the underlying {targetType === 'PROPERTY' ? 'property' : 'unit'} record from your Upward PM inventory.
                </p>
              </div>

              <LinkedInventorySelector
                targetType={targetType}
                selectedPropertyUuid={selectedProperty?.uuid}
                selectedUnitUuid={selectedUnit?.uuid}
                onSelectProperty={handleSelectProperty}
                onSelectUnit={handleSelectUnit}
                disabled={createMutation.isPending}
              />

              <div className="alliance-action-bar">
                <button
                  type="button"
                  onClick={handleBack}
                  className="alliance-btn alliance-btn--secondary"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoToStep3()}
                  className="alliance-btn alliance-btn--primary"
                >
                  Next: Marketing Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Marketing Information & Pricing */}
          {currentStep === 3 && (
            <div>
              <div className="alliance-form-card__header">
                <h1 className="alliance-form-card__title">
                  Step {sourceType === 'LINKED_INVENTORY' ? '3' : '2'}: Marketing Details & Pricing
                </h1>
                <p className="alliance-form-card__desc">
                  Set public co-brokerage presentation details, visibility preferences, and asking rates.
                </p>
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

              <div className="alliance-action-bar">
                <button
                  type="button"
                  onClick={handleBack}
                  className="alliance-btn alliance-btn--secondary"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!formData.title.trim() || formData.price <= 0 || createMutation.isPending}
                    className="alliance-btn alliance-btn--secondary"
                  >
                    <Save size={16} />
                    {createMutation.isPending ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!formData.title.trim() || formData.price <= 0}
                    className="alliance-btn alliance-btn--primary"
                  >
                    Review & Confirm <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Summary & Confirmation */}
          {currentStep === 4 && (
            <div>
              <div className="alliance-form-card__header">
                <h1 className="alliance-form-card__title">
                  Review Listing Details
                </h1>
                <p className="alliance-form-card__desc">
                  Confirm your marketing configuration. The listing will be saved as a draft and can be published when ready.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div
                  style={{
                    background: 'var(--ivory-dim)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: formData.intent === 'RENT' ? 'rgba(22, 101, 52, 0.12)' : 'rgba(217, 119, 87, 0.15)',
                          color: formData.intent === 'RENT' ? 'var(--forest)' : '#c2501f',
                          marginRight: '8px',
                        }}
                      >
                        {formData.intent === 'RENT' ? 'FOR RENT' : 'FOR SALE'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(0, 0, 0, 0.06)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {targetType === 'PROPERTY' ? 'Entire Property' : 'Individual Unit'}
                      </span>
                    </div>

                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--forest)' }}>
                      ₦{formData.price.toLocaleString()}
                      {formData.intent === 'RENT' && (
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}> /yr</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                    {formData.title}
                  </div>

                  {formData.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {formData.description}
                    </p>
                  )}

                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {sourceType === 'LINKED_INVENTORY' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={14} color="var(--forest)" />
                        Linked: <strong>{targetType === 'PROPERTY' ? selectedProperty?.name : selectedUnit?.unitName}</strong>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={14} color="var(--forest)" />
                        Independent Listing
                      </span>
                    )}

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={14} color="var(--text-muted)" />
                      Visibility: <strong>{formData.visibility === 'ALLIANCE' ? 'Alliance Network' : 'Private'}</strong>
                    </span>

                    {(formData.address || formData.city) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        {[formData.address, formData.city, formData.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="alliance-callout">
                  <Info size={18} className="alliance-callout__icon" />
                  <div className="alliance-callout__content">
                    <strong>Draft Status:</strong> After saving, you can upload listing photography and publish to the Alliance network at any time.
                  </div>
                </div>
              </div>

              <div className="alliance-action-bar">
                <button
                  type="button"
                  onClick={handleBack}
                  className="alliance-btn alliance-btn--secondary"
                >
                  <ArrowLeft size={16} /> Back to Details
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending}
                  className="alliance-btn alliance-btn--primary"
                  style={{ minWidth: '180px' }}
                >
                  <Save size={16} />
                  {createMutation.isPending ? 'Creating Draft...' : 'Save as Draft'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
