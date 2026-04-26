import React from 'react'
import { MapPin, ChevronRight, Edit2 } from 'lucide-react'
import { Property } from '../../services/propertyService'

interface PropertyCardProps {
  property: Property;
  onEdit: (prop: Property) => void;
  onManageUnits: (name: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onManageUnits }) => {
  const getPlaceholderImage = () => {
    switch(property.propertyType) {
      case 'Commercial': 
        return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400'
      case 'Mixed Use':
        return 'https://images.unsplash.com/photo-1449156001511-5359e7b396bb?auto=format&fit=crop&q=80&w=400'
      default:
        return 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=400'
    }
  }

  return (
    <div className="prop-card">
      <div className="prop-card__img">
        <img 
          src={property.imageUrl || getPlaceholderImage()} 
          alt={property.name} 
        />
      </div>
      <div className="prop-card__content">
        <div className="prop-card__info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="prop-card__title">{property.name}</h3>
          <button onClick={() => onEdit(property)} style={{ color: 'var(--text-muted)' }}>
            <Edit2 size={16} />
          </button>
        </div>
        <p className="prop-card__address">
          <MapPin size={12} style={{ marginRight: 4 }} />
          {property.address}
        </p>
        
        <div className="prop-card__stats">
          <div className="prop-stat">
            <span className="prop-stat__val">{property.totalUnits}</span>
            <span className="prop-stat__lbl">Units</span>
          </div>
        </div>

        <button className="prop-card__action" onClick={() => onManageUnits(property.name)}>
          Manage Units
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
