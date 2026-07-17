import React from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { ImageUpload } from './ImageUpload'
import { useCountries, useCities } from '../../../hooks/useLocation'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { PhoneInput } from '@/components/common/PhoneInput'
import { useLandlords } from '@/features/pm/hooks/useProperties'
import { Check } from 'lucide-react'

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
  const [showLandlordSuggestions, setShowLandlordSuggestions] = React.useState(false)

  const filteredLandlords = existingLandlords.filter(l => {
    const searchStr = (formData.landlordName || '').toLowerCase()
    if (!searchStr) return true
    return l.name.toLowerCase().includes(searchStr) || l.email.toLowerCase().includes(searchStr)
  })

  const handleSelectLandlord = (l: any) => {
    setFormData({
      ...formData,
      landlordName: l.name,
      landlordEmail: l.email,
      landlordPhone: l.phone
    })
    setShowLandlordSuggestions(false)
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

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg)', borderRadius: 12 }}>
          <h4 style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>Landlord Details (Optional)</h4>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Landlord Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. John Doe" 
              value={formData.landlordName || ''} 
              onChange={e => {
                setFormData({ ...formData, landlordName: e.target.value })
                setShowLandlordSuggestions(true)
              }} 
              onFocus={() => setShowLandlordSuggestions(true)}
            />
            {showLandlordSuggestions && filteredLandlords.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                background: 'white', 
                border: '1px solid var(--border)', 
                borderRadius: 8, 
                zIndex: 10,
                boxShadow: 'var(--shadow-md)',
                marginTop: 4,
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {filteredLandlords.map((l: any) => (
                  <div 
                    key={l.email}
                    style={{ 
                      padding: '10px 12px', 
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => handleSelectLandlord(l)}
                    className="suggestion-item"
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.email}</div>
                    </div>
                    {formData.landlordEmail === l.email && <Check size={14} color="var(--forest)" />}
                  </div>
                ))}
              </div>
            )}
            {showLandlordSuggestions && (
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 5 }} 
                onClick={() => setShowLandlordSuggestions(false)} 
              />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="landlord@email.com" 
                value={formData.landlordEmail || ''} 
                onChange={e => {
                  setFormData({ ...formData, landlordEmail: e.target.value })
                  setShowLandlordSuggestions(true)
                }} 
                onFocus={() => setShowLandlordSuggestions(true)}
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
        </div>

      </Modal>
  )
}
