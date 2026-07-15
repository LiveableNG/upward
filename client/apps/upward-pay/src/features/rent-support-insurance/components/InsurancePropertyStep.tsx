'use client'

import { CheckCircle2, ChevronRight, Home } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { UserProfile } from '@/features/auth/types'
import type { RsiEnrolmentRecord } from '../types'

type Property = NonNullable<UserProfile['properties']>[number]

function formatPropertyAddress(property: Property): string {
  return [
    property.location?.address || property.address,
    property.location?.area,
    property.location?.state,
  ]
    .filter(Boolean)
    .join(', ')
}

interface InsurancePropertyStepProps {
  properties: Property[]
  enrolments: RsiEnrolmentRecord[]
  onSelect: (propertyUuid: string) => void
}

export function InsurancePropertyStep({
  properties,
  enrolments,
  onSelect,
}: InsurancePropertyStepProps) {
  if (properties.length === 0) {
    return (
      <div className="pay-flow__empty">
        <div className="pay-flow__empty-icon">
          <Home size={32} />
        </div>
        <h3 className="pay-flow__empty-title">No active property</h3>
        <p className="pay-flow__empty-text">
          Rent Support Insurance must be linked to an active rental property. Add your tenancy
          details before enrolling.
        </p>
      </div>
    )
  }

  return (
    <div className="rsi-flow">
      <section className="pay-flow__section">
        <p className="pay-flow__section-label">Choose a property</p>
        <div className="pay-flow__property-list">
          {properties.map((property) => {
            const propertyUuid = property.uuid || String(property.id)
            const enrolment = enrolments.find(
              (record) => record.form.propertyUuid === propertyUuid,
            )

            return (
              <button
                key={propertyUuid}
                type="button"
                className="pay-flow__card pay-flow__property-card pay-flow__property-card--compact"
                onClick={() => onSelect(propertyUuid)}
              >
                <div className="pay-flow__card-icon pay-flow__card-icon--home">
                  <Home size={20} />
                </div>
                <div className="pay-flow__card-body">
                  <div className="pay-flow__card-top-row">
                    <div className="pay-flow__card-title">
                      {property.unitName || property.location?.area || property.address || 'Property'}
                    </div>
                    {enrolment ? (
                      <span className="rsi-flow__property-status">
                        <CheckCircle2 size={12} />
                        Enrolled
                      </span>
                    ) : null}
                  </div>
                  <div className="pay-flow__card-meta">{formatPropertyAddress(property)}</div>
                  <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                    {property.rentAmount
                      ? `${formatCurrency(property.rentAmount)}/yr`
                      : 'Rent amount not set'}
                    {property.rentStartDate
                      ? ` · Started ${formatDate(property.rentStartDate)}`
                      : ''}
                  </div>
                </div>
                <ChevronRight size={18} className="pay-flow__card-trailing" />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
