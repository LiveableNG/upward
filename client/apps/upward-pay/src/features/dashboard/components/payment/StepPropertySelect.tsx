import React from 'react'
import { Home, ChevronRight, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function StepPropertySelect({
  properties,
  onSelect,
}: {
  properties: any[]
  onSelect: (prop: any) => void
}) {
  const router = useRouter()

  if (properties.length === 0) {
    return (
      <div className="pay-flow__empty">
        <div className="pay-flow__empty-icon">
          <Home size={32} />
        </div>
        <h3 className="pay-flow__empty-title">No Properties Linked</h3>
        <p className="pay-flow__empty-text">
          To build your credit score, we need to know which property you&apos;re paying for. Please add your property
          info first.
        </p>
        <button type="button" className="pay-flow__cta" onClick={() => router.push('/dashboard/me')}>
          Add Property Info
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="pay-flow__intro">
        Select the property you are making a payment for to ensure your credit score is updated correctly.
      </p>

      <div className="pay-flow__property-list">
        {properties.map((prop) => {
          const loc = prop.location
          const fullAddr = [prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
          const managerName =
            prop.company?.name ||
            prop.companyName ||
            (prop.manager?.firstName ? `${prop.manager.firstName} ${prop.manager.lastName || ''}` : null) ||
            prop.managerName ||
            'Private Landlord'

          return (
            <button
              key={prop.uuid}
              type="button"
              className="pay-flow__card pay-flow__property-card"
              onClick={() => onSelect(prop)}
            >
              <div className="pay-flow__card-icon pay-flow__card-icon--home">
                <Home size={22} />
              </div>
              <div className="pay-flow__card-body">
                <div className="pay-flow__card-title">
                  {managerName}
                  {(prop.subaccount || prop.dedicatedAccount || prop.isVerified) && (
                    <span className="pay-flow__badge">
                      <span className="pay-flow__badge-dot" />
                      {prop.isVerified ? 'Verified' : 'Verified Recipient'}
                    </span>
                  )}
                </div>
                <div className="pay-flow__card-meta">{fullAddr || 'Address not set'}</div>
              </div>
              <ChevronRight size={18} className="pay-flow__card-trailing" />
            </button>
          )
        })}
      </div>

      <div className="pay-flow__tip">
        <AlertCircle size={18} className="pay-flow__tip-icon" />
        <p>On-time payments will help your credit score.</p>
      </div>
    </div>
  )
}
