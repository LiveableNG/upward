import React from 'react'
import { X } from 'lucide-react'
import { ImageUpload } from './ImageUpload'

interface EditPropertyModalProps {
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

export const EditPropertyModal: React.FC<EditPropertyModalProps> = ({ 
  isOpen, onClose, onSave, isPending, formData, setFormData 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Edit Property</h2>
            <p className="modal__desc">Update the details of your property.</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <ImageUpload 
          label="Property Image" 
          value={formData.imageUrl}
          onChange={(file) => setFormData({ ...formData, imageFile: file })} 
          onClear={() => setFormData({ ...formData, imageUrl: '' })}
        />

        <div className="form-group">
          <label className="form-label">Property Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Full Address</label>
          <input 
            type="text" 
            className="form-input" 
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
