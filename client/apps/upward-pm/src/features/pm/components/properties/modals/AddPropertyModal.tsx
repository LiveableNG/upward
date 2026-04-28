import React from 'react'
import { X } from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { useCountries, useCities } from '../../../hooks/useLocation'

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
  formData: {
    name: string;
    address: string;
    totalUnits: string;
    propertyType: string;
    imageUrl?: string;
    country?: string;
    state?: string;
    area?: string;
    landlordName?: string;
    landlordEmail?: string;
    landlordPhone?: string;
  };
  setFormData: (data: any) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ 
  isOpen, onClose, onSave, isPending, formData, setFormData 
}) => {
  const { data: countriesData } = useCountries()
  const { data: citiesData, isLoading: isLoadingCities } = useCities(formData.country || '')

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Add New Property</h2>
            <p className="modal__desc">Register a new building or estate to your portfolio.</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <ImageUpload 
          label="Property Image" 
          value={formData.imageUrl}
          onChange={(file) => setFormData({ ...formData, imageFile: file })} 
        />

        <div className="form-group">
          <label className="form-label">Property Name</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. Lekki Heights Phase 2" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Full Address</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Enter building address" 
            value={formData.address} 
            onChange={e => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Country</label>
            <select 
              className="form-input" 
              value={formData.country} 
              onChange={e => setFormData({ ...formData, country: e.target.value, state: '' })}
            >
              <option value="">Select Country</option>
              {countriesData?.data?.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <select 
              className="form-input" 
              value={formData.state} 
              onChange={e => setFormData({ ...formData, state: e.target.value })}
              disabled={!formData.country || isLoadingCities}
            >
              <option value="">{isLoadingCities ? 'Loading...' : 'Select State'}</option>
              {citiesData?.data?.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Area</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Lekki" 
              value={formData.area} 
              onChange={e => setFormData({ ...formData, area: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Total Units</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="0" 
              value={formData.totalUnits} 
              onChange={e => setFormData({ ...formData, totalUnits: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Property Type</label>
            <select 
              className="form-input" 
              value={formData.propertyType} 
              onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
            >
              <option>Residential</option>
              <option>Commercial</option>
              <option>Mixed Use</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg)', borderRadius: 12 }}>
          <h4 style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>Landlord Details (Optional)</h4>
          <div className="form-group">
            <label className="form-label">Landlord Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. John Doe" 
              value={formData.landlordName || ''} 
              onChange={e => setFormData({ ...formData, landlordName: e.target.value })} 
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="landlord@email.com" 
                value={formData.landlordEmail || ''} 
                onChange={e => setFormData({ ...formData, landlordEmail: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="+234..." 
                value={formData.landlordPhone || ''} 
                onChange={e => setFormData({ ...formData, landlordPhone: e.target.value })} 
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={onSave} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      </div>
    </div>
  )
}
