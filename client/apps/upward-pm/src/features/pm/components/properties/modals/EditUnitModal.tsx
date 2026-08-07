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

const getInitialLeaseYears = (unit: any) => {
  if (unit && unit.rentType && String(unit.rentType).toUpperCase().trim() === 'LEASE' && unit.rentStartDate && unit.rentDueDate) {
    const start = new Date(unit.rentStartDate);
    const end = new Date(unit.rentDueDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime > 0) {
      return Math.round(diffTime / (1000 * 60 * 60 * 24 * 365));
    }
  }
  return '';
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
      leaseYears: (unit as any).leaseYears || getInitialLeaseYears(unit),
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
        leaseYears: (unit as any).leaseYears || getInitialLeaseYears(unit),
      })

    }
  }, [unit, isOpen, reset])

  // Auto-calculate Rent Due Date (End Date)
  useEffect(() => {
    const rentStartDate = watch('rentStartDate')
    const rentType = watch('rentType')
    const leaseYears = watch('leaseYears')

    if (rentStartDate && rentType) {
      const start = new Date(rentStartDate)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (rentType === 'Annually' || rentType === 'Yearly') {
        end.setFullYear(end.getFullYear() + 1)
      } else if (rentType === 'Lease' && leaseYears) {
        end.setFullYear(end.getFullYear() + Number(leaseYears))
      }

      end.setDate(end.getDate() - 1)

      const formattedEnd = end.toISOString().split('T')[0]
      if (watch('rentDueDate') !== formattedEnd) {
        setValue('rentDueDate', formattedEnd, { shouldValidate: true })
      }
    }
  }, [watch('rentStartDate'), watch('rentType'), watch('leaseYears')])

  if (!isOpen) return null;

  const onSubmit = (data: any) => {
    const processedData = {
      ...data,
      rentAmount: Number(data.rentAmount),
      managementFee: Number(data.managementFee),
      rentReminderDaysBefore: data.rentReminderDaysBefore ? Number(data.rentReminderDaysBefore) : null,
      leaseYears: data.rentType === 'Lease' && data.leaseYears ? Number(data.leaseYears) : undefined,
    }
    if (data.rentType !== 'Lease') {
      delete processedData.leaseYears
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
        <div className="edit-unit-form__footer-actions">
          <button type="button" className="btn btn--secondary edit-unit-form__btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary edit-unit-form__btn edit-unit-form__btn--primary" disabled={isPending} onClick={handleSubmit(onSubmit)}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="edit-unit-form">
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label edit-unit-form__label-with-icon">
            <Home size={14} color="var(--clay)" /> Unit Name
          </label>
          <input {...register('unitName', { required: true })} className="form-input" placeholder="e.g. Apartment 4B" />
        </div>

        <div className="edit-unit-form__row edit-unit-form__row--2-1">
          <div className="form-group" style={{ marginBottom: 0 }}>
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
          <div className="form-group" style={{ marginBottom: 0 }}>
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

        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Management Fee (₦)</label>
          <input type="number" {...register('managementFee')} className="form-input" placeholder="e.g. 150000" />
        </div>

        <div className="edit-unit-form__section">
          <div className="edit-unit-form__section-header">
            <CreditCard size={14} color="var(--forest)" />
            <h5>Rent Configuration</h5>
          </div>

          <div className={`edit-unit-form__row edit-unit-form__row--${watch('rentType') === 'Lease' ? '3-col' : '2-col'}`}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rent Amount ({watch('currency') === 'USD' ? '$' : '₦'})</label>
              <input type="number" {...register('rentAmount')} className="form-input" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rent Type</label>
              <FormSelect
                value={watch('rentType') || 'Annually'}
                onChange={val => setValue('rentType', val, { shouldValidate: true })}
                options={[
                  { label: 'Annually', value: 'Annually' },
                  { label: 'Monthly', value: 'Monthly' },
                  { label: 'Lease', value: 'Lease' }
                ]}
              />
            </div>
            {watch('rentType') === 'Lease' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Lease Years</label>
                <input type="number" {...register('leaseYears')} className="form-input" placeholder="e.g. 5" min="1" />
              </div>
            )}
          </div>

          <div className="edit-unit-form__row edit-unit-form__row--2-col edit-unit-form__row--dates">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rent Start Date</label>
              <input
                type="date"
                {...register('rentStartDate')}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rent End Date (Auto-calculated)</label>
              <input
                type="date"
                readOnly
                {...register('rentDueDate')}
                className="form-input form-input--readonly"
                title="Auto-calculated based on rent start date and cycle"
              />
            </div>
          </div>
        </div>

        <div className="glass edit-unit-form__reminder-box">
          <div className="edit-unit-form__reminder-header">
            <div className="edit-unit-form__reminder-info">
              <div className="edit-unit-form__reminder-icon-wrapper">
                <Bell size={16} color="var(--forest)" />
              </div>
              <div>
                <h4>Rent Reminders</h4>
                <p>Automatically notify tenant before rent expires</p>
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

          <div className="edit-unit-form__reminder-inputs">
            <span>Send reminder</span>
            <input
              type="number"
              {...register('rentReminderDaysBefore')}
              className="form-input edit-unit-form__reminder-days-input"
              min="1"
              max="30"
            />
            <span>days before rent is due.</span>
          </div>
        </div>

      </form>
    </Modal>
  )
}
