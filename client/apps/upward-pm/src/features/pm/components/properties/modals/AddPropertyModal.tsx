import React from 'react'
import { X, Users, Check } from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { useCountries, useCities } from '../../../hooks/useLocation'
import { useTeam } from '@/features/pm/hooks/useTeam'

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
    collaborationEnabled?: boolean;
    collaboratorUuids?: string[];
  };
  setFormData: (data: any) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ 
  isOpen, onClose, onSave, isPending, formData, setFormData 
}) => {
  const { data: countriesData } = useCountries()
  const { data: citiesData, isLoading: isLoadingCities } = useCities(formData.country || '')
  const { data: team = [] } = useTeam()

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

        {/* Collaboration Section */}
        <div style={{ marginTop: 24, padding: 16, background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="var(--forest)" />
                <h4 style={{ fontSize: 13, fontWeight: 700 }}>Enable Collaboration</h4>
            </div>
            <label className="switch" style={{ cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={!!formData.collaborationEnabled}
                onChange={e => setFormData({ ...formData, collaborationEnabled: e.target.checked })}
                style={{ display: 'none' }}
              />
              <div style={{ 
                  width: 40, 
                  height: 22, 
                  background: formData.collaborationEnabled ? 'var(--forest)' : 'var(--border)', 
                  borderRadius: 100,
                  position: 'relative',
                  transition: 'background 0.2s'
              }}>
                  <div style={{ 
                      width: 16, 
                      height: 16, 
                      background: 'white', 
                      borderRadius: '50%', 
                      position: 'absolute', 
                      top: 3, 
                      left: formData.collaborationEnabled ? 21 : 3,
                      transition: 'left 0.2s'
                  }} />
              </div>
            </label>
          </div>
          
          {formData.collaborationEnabled && (
            <div className="animate-fade-in">
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Assign team members to manage this property. Members with "All Properties" access are already included.
                </p>
                <div style={{ maxHeight: 120, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {team.filter((m: any) => m.status === 'ACCEPTED' && m.accessLevel === 'CUSTOM').map((collab: any) => (
                        <div 
                            key={collab.uuid}
                            onClick={() => {
                                const current = formData.collaboratorUuids || []
                                const next = current.includes(collab.member.uuid)
                                    ? current.filter(u => u !== collab.member.uuid)
                                    : [...current, collab.member.uuid]
                                setFormData({ ...formData, collaboratorUuids: next })
                            }}
                            style={{ 
                                padding: '8px 12px', 
                                borderRadius: 8, 
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: (formData.collaboratorUuids || []).includes(collab.member.uuid) ? 'white' : 'transparent',
                                fontSize: 12,
                                fontWeight: 600,
                                border: '1px solid ' + ((formData.collaboratorUuids || []).includes(collab.member.uuid) ? 'var(--forest)' : 'transparent'),
                                boxShadow: (formData.collaboratorUuids || []).includes(collab.member.uuid) ? 'var(--shadow-sm)' : 'none'
                            }}
                        >
                            {collab.member.firstName} {collab.member.lastName}
                            {(formData.collaboratorUuids || []).includes(collab.member.uuid) && <Check size={14} color="var(--forest)" />}
                        </div>
                    ))}
                    {team.filter((m: any) => m.status === 'ACCEPTED' && m.accessLevel === 'CUSTOM').length === 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                            No collaborators with custom access found.
                        </div>
                    )}
                </div>
            </div>
          )}
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
