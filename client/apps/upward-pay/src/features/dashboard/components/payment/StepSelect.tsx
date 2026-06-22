import React from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { type Landlord } from './types'

export function StepSelect({
  pm,
  pending = [],
  onSelect,
  onNew,
  onSelectPending,
}: {
  pm: Landlord[]
  pending?: any[]
  onSelect: (l: Landlord) => void
  onNew: () => void
  onSelectPending?: (p: any) => void
}) {
  void pm
  void onSelect

  return (
    <div>
      <p className="pay-flow__intro">Select a property or add a new payment destination.</p>

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
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
        </div>
      )}

      <button type="button" className="pay-flow__card pay-flow__card--dashed" onClick={onNew}>
        <div className="pay-flow__card-icon pay-flow__card-icon--soft">
          <Plus size={22} />
        </div>
        <div className="pay-flow__card-body">
          <div className="pay-flow__card-title">Select a Property</div>
          <div className="pay-flow__card-meta pay-flow__card-meta--muted">Pay for rent or other fees</div>
        </div>
        <span className="pay-flow__card-trailing">
          <ChevronRight size={18} />
        </span>
      </button>
    </div>
  )
}
