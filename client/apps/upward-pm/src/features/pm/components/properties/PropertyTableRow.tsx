import React from 'react'
import { Menu } from 'lucide-react'
import { Property } from '../../services/propertyService'

interface PropertyTableRowProps {
  property: Property;
  unitCount?: number;
  tenantCount?: number;
  index?: number;
  onEdit: (prop: Property) => void;
  onManageUnits: (name: string) => void;
}

export const PropertyTableRow: React.FC<PropertyTableRowProps> = ({ 
  property, 
  unitCount = 0,
  tenantCount = 0,
  index = 1,
  onEdit, 
  onManageUnits 
}) => {
  return (
    <tr className="tenant-table-row" style={{ cursor: 'pointer' }} onClick={(e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      onManageUnits(property.name);
    }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
             {property.name.charAt(0).toUpperCase()}
          </div>
          <div className="tenant-name-email">
            <span className="tenant-name" style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{property.name}</span>
            <span className="tenant-email" style={{ fontSize: '11px', color: '#94a3b8' }}>
              {property.address}
            </span>
          </div>
        </div>
      </td>
      <td>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          {property.landlordName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
              {property.landlordName}
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </div>
      </td>
      <td style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '13px', color: '#334155' }}>{unitCount}</span>
      </td>
      <td style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '13px', color: '#334155' }}>{tenantCount}</span>
      </td>
      <td className="col-actions">
        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-icon" onClick={(e) => {
            e.stopPropagation();
            onEdit(property);
          }}>
            <Menu size={16} color="#64748b" />
          </button>
        </div>
      </td>
    </tr>
  )
}
