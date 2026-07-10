import React from 'react'
import { Home, ChevronRight, AlertCircle, Plus } from 'lucide-react'
import {
  formatManagerLabel,
  formatPendingInvoiceTitle,
  formatPropertyPaymentSubline,
  formatPropertyTitle,
  getPendingDueBadge,
  getPropertyCardClassName,
  getRentCycleDisplay,
  sortPropertiesForDisplay,
} from './propertyPayDisplay'

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

  const sortedProperties = sortPropertiesForDisplay(properties)

  return (
    <div>
      {pending.length > 0 && (
        <section className="pay-flow__section">
          <p className="pay-flow__section-label">Pending Invoices</p>
          {pending.map((p) => {
            const dueBadge = getPendingDueBadge(p)
            const remaining = (p.total_amount || p.amount || 0) - (p.amountPaid || 0)

            return (
              <div
                key={p.uuid}
                role="button"
                tabIndex={0}
                className={`pay-flow__card pay-flow__card--pending${dueBadge?.overdue ? ' pay-flow__card--overdue' : ''}`}
                onClick={() => onSelectPending?.(p)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectPending?.(p)}
              >
                <div className="pay-flow__card-icon pay-flow__card-icon--primary">
                  <ChevronRight size={20} />
                </div>
                <div className="pay-flow__card-body">
                  <div className="pay-flow__card-top-row">
                    <div className="pay-flow__card-title">{formatPendingInvoiceTitle(p)}</div>
                    {dueBadge ? (
                      <span
                        className={`pay-flow__rent-pill pay-flow__rent-pill--${dueBadge.overdue ? 'expired' : 'soon'}`}
                      >
                        {dueBadge.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="pay-flow__card-meta">
                    {p.manager_name && <span>{p.manager_name} · </span>}
                    {new Intl.NumberFormat('en-NG', {
                      style: 'currency',
                      currency: p.currency || 'NGN',
                    }).format(remaining > 0 ? remaining : p.total_amount || p.amount || 0)}
                  </div>
                </div>
                <ChevronRight size={18} className="pay-flow__card-trailing" />
              </div>
            )
          })}
        </section>
      )}

      <section className={`pay-flow__section${pending.length > 0 ? ' pay-flow__section--spaced' : ''}`}>
        <p className="pay-flow__section-label">Your Properties</p>
        <div className="pay-flow__property-list">
          {sortedProperties.map((prop) => {
            const rentCycle = getRentCycleDisplay(prop)
            const paymentSubline = formatPropertyPaymentSubline(prop)
            const cardToneClass = getPropertyCardClassName(prop)

            return (
              <button
                key={prop.uuid}
                type="button"
                className={`pay-flow__card pay-flow__property-card pay-flow__property-card--compact${cardToneClass ? ` ${cardToneClass}` : ''}`}
                onClick={() => onSelect(prop)}
              >
                <div className="pay-flow__card-body">
                  <div className="pay-flow__card-top-row">
                    <div className="pay-flow__card-title">{formatPropertyTitle(prop)}</div>
                    <span className={`pay-flow__rent-pill pay-flow__rent-pill--${rentCycle.tone}`}>
                      {rentCycle.label}
                    </span>
                  </div>
                  <div className="pay-flow__card-meta">{formatManagerLabel(prop)}</div>
                  {paymentSubline ? (
                    <div className="pay-flow__card-meta pay-flow__card-meta--muted">{paymentSubline}</div>
                  ) : null}
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
