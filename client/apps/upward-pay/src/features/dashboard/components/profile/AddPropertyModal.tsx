import React, { useState } from 'react'
import { X, Search, CheckCircle2, UserPlus, Building2, MapPin, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import { COUNTRIES, STATES } from '@/lib/location-data'

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
    id: undefined as number | undefined,
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
          id: initialData.id,
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
        setStep('LOOKUP') // Give them a chance to change PM or just skip to details
        setPmFound(false)
        setPmDetails(null)
      } else {
        // Reset
        setPmEmail('')
        setFormData({
          id: undefined,
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
    }
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const unitDetails: {
        id?: number;
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
      
      if (formData.id) unitDetails.id = formData.id;

      const payload = {
        pmEmail,
        pmName: pmFound ? pmDetails?.name : formData.pmName,
        unitDetails
      }
      
      await api.post('/user/pm-connection/add-unit-request', payload)
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    }
  })

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-card__header">
          <div>
            <h3 className="modal-card__title">Add Property Details</h3>
            <p className="modal-card__subtitle">
              {step === 'LOOKUP' ? 'First, let\'s find your property manager' : 'Tell us about the property'}
            </p>
          </div>
          <button className="modal-card__close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-card__body">
          {step === 'LOOKUP' ? (
            <form onSubmit={e => { e.preventDefault(); if (pmEmail) verifyMutation.mutate(pmEmail) }} className="flex flex-col gap-5">
              <div className="form-group">
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Property Manager's Email</label>
                <div className="input-wrapper">
                  <Search size={18} className="input-icon" />
                  <input 
                    type="email" 
                    className="form-input form-input--with-icon" 
                    placeholder="manager@example.com"
                    value={pmEmail}
                    onChange={e => setPmEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {verifyMutation.isError && (
                <p className="text-sm text-red-500">Unable to check email. Please try again.</p>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  type="submit"
                  className="btn btn--primary w-full py-3"
                  disabled={verifyMutation.isPending || !pmEmail}
                >
                  {verifyMutation.isPending ? 'Searching...' : 'Continue'}
                </button>
                {initialData && (
                  <button 
                    type="button"
                    className="btn btn--ghost w-full py-2"
                    onClick={() => setStep('DETAILS')}
                  >
                    Skip to Details
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={e => { e.preventDefault(); submitMutation.mutate() }} className="flex flex-col gap-4">
              {pmFound && pmDetails ? (
                <div className="bg-[var(--surface2)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
                  <CheckCircle2 className="text-green-500 flex-shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-medium">Property Manager Found</p>
                    <p className="text-xs text-[var(--text-secondary)]">{pmDetails.businessName}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--surface2)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-3 mb-3">
                    <UserPlus className="text-[var(--clay)] flex-shrink-0" size={20} />
                    <p className="text-sm font-medium">We'll invite your manager to Upward</p>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Manager's Full Name</label>
                    <input 
                      type="text" 
                      className="form-input form-input--sm" 
                      placeholder="e.g. John Smith"
                      value={formData.pmName}
                      onChange={e => setFormData({ ...formData, pmName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Street Address</label>
                  <input 
                    type="text" 
                    className="form-input form-input--sm" 
                    placeholder="12 Adeola Odeku"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Area</label>
                  <input 
                    type="text" 
                    className="form-input form-input--sm" 
                    placeholder="e.g. Victoria Island"
                    value={formData.area}
                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Country</label>
                  <select 
                    className="form-input form-input--sm"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value, state: STATES[e.target.value]?.[0] || '' })}
                  >
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">State</label>
                  <select 
                    className="form-input form-input--sm"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    required
                  >
                    {(STATES[formData.country] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Rent Amount</label>
                <div className="input-wrapper">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">₦</span>
                  <input 
                    type="text" 
                    className="form-input form-input--sm pl-8" 
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Start Date</label>
                  <input 
                    type="date" 
                    className="form-input form-input--sm"
                    value={formData.rentStartDate}
                    onChange={e => setFormData({ ...formData, rentStartDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">End Date</label>
                  <input 
                    type="date" 
                    className="form-input form-input--sm"
                    value={formData.rentEndDate}
                    onChange={e => setFormData({ ...formData, rentEndDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  type="button"
                  className="btn btn--outline w-full py-2.5"
                  onClick={() => setStep('LOOKUP')}
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className="btn btn--primary w-full py-2.5"
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
