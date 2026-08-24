import React from 'react'
import { X, Users, Check, UserPlus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { ImageUpload } from './ImageUpload'
import { useCountries, useCities } from '../../../hooks/useLocation'
import { useTeam } from '@/features/pm/hooks/useTeam'
import { useLandlords } from '@/features/pm/hooks/useProperties'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { PhoneInput } from '@/components/common/PhoneInput'
import { cn } from '@/lib/utils'

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
  formData: {
    name: string;
    address: string;
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
  isLandlordPortal?: boolean;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ 
  isOpen, onClose, onSave, isPending, formData, setFormData, isLandlordPortal = false 
}) => {
  const { data: countriesData } = useCountries()
  const { data: citiesData, isLoading: isLoadingCities } = useCities(formData.country || '')
  const { data: team = [] } = useTeam()
  const { data: existingLandlords = [] } = useLandlords()
  const [landlordMode, setLandlordMode] = React.useState<'NONE' | 'NEW' | 'EXISTING'>(
    formData.landlordEmail ? 'EXISTING' : 'NONE'
  )

  const handleToggleLandlordMode = (mode: 'NONE' | 'NEW' | 'EXISTING') => {
    setLandlordMode(mode === landlordMode ? 'NONE' : mode)
    if (mode === 'NONE' || mode === landlordMode) {
        setFormData({
            ...formData,
            landlordName: '',
            landlordEmail: '',
            landlordPhone: ''
        })
    }
  }



  const phoneError = formData.landlordPhone && !isValidPhoneNumber(formData.landlordPhone)
    ? 'Invalid international phone number'
    : undefined

  const emailError = formData.landlordEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.landlordEmail)
    ? 'Invalid email address'
    : undefined

  const isInvalid = !isLandlordPortal && (!!phoneError || !!emailError) || !formData.name || !formData.address

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Property"
      subtitle="Register a new building or estate to your portfolio."
      maxWidth={600}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={onSave} disabled={isPending || isInvalid}>
            {isPending ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      }
    >

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
            <FormSelect 
              value={formData.country || ''} 
              onChange={val => setFormData({ ...formData, country: val, state: '' })}
              options={countriesData?.data?.map(c => ({ label: c.name, value: c.name })) || []}
              placeholder="Select Country"
            />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <FormSelect 
              value={formData.state || ''} 
              onChange={val => setFormData({ ...formData, state: val })}
              options={citiesData?.data?.map(city => ({ label: city, value: city })) || []}
              placeholder={isLoadingCities ? 'Loading...' : 'Select State'}
            />
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

        <div className="form-group">
          <label className="form-label">Property Type</label>
          <FormSelect 
            value={formData.propertyType} 
            onChange={val => setFormData({ ...formData, propertyType: val })}
            options={[
              { label: 'Residential', value: 'Residential' },
              { label: 'Commercial', value: 'Commercial' },
              { label: 'Mixed Use', value: 'Mixed Use' }
            ]}
          />
        </div>

        {!isLandlordPortal && (
          <>
            <div style={{ marginTop: 24, padding: 16, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} color="var(--forest)" />
                    <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Landlord Assignment</h4>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        className={cn("btn btn--sm", landlordMode === 'NEW' ? "btn--primary" : "btn--secondary")}
                        style={{ fontSize: 11, padding: '6px 12px' }}
                        onClick={() => handleToggleLandlordMode('NEW')}
                    >
                        <UserPlus size={14} /> New Landlord
                    </button>
                    <button 
                        className={cn("btn btn--sm", landlordMode === 'EXISTING' ? "btn--primary" : "btn--secondary")}
                        style={{ fontSize: 11, padding: '6px 12px' }}
                        onClick={() => handleToggleLandlordMode('EXISTING')}
                    >
                        <Users size={14} /> Existing
                    </button>
                </div>
              </div>

              {landlordMode === 'NONE' && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', margin: 0 }}>
                    Optional: Link a landlord to this property.
                </p>
              )}

              {landlordMode !== 'NONE' && (
                <div className="animate-fade-in">
                  {landlordMode === 'EXISTING' ? (
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Select Existing Landlord</label>
                      <FormSelect
                        value={formData.landlordEmail || ''}
                        onChange={val => {
                          const selected = existingLandlords.find(l => l.email === val)
                          if (selected) {
                            setFormData({
                              ...formData,
                              landlordName: selected.name || '',
                              landlordEmail: selected.email || '',
                              landlordPhone: selected.phone || ''
                            })
                          }
                        }}
                        options={existingLandlords.map(l => ({ label: `${l.name} (${l.email})`, value: l.email }))}
                        placeholder="-- Choose Landlord --"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 11 }}>Landlord Name</label>
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
                          <label className="form-label" style={{ fontSize: 11 }}>Email Address</label>
                          <input 
                            type="email" 
                            className="form-input" 
                            placeholder="landlord@email.com" 
                            value={formData.landlordEmail || ''} 
                            onChange={e => setFormData({ ...formData, landlordEmail: e.target.value })} 
                          />
                          {emailError && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{emailError}</p>}
                        </div>
                        <div className="form-group">
                          <PhoneInput 
                            label="Phone Number" 
                            value={formData.landlordPhone || ''}
                            onValueChange={(val) => setFormData({ ...formData, landlordPhone: val })}
                            placeholder="e.g. +234..."
                            error={phoneError}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
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
          </>
        )}

    </Modal>
  )
}
