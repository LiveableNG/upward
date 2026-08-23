import React from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { ImageUpload } from './ImageUpload'
import { useCountries, useCities } from '../../../hooks/useLocation'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { PhoneInput } from '@/components/common/PhoneInput'
import { useLandlords } from '@/features/pm/hooks/useProperties'
import { Check, Users, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditPropertyModalProps {
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
  };
  setFormData: (data: any) => void;
  onDelete: () => void;
}

export const EditPropertyModal: React.FC<EditPropertyModalProps> = ({ 
  isOpen, onClose, onSave, isPending, formData, setFormData, onDelete
}) => {
  const { data: countriesData } = useCountries()
  const { data: citiesData, isLoading: isLoadingCities } = useCities(formData.country || '')
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

  const isInvalid = !!phoneError || !!emailError || !formData.name || !formData.address

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Edit Property" 
      subtitle="Update the details of your property."
      maxWidth={600}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--danger btn--ghost" style={{ flex: 1 }} onClick={onDelete}>
            Delete Property
          </button>
          <button className="btn btn--secondary" style={{ marginLeft: 'auto', width: 100 }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" style={{ width: 140 }} onClick={onSave} disabled={isPending || isInvalid}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
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

        <div style={{ marginTop: 20, padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 140px', minWidth: 0 }}>
                <Users size={16} color="var(--forest)" style={{ flexShrink: 0 }} />
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>Landlord Assignment</h4>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                <button 
                    className={cn("btn btn--sm", landlordMode === 'NEW' ? "btn--primary" : "btn--secondary")}
                    style={{ fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' }}
                    onClick={() => handleToggleLandlordMode('NEW')}
                >
                    <UserPlus size={13} /> New Landlord
                </button>
                <button 
                    className={cn("btn btn--sm", landlordMode === 'EXISTING' ? "btn--primary" : "btn--secondary")}
                    style={{ fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' }}
                    onClick={() => handleToggleLandlordMode('EXISTING')}
                >
                    <Users size={13} /> Existing
                </button>
            </div>
          </div>

          {landlordMode === 'NONE' && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0', margin: 0 }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
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

      </Modal>
  )
}
