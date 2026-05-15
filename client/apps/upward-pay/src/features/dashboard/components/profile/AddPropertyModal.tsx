import React, { useState } from 'react'
import { X, Search, CheckCircle2, UserPlus, Building2, MapPin, Calendar, CreditCard, ChevronRight, Globe, Hash } from 'lucide-react'
import { api } from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import { COUNTRIES, STATES } from '@/lib/location-data'
import { useToast } from '@/components/common/Toast'
import './AddPropertyModal.css'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: any
}

export function AddPropertyModal({ isOpen, onClose, onSuccess, initialData }: AddPropertyModalProps) {
  const [step, setStep] = useState<'LOOKUP' | 'DETAILS'>('LOOKUP')
  const [pmEmail, setPmEmail] = useState('')
  const [pmFound, setPmFound] = useState(false)
  const [pmDetails, setPmDetails] = useState<{ id?: number, name?: string, businessName?: string } | null>(null)
  
  const [formData, setFormData] = useState({
    uuid: undefined as string | undefined,
    pmName: '',
    address: '',
    area: '',
    subarea: '',
    state: STATES['NG']?.[24] || '', // Default Lagos
    country: 'NG',
    rentAmount: '',
    rentStartDate: '',
    rentEndDate: ''
  })

  // Initialize from props when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setPmEmail(initialData.managerEmail || '')
        setFormData({
          uuid: initialData.uuid,
          pmName: initialData.managerName || '',
          address: initialData.location?.address || '',
          area: initialData.location?.area || '',
          subarea: initialData.location?.subarea || '',
          state: initialData.location?.state || STATES['NG']?.[24] || '',
          country: initialData.location?.country || 'NG',
          rentAmount: initialData.rentAmount ? initialData.rentAmount.toString() : '',
          rentStartDate: initialData.rentStartDate ? new Date(initialData.rentStartDate).toISOString().split('T')[0] : '',
          rentEndDate: initialData.rentEndDate ? new Date(initialData.rentEndDate).toISOString().split('T')[0] : ''
        })
        setStep('LOOKUP') 
        setPmFound(false)
        setPmDetails(null)
      } else {
        // Reset
        setPmEmail('')
        setFormData({
          uuid: undefined,
          pmName: '',
          address: '',
          area: '',
          subarea: '',
          state: STATES['NG']?.[24] || '',
          country: 'NG',
          rentAmount: '',
          rentStartDate: '',
          rentEndDate: ''
        })
        setStep('LOOKUP')
        setPmFound(false)
        setPmDetails(null)
      }
    }
  }, [isOpen, initialData])

  const verifyMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post('/user/pm-connection/verify', { email })
      return res.data
    },
    onSuccess: (data) => {
      if (data.found && data.pm) {
        setPmDetails({
          id: data.pm.id,
          name: `${data.pm.firstName} ${data.pm.lastName}`,
          businessName: data.pm.businessName || `${data.pm.firstName} ${data.pm.lastName}`,
        })
        setPmFound(true)
      } else {
        setPmFound(false)
      }
      setStep('DETAILS')
    },
    onError: () => {
      toast.error('Unable to verify this email. You can still enter details manually.', 'Check Failed')
      setStep('DETAILS')
    }
  })

  const toast = useToast()

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (initialData?.isManaged || initialData?.isVerified) {
        throw new Error('This property is managed and cannot be edited from here.')
      }

      const unitDetails: {
        uuid?: string;
        address: string;
        area: string;
        subarea: string;
        state: string;
        country: string;
        rentAmount: number;
        rentStartDate: string;
        rentEndDate: string;
      } = {
        address: formData.address,
        area: formData.area,
        subarea: formData.subarea,
        state: formData.state,
        country: formData.country,
        rentAmount: parseFloat(formData.rentAmount.replace(/,/g, '')),
        rentStartDate: formData.rentStartDate,
        rentEndDate: formData.rentEndDate
      }
      
      if (formData.uuid) unitDetails.uuid = formData.uuid;

      const payload = {
        pmEmail,
        pmName: pmFound ? pmDetails?.name : formData.pmName,
        unitDetails
      }
      
      await api.post('/user/pm-connection/add-unit-request', payload)
    },
    onSuccess: () => {
      toast.success('Your property details have been saved and the manager notified.', 'Property Added')
      onSuccess()
      onClose()
    },
    onError: () => {
      toast.error('Failed to save property details. Please try again.', 'Error')
    }
  })

  if (!isOpen) return null

  return (
    <div className="add-property-modal" onClick={onClose}>
      <div className="add-property-modal__content" onClick={e => e.stopPropagation()}>
        <button className="add-property-modal__close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="add-property-modal__header">
          <div className="add-property-modal__icon-wrapper">
            {step === 'LOOKUP' ? <Search size={28} /> : <Building2 size={28} />}
          </div>
          <h3 className="add-property-modal__title">
            {step === 'LOOKUP' ? 'Add Property Details' : 'Property Details'}
          </h3>
          <p className="add-property-modal__subtitle">
            {step === 'LOOKUP' ? 'First, let\'s find your property manager' : 'Tell us about the property and lease'}
          </p>
        </div>

        <div className="add-property-modal__body">
          {step === 'LOOKUP' ? (
            <form onSubmit={e => { e.preventDefault(); if (pmEmail) verifyMutation.mutate(pmEmail) }} className="add-property-modal__form">
              <div className="add-property-modal__input-container">
                <label className="add-property-modal__label">Property Manager's Email</label>
                <div className="add-property-modal__input-wrapper">
                  <Search size={18} className="add-property-modal__input-icon" />
                  <input 
                    type="email" 
                    className="add-property-modal__input" 
                    placeholder="manager@example.com"
                    value={pmEmail}
                    onChange={e => setPmEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {verifyMutation.isError && (
                <p className="text-sm text-red-500 text-center">Unable to check email. Please try again.</p>
              )}

              <div className="add-property-modal__actions">
                <button 
                  type="submit"
                  className="add-property-modal__btn add-property-modal__btn--primary w-full"
                  disabled={verifyMutation.isPending || !pmEmail}
                >
                  {verifyMutation.isPending ? 'Searching...' : 'Continue'}
                  <ChevronRight size={18} />
                </button>
              </div>
              
              {initialData && (
                <button 
                  type="button"
                  className="add-property-modal__btn add-property-modal__btn--back w-full mt-[-8px]"
                  onClick={() => setStep('DETAILS')}
                >
                  Skip to Details
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={e => { e.preventDefault(); submitMutation.mutate() }} className="add-property-modal__form">
              {pmFound && pmDetails ? (
                <div className="add-property-modal__pm-status add-property-modal__pm-status--found">
                  <div className="add-property-modal__pm-icon">
                    <CheckCircle2 className="text-green-500" size={24} />
                  </div>
                  <div className="add-property-modal__pm-info">
                    <p className="add-property-modal__pm-label">Property Manager Found</p>
                    <p className="add-property-modal__pm-name">{pmDetails.businessName}</p>
                  </div>
                </div>
              ) : (
                <div className="add-property-modal__pm-status">
                  <div className="add-property-modal__pm-icon">
                    <UserPlus className="text-[var(--clay)]" size={20} />
                  </div>
                  <div className="add-property-modal__pm-info">
                    <p className="add-property-modal__pm-label">New Manager Invite</p>
                    <div className="add-property-modal__input-wrapper">
                      <input 
                        type="text" 
                        className="add-property-modal__input add-property-modal__input--no-icon" 
                        placeholder="Manager's Full Name"
                        style={{ padding: '8px 12px', borderRadius: '10px' }}
                        value={formData.pmName}
                        onChange={e => setFormData({ ...formData, pmName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="add-property-modal__input-container">
                <label className="add-property-modal__label">Street Address</label>
                <div className="add-property-modal__input-wrapper">
                  <MapPin size={18} className="add-property-modal__input-icon" />
                  <input 
                    type="text" 
                    className="add-property-modal__input" 
                    placeholder="12 Adeola Odeku"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="add-property-modal__field-group">
                <div className="add-property-modal__input-container">
                  <label className="add-property-modal__label">Area</label>
                  <div className="add-property-modal__input-wrapper">
                    <Building2 size={16} className="add-property-modal__input-icon" />
                    <input 
                      type="text" 
                      className="add-property-modal__input" 
                      placeholder="e.g. Victoria Island"
                      value={formData.area}
                      onChange={e => setFormData({ ...formData, area: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="add-property-modal__input-container">
                  <label className="add-property-modal__label">State</label>
                  <div className="add-property-modal__input-wrapper">
                    <MapPin size={16} className="add-property-modal__input-icon" />
                    <select 
                      className="add-property-modal__input add-property-modal__select"
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      required
                    >
                      {(STATES[formData.country] || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="add-property-modal__field-group">
                <div className="add-property-modal__input-container">
                  <label className="add-property-modal__label">Rent Amount</label>
                  <div className="add-property-modal__input-wrapper">
                    <CreditCard size={16} className="add-property-modal__input-icon" />
                    <input 
                      type="text" 
                      className="add-property-modal__input" 
                      placeholder="2,500,000"
                      value={formData.rentAmount}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        setFormData({ ...formData, rentAmount: val ? parseInt(val, 10).toLocaleString() : '' })
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="add-property-modal__input-container">
                  <label className="add-property-modal__label">Country</label>
                  <div className="add-property-modal__input-wrapper">
                    <Globe size={16} className="add-property-modal__input-icon" />
                    <select 
                      className="add-property-modal__input add-property-modal__select"
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value, state: STATES[e.target.value]?.[0] || '' })}
                    >
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="add-property-modal__field-group">
                <div className="add-property-modal__input-container">
                  <label className="add-property-modal__label">Start Date</label>
                  <div className="add-property-modal__input-wrapper">
                    <Calendar size={16} className="add-property-modal__input-icon" />
                    <input 
                      type="date" 
                      className="add-property-modal__input"
                      value={formData.rentStartDate}
                      onChange={e => setFormData({ ...formData, rentStartDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="add-property-modal__input-container">
                  <label className="add-property-modal__label">End Date</label>
                  <div className="add-property-modal__input-wrapper">
                    <Calendar size={16} className="add-property-modal__input-icon" />
                    <input 
                      type="date" 
                      className="add-property-modal__input"
                      value={formData.rentEndDate}
                      onChange={e => setFormData({ ...formData, rentEndDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="add-property-modal__actions">
                <button 
                  type="button"
                  className="add-property-modal__btn add-property-modal__btn--back"
                  onClick={() => setStep('LOOKUP')}
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className="add-property-modal__btn add-property-modal__btn--primary"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Saving...' : 'Send Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
