import React from 'react'
import { X } from 'lucide-react'
import { ImageUpload } from './ImageUpload'

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
  };
  setFormData: (data: any) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ 
  isOpen, onClose, onSave, isPending, formData, setFormData 
}) => {
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
