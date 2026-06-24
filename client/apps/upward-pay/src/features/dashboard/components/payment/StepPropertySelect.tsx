import React from 'react'
import { Home, ChevronRight, AlertCircle, Plus } from 'lucide-react'

export function StepPropertySelect({
  properties,
  pending = [],
  onSelect,
  onAddProperty,
  onSelectPending,
}: {
  properties: any[]
  pending?: any[]
  onSelect: (prop: any) => void
  onAddProperty: () => void
  onSelectPending?: (p: any) => void
}) {
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
        <button type="button" className="pay-flow__cta" onClick={onAddProperty}>
          Add Property
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="pay-flow__intro">
        Select the property you are making a payment for to ensure your credit score is updated correctly.
      </p>

      {pending.length > 0 && (
        <section className="pay-flow__section">
          <p className="pay-flow__section-label">Pending Invoices</p>
          {pending.map((p) => (
            <div
              key={p.uuid}
              role="button"
              tabIndex={0}
              className="pay-flow__card pay-flow__card--pending"
              onClick={() => onSelectPending?.(p)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectPending?.(p)}
            >
              <div className="pay-flow__card-icon pay-flow__card-icon--primary">
                <ChevronRight size={20} />
              </div>
              <div className="pay-flow__card-body">
                <div className="pay-flow__card-title">{p.company_name || p.description || 'Invoice'}</div>
                <div className="pay-flow__card-meta">
                  {p.manager_name && <span>{p.manager_name} · </span>}
                  {new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: p.currency || 'NGN',
                  }).format((p.total_amount || p.amount || 0) - (p.amountPaid || 0))}
                </div>
              </div>
              {(p.due_date || p.dueDate) && (
                <span className="pay-flow__due-badge">
                  DUE {new Date(p.due_date || p.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      <section className={`pay-flow__section${pending.length > 0 ? ' pay-flow__section--spaced' : ''}`}>
        <p className="pay-flow__section-label">Your Properties</p>
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

        <button type="button" className="pay-flow__card pay-flow__card--dashed" onClick={onAddProperty}>
          <div className="pay-flow__card-icon pay-flow__card-icon--soft">
            <Plus size={22} />
          </div>
          <div className="pay-flow__card-body">
            <div className="pay-flow__card-title">Add Property</div>
            <div className="pay-flow__card-meta pay-flow__card-meta--muted">Pay rent for a new property</div>
          </div>
          <span className="pay-flow__card-trailing">
            <ChevronRight size={18} />
          </span>
        </button>
      </div>
      </section>

      <div className="pay-flow__tip">
        <AlertCircle size={18} className="pay-flow__tip-icon" />
        <p>On-time payments will help your credit score.</p>
      </div>
    </div>
  )
}
