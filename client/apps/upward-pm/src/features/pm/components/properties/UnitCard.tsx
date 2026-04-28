import React from 'react'
import Link from 'next/link'
import { User, CreditCard } from 'lucide-react'
import { Unit } from '../../services/propertyService'
import { PmPaymentRequest } from '../../services/paymentService'

interface UnitCardProps {
  unit: Unit;
  propertyName: string;
  onRequestPayment?: (unit: Unit) => void;
  paymentRequests?: PmPaymentRequest[];
}

export const UnitCard: React.FC<UnitCardProps> = ({ 
  unit, 
  propertyName, 
  onRequestPayment,
  paymentRequests = []
}) => {
  const pendingRequest = paymentRequests
    .filter(r => r.status !== 'PAID')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return (
    <div className="unit-card-container">
      <Link href={`/properties/units/${unit.uuid}`} className="unit-card-link">
        <div className="unit-card">
          <div className="unit-card__header">
            <div>
              <h3 className="unit-card__id">Unit {unit.unitName}</h3>
              <p className="unit-card__property">{propertyName}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span className={`badge badge--${unit.status.toLowerCase()}`}>
                {unit.status.replace('-', ' ')}
              </span>
              
              {pendingRequest && (
                <div style={{ 
                  fontSize: 9, 
                  fontWeight: 800, 
                  color: 'var(--clay)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  background: 'rgba(239, 68, 68, 0.05)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid rgba(239, 68, 68, 0.1)'
                }}>
                   <div className="pulse-dot"></div>
                   PAYMENT {pendingRequest.status}
                </div>
              )}

              {unit.status === 'OCCUPIED' && unit.tenant?.email && (
                <button 
                  className={`unit-card__request-btn ${!unit.isSynced ? 'unit-card__request-btn--disabled' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (unit.isSynced) onRequestPayment?.(unit);
                  }}
                  title={!unit.isSynced ? "Sync required to request payment" : ""}
                  style={{ 
                    opacity: unit.isSynced ? 1 : 0.6,
                    cursor: unit.isSynced ? 'pointer' : 'not-allowed',
                    background: unit.isSynced ? 'var(--clay)' : 'var(--text-muted)'
                  }}
                >
                  <CreditCard size={12} />
                  {unit.isSynced ? 'Request' : 'Not Synced'}
                </button>
              )}
            </div>
          </div>
          
          <div className="unit-card__body">
            <div className="info-row">
              <span className="info-row__label">
                <User size={12} style={{ marginRight: 4 }} /> 
                Tenant
              </span>
              <span className="info-row__value">
                {unit.tenant ? `${unit.tenant.firstName} ${unit.tenant.lastName || ''}` : 'No Tenant'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">
                <CreditCard size={12} style={{ marginRight: 4 }} /> 
                Rent
              </span>
              <span className="info-row__value">₦{unit.rentAmount?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
