import React from 'react'
import Link from 'next/link'
import { User, CreditCard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Unit } from '../../services/propertyService'
import { PmPaymentRequest } from '../../services/paymentService'

interface UnitTableRowProps {
  unit: Unit;
  propertyName: string;
  onRequestPayment?: (unit: Unit) => void;
  paymentRequests?: PmPaymentRequest[];
  property?: any;
}

export const UnitTableRow: React.FC<UnitTableRowProps> = ({ 
  unit, 
  propertyName, 
  property,
  onRequestPayment,
  paymentRequests = []
}) => {
  const pendingRequest = paymentRequests
    .filter(r => r.status !== 'PAID')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <tr className="tenant-table-row" style={{ cursor: 'pointer' }} onClick={(e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      window.location.href = `/properties/units/${unit.uuid}`;
    }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div className="tenant-avatar-small" style={{ background: 'var(--forest)', color: 'white', fontSize: '12px' }}>
            {unit.unitName.slice(0, 2).toUpperCase()}
          </div>
          <div className="tenant-name-email">
            <span className="tenant-name" style={{ fontSize: '13px', fontWeight: 600 }}>{propertyName}</span>
            <span className="tenant-email">Unit {unit.unitName} {property?.address ? `• ${property.address}` : ''}</span>
          </div>
        </div>
      </td>
      <td>
        {unit.tenant ? (
          <div className="tenant-name-email">
            <span className="tenant-name" style={{ fontSize: '13px' }}>{unit.tenant.firstName} {unit.tenant.lastName || ''}</span>
          </div>
        ) : (
          <span className="text-muted" style={{ fontSize: '13px' }}>-</span>
        )}
      </td>
      <td>
        <div className="tenant-name-email">
          <span className="tenant-name" style={{ fontSize: '13px', fontWeight: 600 }}>₦{unit.rentAmount?.toLocaleString()}</span>
          <span className="tenant-email">{unit.rentType}</span>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span className={`badge badge--${unit.status.toLowerCase()}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
            {unit.status.replace('-', ' ')}
          </span>
          {pendingRequest && (
            <div style={{ 
              fontSize: 9, 
              fontWeight: 800, 
              color: 'var(--forest)', 
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
        </div>
      </td>
      <td className="col-actions">
        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
          {unit.status === 'OCCUPIED' && unit.tenant?.email && (
            unit.tenant.inviteStatus === 'PENDING' || unit.tenant.inviteStatus === 'PROCESSING' ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                color: 'var(--clay)', 
                background: 'var(--clay-faint)', 
                padding: '6px 12px', 
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700
              }}>
                <Loader2 size={12} className="animate-spin" />
                Processing...
              </div>
            ) : (
              <button 
                className={cn('btn btn--sm', unit.isSynced ? 'btn--secondary' : 'btn--disabled')}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (unit.isSynced) onRequestPayment?.(unit);
                }}
                title={!unit.isSynced ? "Sync required to request payment" : ""}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <CreditCard size={12} style={{ marginRight: 4 }} />
                {unit.isSynced ? 'Request' : 'Not Synced'}
              </button>
            )
          )}
          <Link href={`/properties/units/${unit.uuid}`} className="btn btn--secondary btn--sm" style={{ fontSize: '12px', padding: '6px 12px' }}>
            View
          </Link>
        </div>
      </td>
    </tr>
  )
}
