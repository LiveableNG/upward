import React, { useState, useEffect, useMemo } from 'react'
import { MapPin, AlertCircle, Save, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { apiService } from '../../../services/api.service'
import type { AdminDeliveryZone } from '../types'

interface DeliveryZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    tag?: string
    name: string
    state: string
    region?: string
    areasCovered?: string
    isDelivering: boolean
    deliveryFeeKobo: number
    estimatedDeliveryDays?: string
    pauseReason?: string
    sortOrder?: number
  }) => Promise<void>
  zone?: AdminDeliveryZone | null
}

const FALLBACK_NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
]

function deriveTagFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36)
}

export const DeliveryZoneModal: React.FC<DeliveryZoneModalProps> = ({
  isOpen,
  onClose,
  onSave,
  zone,
}) => {
  const isEditing = !!zone
  const [name, setName] = useState('')
  const [state, setState] = useState('Lagos')
  const [availableStates, setAvailableStates] = useState<string[]>(FALLBACK_NIGERIAN_STATES)
  const [loadingStates, setLoadingStates] = useState(false)
  const [region, setRegion] = useState('')
  const [areasCovered, setAreasCovered] = useState('')
  const [isDelivering, setIsDelivering] = useState(true)
  const [deliveryFeeNgn, setDeliveryFeeNgn] = useState('0')
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('1 - 2 business days')
  const [pauseReason, setPauseReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch states from Location Repository API
  useEffect(() => {
    let isSubscribed = true
    const fetchStates = async () => {
      try {
        setLoadingStates(true)
        const res = await apiService.get('/locations/states?country=nigeria')
        if (isSubscribed && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setAvailableStates(res.data)
        }
      } catch {
        // Fallback already pre-set to FALLBACK_NIGERIAN_STATES
      } finally {
        if (isSubscribed) setLoadingStates(false)
      }
    }
    if (isOpen) {
      fetchStates()
    }
    return () => {
      isSubscribed = false
    }
  }, [isOpen])

  // Reset or initialize form values
  useEffect(() => {
    if (zone) {
      setName(zone.name || '')
      setState(zone.state || 'Lagos')
      setRegion(zone.region || '')
      setAreasCovered(zone.areasCovered || '')
      setIsDelivering(zone.isDelivering ?? true)
      const feeNgn = zone.deliveryFeeKobo ? Number(BigInt(zone.deliveryFeeKobo) / BigInt(100)) : 0
      setDeliveryFeeNgn(String(feeNgn))
      setEstimatedDeliveryDays(zone.estimatedDeliveryDays || '1 - 2 business days')
      setPauseReason(zone.pauseReason || '')
    } else {
      setName('')
      setState('Lagos')
      setRegion('')
      setAreasCovered('')
      setIsDelivering(true)
      setDeliveryFeeNgn('0')
      setEstimatedDeliveryDays('1 - 2 business days')
      setPauseReason('')
    }
    setError(null)
  }, [zone, isOpen])

  // Automatically derived tag
  const derivedTag = useMemo(() => {
    if (isEditing && zone) {
      return zone.tag
    }
    return deriveTagFromName(name)
  }, [isEditing, zone, name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!state.trim()) {
      setError('Please select a state for this delivery zone.')
      return
    }

    if (!name.trim()) {
      setError('Please enter a display name for this zone.')
      return
    }

    const finalTag = derivedTag.trim()
    if (!finalTag) {
      setError(
        'Could not generate a system tag identifier. Please provide a descriptive zone name.',
      )
      return
    }

    const feeNumber = Math.max(0, Number(deliveryFeeNgn) || 0)
    const feeKobo = Math.round(feeNumber * 100)

    try {
      setSaving(true)
      const payload: any = {
        name: name.trim(),
        state: state.trim(),
        region: region.trim() || undefined,
        areasCovered: areasCovered.trim() || undefined,
        isDelivering,
        deliveryFeeKobo: feeKobo,
        estimatedDeliveryDays: estimatedDeliveryDays.trim() || undefined,
        pauseReason: !isDelivering && pauseReason.trim() ? pauseReason.trim() : undefined,
      }

      // Only pass tag on creation, NEVER on update
      if (!isEditing) {
        payload.tag = finalTag
      }

      await onSave(payload)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save delivery zone')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Delivery Coverage Zone' : 'Add New Delivery Coverage Zone'}
      description="Configure regions and state zones where Upward coordinates home delivery & logistics."
      icon={<MapPin size={22} />}
      maxWidth="580px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            style={{ padding: '9px 18px', borderRadius: '8px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEditing ? 'Save Changes' : 'Create Zone'}
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
      >
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              State / Jurisdiction <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <select
              className="form-control"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={loadingStates}
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13.5px',
              }}
            >
              {availableStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Region / Sector (Optional)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Island, Mainland, Central"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13.5px',
              }}
            />
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '6px',
            }}
          >
            Zone Display Name <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Lagos Island (Ikoyi / Victoria Island / Lekki Phase 1)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', borderRadius: '8px', padding: '9px 12px', fontSize: '13.5px' }}
          />

          {/* Derived System Tag Indicator */}
          <div
            style={{
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Sparkles size={13} style={{ color: 'var(--clay)' }} />
            <span>System Tag Identifier:</span>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '11.5px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: derivedTag ? 'var(--clay)' : 'var(--text-muted)',
              }}
            >
              {derivedTag || 'Auto-derived from name'}
            </span>
            {isEditing && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Locked)</span>
            )}
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '6px',
            }}
          >
            Areas, Neighborhoods &amp; Landmarks Covered
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="e.g. Victoria Island, Ikoyi, Lekki Phase 1, Oniru, Marina, Banana Island"
            value={areasCovered}
            onChange={(e) => setAreasCovered(e.target.value)}
            style={{
              width: '100%',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              marginTop: '4px',
              display: 'block',
            }}
          >
            Users searching for any of these keywords will be matched to this delivery zone.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Estimated Delivery SLA
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 1 - 2 business days"
              value={estimatedDeliveryDays}
              onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13.5px',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Base Delivery Fee (NGN)
            </label>
            <input
              type="number"
              className="form-control"
              min="0"
              step="100"
              placeholder="0 (Free Delivery)"
              value={deliveryFeeNgn}
              onChange={(e) => setDeliveryFeeNgn(e.target.value)}
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13.5px',
              }}
            />
          </div>
        </div>

        {/* Delivery Active Status Toggle */}
        <div
          style={{
            background: isDelivering ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isDelivering ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                Active Delivery Status
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isDelivering
                  ? 'Currently accepting orders and dispatching to this zone.'
                  : 'Delivery is suspended or not supported yet for this location.'}
              </div>
            </div>
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '46px',
                height: '26px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isDelivering}
                onChange={(e) => setIsDelivering(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isDelivering ? '#10B981' : '#CBD5E1',
                  borderRadius: '34px',
                  transition: '0.3s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    height: '20px',
                    width: '20px',
                    left: isDelivering ? '22px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </span>
            </label>
          </div>

          {!isDelivering && (
            <div style={{ marginTop: '4px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                }}
              >
                Public Suspension Reason / Notice (Optional)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Temporarily paused due to severe flooding / road works"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '12.5px',
                }}
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
