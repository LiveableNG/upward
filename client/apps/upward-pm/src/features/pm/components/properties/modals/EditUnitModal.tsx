import React, { useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { X, Building2, CreditCard, Home, Settings, Bell } from 'lucide-react'
import { Unit } from '../../../services/propertyService'
import { useForm } from 'react-hook-form'

interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit;
  onSave: (data: any) => void;
  isPending: boolean;
  hasPayments?: boolean;
}

export const EditUnitModal: React.FC<EditUnitModalProps> = ({
  isOpen, onClose, unit, onSave, isPending, hasPayments
}) => {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      unitName: unit.unitName || '',
      unitType: unit.unitType || '',
      rentType: unit.rentType || 'Annually',
      currency: unit.currency || 'NGN',
      rentAmount: unit.rentAmount || 0,
      managementFee: unit.managementFee || 0,
      rentReminderEnabled: unit.rentReminderEnabled || false,
      rentReminderDaysBefore: unit.rentReminderDaysBefore || 7,
      rentStartDate: unit.rentStartDate ? new Date(unit.rentStartDate).toISOString().split('T')[0] : '',
      rentDueDate: unit.rentDueDate ? new Date(unit.rentDueDate).toISOString().split('T')[0] : '',
    }
  })

  const isReminderEnabled = watch('rentReminderEnabled')
  const hasContactInfo = unit?.tenant ? !!(unit.tenant.email || unit.tenant.phone) : true;

  useEffect(() => {
    if (unit && isOpen) {
      reset({
        unitName: unit.unitName || '',
        unitType: unit.unitType || '',
        rentType: unit.rentType || 'Annually',
        currency: unit.currency || 'NGN',
        rentAmount: unit.rentAmount || 0,
        managementFee: unit.managementFee || 0,
        rentReminderEnabled: unit.rentReminderEnabled || false,
        rentReminderDaysBefore: unit.rentReminderDaysBefore || 7,
        rentStartDate: unit.rentStartDate ? new Date(unit.rentStartDate).toISOString().split('T')[0] : '',
        rentDueDate: unit.rentDueDate ? new Date(unit.rentDueDate).toISOString().split('T')[0] : '',
      })

    }
  }, [unit, isOpen, reset])

  // Auto-calculate Rent Due Date (End Date)
  useEffect(() => {
    const rentStartDate = watch('rentStartDate')
    const rentType = watch('rentType')
    
    if (rentStartDate && rentType) {
      const start = new Date(rentStartDate)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (rentType === 'Annually' || rentType === 'Yearly') {
        end.setFullYear(end.getFullYear() + 1)
      }

      end.setDate(end.getDate() - 1)

      const formattedEnd = end.toISOString().split('T')[0]
      if (watch('rentDueDate') !== formattedEnd) {
        setValue('rentDueDate', formattedEnd, { shouldValidate: true })
      }
    }
  }, [watch('rentStartDate'), watch('rentType')])

  if (!isOpen) return null;

  const onSubmit = (data: any) => {
    const processedData = {
      ...data,
      rentAmount: Number(data.rentAmount),
      managementFee: Number(data.managementFee),
      rentReminderDaysBefore: data.rentReminderDaysBefore ? Number(data.rentReminderDaysBefore) : null,
    }
    onSave(processedData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Unit"
      subtitle={`Update core details for ${unit?.unitName || ''}`}
      maxWidth={650}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, width: '100%' }}>
          <button type="button" className="btn btn--secondary" onClick={onClose} style={{ borderRadius: 12, padding: '12px 32px' }}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" disabled={isPending} onClick={handleSubmit(onSubmit)} style={{ borderRadius: 12, padding: '12px 40px', background: 'var(--forest)' }}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '16px 0 0 0' }}>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Home size={14} color="var(--clay)" /> Unit Name
            </label>
            <input {...register('unitName', { required: true })} className="form-input" placeholder="e.g. Apartment 4B" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Unit Type</label>
              <FormSelect 
                value={watch('unitType') || ''} 
                onChange={val => setValue('unitType', val, { shouldValidate: true })}
                options={[
                  { label: 'Flat / Apartment', value: 'Flat / Apartment' },
                  { label: 'Duplex', value: 'Duplex' },
                  { label: 'Shared Apartment', value: 'Shared Apartment' },
                  { label: 'Studio', value: 'Studio' },
                  { label: 'Bungalow', value: 'Bungalow' },
                  { label: '4 Bedroom Semi-detached Duplex', value: '4 Bedroom Semi-detached Duplex' },
                  { label: 'Detached Duplex', value: 'Detached Duplex' },
                  { label: '2 Bedroom Flat', value: '2 Bedroom Flat' },
                  { label: '2 Bedroom Serviced Flat', value: '2 Bedroom Serviced Flat' },
                  { label: '3 Bedroom Flat', value: '3 Bedroom Flat' },
                  { label: '3 Bedroom Serviced Flat', value: '3 Bedroom Serviced Flat' },
                  { label: '2 Bedroom Apartment', value: '2 Bedroom Apartment' },
                  { label: 'Studio / Self Contained Flat', value: 'Studio / Self Contained Flat' },
                  { label: 'Mini Flat / 1 Bedroom Flat', value: 'Mini Flat / 1 Bedroom Flat' },
                  { label: 'Flats', value: 'Flats' },
                  { label: 'Terrace House', value: 'Terrace House' },
                  { label: 'Town House', value: 'Town House' },
                  { label: 'Detached House', value: 'Detached House' },
                  { label: 'Semi-detached Duplex', value: 'Semi-detached Duplex' },
                  { label: 'Semi-detached House', value: 'Semi-detached House' },
                  { label: 'Shortlet Apartment', value: 'Shortlet Apartment' },
                  { label: 'Office Space', value: 'Office Space' },
                  { label: 'Studio Room / Self-contain', value: 'Studio Room / Self-contain' },
                  { label: 'Block Of Flats', value: 'Block Of Flats' }
                ]}
                placeholder="Select an option"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <FormSelect 
                value={watch('currency') || 'NGN'} 
                onChange={val => setValue('currency', val, { shouldValidate: true })}
                options={[
                  { label: 'NGN (₦)', value: 'NGN' },
                  { label: 'USD ($)', value: 'USD' }
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
            <div className="form-group">
              <label className="form-label">Rent Type</label>
              <FormSelect 
                value={watch('rentType') || 'Annually'} 
                onChange={val => setValue('rentType', val, { shouldValidate: true })}
                options={[
                  { label: 'Annually', value: 'Annually' },
                  { label: 'Monthly', value: 'Monthly' }
                ]}
                disabled={hasPayments}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={14} color="var(--forest)" /> Rent Amount
              </label>
              <input type="number" {...register('rentAmount')} className="form-input" disabled={hasPayments} />
            </div>
            <div className="form-group">
              <label className="form-label">Management Fee (₦)</label>
              <input type="number" {...register('managementFee')} className="form-input" placeholder="e.g. 150000" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div className="form-group">
              <label className="form-label">Rent Start Date</label>
              <input 
                type="date" 
                {...register('rentStartDate')} 
                className="form-input" 
                disabled={hasPayments}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rent End Date</label>
              <input 
                type="date" 
                {...register('rentDueDate')} 
                className="form-input" 
                disabled={hasPayments}
              />
            </div>
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 16, background: 'var(--ivory-faint)', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--forest-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={16} color="var(--forest)" />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Rent Reminders</h4>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Automatically notify tenant before rent expires</p>
                </div>
              </div>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="rentReminderEnabled"
                  {...register('rentReminderEnabled')}
                  disabled={!hasContactInfo}
                  style={{ display: 'none' }}
                />
                <label 
                  htmlFor="rentReminderEnabled"
                  style={{
                    width: 44,
                    height: 22,
                    background: !hasContactInfo ? 'var(--border)' : (isReminderEnabled ? 'var(--forest)' : '#ccc'),
                    borderRadius: 11,
                    display: 'block',
                    position: 'relative',
                    cursor: !hasContactInfo ? 'not-allowed' : 'pointer',
                    transition: '0.3s',
                    opacity: !hasContactInfo ? 0.6 : 1
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: 2,
                    left: isReminderEnabled ? 24 : 2,
                    transition: '0.3s'
                  }} />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Send reminder</span>
              <input 
                type="number" 
                {...register('rentReminderDaysBefore')} 
                className="form-input" 
                style={{ width: 60, textAlign: 'center' }}
                min="1"
                max="30"
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>days before rent is due.</span>
            </div>
          </div>

        </form>
    </Modal>
  )
}
