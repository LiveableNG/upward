import React, { useEffect } from 'react'
import { X, Building2, CreditCard, Home, Settings } from 'lucide-react'
import { Unit } from '../../../services/propertyService'
import { useForm } from 'react-hook-form'

interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit;
  onSave: (data: any) => void;
  isPending: boolean;
}

export const EditUnitModal: React.FC<EditUnitModalProps> = ({
  isOpen, onClose, unit, onSave, isPending
}) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      unitName: unit.unitName || '',
      unitType: unit.unitType || '',
      rentType: unit.rentType || 'Monthly',
      currency: unit.currency || 'NGN',
      rentAmount: unit.rentAmount || 0,
      managementFee: unit.managementFee || 0,
    }
  })

  useEffect(() => {
    if (unit && isOpen) {
      reset({
        unitName: unit.unitName || '',
        unitType: unit.unitType || '',
        rentType: unit.rentType || 'Monthly',
        currency: unit.currency || 'NGN',
        rentAmount: unit.rentAmount || 0,
        managementFee: unit.managementFee || 0,
      })
    }
  }, [unit, isOpen, reset])

  if (!isOpen) return null;

  const onSubmit = (data: any) => {
    const processedData = {
      ...data,
      rentAmount: Number(data.rentAmount),
      managementFee: Number(data.managementFee),
    }
    onSave(processedData)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal glass animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, padding: 0, overflow: 'hidden' }}>
        <header style={{ padding: '24px 32px', background: 'var(--ivory-dim)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>Edit Unit</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Update core details for <strong>{unit.unitName}</strong></p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'white' }}><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '32px' }}>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Home size={14} color="var(--clay)" /> Unit Name
            </label>
            <input {...register('unitName', { required: true })} className="form-input" placeholder="e.g. Apartment 4B" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Unit Type</label>
              <select {...register('unitType')} className="form-input">
                <option value="">Select an option</option>
                <option value="Flat / Apartment">Flat / Apartment</option>
                <option value="Duplex">Duplex</option>
                <option value="Shared Apartment">Shared Apartment</option>
                <option value="Studio">Studio</option>
                <option value="Bungalow">Bungalow</option>
                <option value="4 Bedroom Semi-detached Duplex">4 Bedroom Semi-detached Duplex</option>
                <option value="Detached Duplex">Detached Duplex</option>
                <option value="2 Bedroom Flat">2 Bedroom Flat</option>
                <option value="2 Bedroom Serviced Flat">2 Bedroom Serviced Flat</option>
                <option value="3 Bedroom Flat">3 Bedroom Flat</option>
                <option value="3 Bedroom Serviced Flat">3 Bedroom Serviced Flat</option>
                <option value="2 Bedroom Apartment">2 Bedroom Apartment</option>
                <option value="Studio / Self Contained Flat">Studio / Self Contained Flat</option>
                <option value="Mini Flat / 1 Bedroom Flat">Mini Flat / 1 Bedroom Flat</option>
                <option value="Flats">Flats</option>
                <option value="Terrace House">Terrace House</option>
                <option value="Town House">Town House</option>
                <option value="Detached House">Detached House</option>
                <option value="Semi-detached Duplex">Semi-detached Duplex</option>
                <option value="Semi-detached House">Semi-detached House</option>
                <option value="Shortlet Apartment">Shortlet Apartment</option>
                <option value="Office Space">Office Space</option>
                <option value="Studio Room / Self-contain">Studio Room / Self-contain</option>
                <option value="Block Of Flats">Block Of Flats</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select {...register('currency')} className="form-input">
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
            <div className="form-group">
              <label className="form-label">Rent Type</label>
              <select {...register('rentType')} className="form-input">
                <option value="Monthly">Monthly</option>
                <option value="Annually">Annually</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={14} color="var(--forest)" /> Rent Amount
              </label>
              <input type="number" {...register('rentAmount')} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Management Fee (₦)</label>
              <input type="number" {...register('managementFee')} className="form-input" placeholder="e.g. 150000" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
            <button type="button" className="btn btn--secondary" onClick={onClose} style={{ borderRadius: 12, padding: '12px 32px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isPending} style={{ borderRadius: 12, padding: '12px 40px', background: 'var(--forest)' }}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
