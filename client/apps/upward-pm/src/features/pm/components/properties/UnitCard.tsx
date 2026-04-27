import React from 'react'
import Link from 'next/link'
import { User, CreditCard } from 'lucide-react'
import { Unit } from '../../services/propertyService'

interface UnitCardProps {
  unit: Unit;
  propertyName: string;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, propertyName }) => {
  return (
    <Link href={`/properties/units/${unit.uuid}`} className="unit-card-link">
      <div className="unit-card">
      <div className="unit-card__header">
        <div>
          <h3 className="unit-card__id">Unit {unit.unitName}</h3>
          <p className="unit-card__property">{propertyName}</p>
        </div>
        <span className={`badge badge--${unit.status.toLowerCase()}`}>
          {unit.status.replace('-', ' ')}
        </span>
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
  )
}
