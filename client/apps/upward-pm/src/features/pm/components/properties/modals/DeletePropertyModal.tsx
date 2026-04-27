import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface DeletePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  propertyName: string;
}

export const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({ 
  isOpen, onClose, onConfirm, isPending, propertyName 
}) => {
  const [confirmName, setConfirmName] = useState('')
  
  if (!isOpen) return null;

  const isValid = confirmName === propertyName;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--danger" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: 10, 
              borderRadius: 10 
            }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="modal__title" style={{ color: '#ef4444' }}>Delete Property</h2>
              <p className="modal__desc">This action is permanent and irreversible.</p>
            </div>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ 
          background: 'rgba(239, 68, 68, 0.05)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          padding: 16, 
          borderRadius: 12, 
          marginTop: 20,
          marginBottom: 20
        }}>
          <p style={{ margin: 0, fontSize: 14, color: '#b91c1c', fontWeight: 500 }}>
            Warning: Deleting <strong>{propertyName}</strong> will also permanently delete all units, tenant associations, and rent records linked to it.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Type the property name to confirm</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder={propertyName}
            value={confirmName} 
            onChange={e => setConfirmName(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Keep Property
          </button>
          <button 
            className="btn btn--danger" 
            style={{ flex: 1 }} 
            onClick={onConfirm} 
            disabled={!isValid || isPending}
          >
            {isPending ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}
