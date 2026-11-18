import React, { useState, useEffect, useMemo } from 'react'
import { Store } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { slugify } from '../utils'
import type { CommerceVendor } from '../types'

interface VendorModalProps {
  isOpen: boolean
  onClose: () => void
  vendor: CommerceVendor | null
  availableZones?: Array<{ tag: string; name: string }>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

function normalizeZoneTag(
  raw: string,
  zones: Array<{ tag: string; name: string }>,
): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  // 1. Exact match with a database tag (case-insensitive)
  const exactTag = zones.find(
    (z) => z.tag.toUpperCase() === trimmed.toUpperCase(),
  )
  if (exactTag) return exactTag.tag

  // 2. Normalized underscore match: e.g. "LAGOS MAINLAND" -> "LAGOS_MAINLAND"
  const underscored = trimmed.toUpperCase().replace(/\s+/g, '_')
  const underscoreMatch = zones.find(
    (z) => z.tag.toUpperCase() === underscored,
  )
  if (underscoreMatch) return underscoreMatch.tag

  // 3. Name match against database configured zones
  const lower = trimmed.toLowerCase()
  const nameMatch = zones.find(
    (z) => z.name.toLowerCase() === lower,
  )
  if (nameMatch) return nameMatch.tag

  return ''
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  vendor,
  availableZones = [],
  onSubmit,
}) => {
  const isEditing = Boolean(vendor)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [legalName, setLegalName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [address, setAddress] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [defaultDeliveryCoverage, setDefaultDeliveryCoverage] = useState('NATIONWIDE')
  const [defaultDeliveryZones, setDefaultDeliveryZones] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Strictly populated from live database configured delivery zones only
  const zonesToDisplay = useMemo(() => {
    return availableZones
  }, [availableZones])

  useEffect(() => {
    if (vendor) {
      setName(vendor.name)
      setSlug(vendor.slug)
      setLegalName(vendor.legalName || '')
      setEmail(vendor.email || '')
      setPhone(vendor.phone || '')
      setWebsite(vendor.website || '')
      setDescription(vendor.description || '')
      setLogoUrl(vendor.logoUrl || '')
      setAddress(vendor.address || '')
      setBankName(vendor.bankName || '')
      setAccountNumber(vendor.accountNumber || '')
      setAccountName(vendor.accountName || '')
      setIsVerified(vendor.isVerified ?? false)
      setIsActive(vendor.isActive ?? true)
      setDefaultDeliveryCoverage(vendor.defaultDeliveryCoverage || 'NATIONWIDE')
      const normalized = Array.from(
        new Set(
          (vendor.defaultDeliveryZones || [])
            .map((z) => normalizeZoneTag(z, availableZones))
            .filter((tag) => availableZones.some((az) => az.tag === tag)),
        ),
      )
      setDefaultDeliveryZones(normalized)
    } else {
      setName('')
      setSlug('')
      setLegalName('')
      setEmail('')
      setPhone('')
      setWebsite('')
      setDescription('')
      setLogoUrl('')
      setAddress('')
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      setIsVerified(false)
      setIsActive(true)
      setDefaultDeliveryCoverage('NATIONWIDE')
      setDefaultDeliveryZones([])
    }
  }, [vendor, isOpen, availableZones])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isEditing && (!slug || slug === slugify(name))) {
      setSlug(slugify(val))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        legalName: legalName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        address: address.trim() || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountName: accountName.trim() || undefined,
        isVerified,
        isActive,
        defaultDeliveryCoverage,
        defaultDeliveryZones:
          defaultDeliveryCoverage === 'NATIONWIDE' ? [] : defaultDeliveryZones,
      })
      onClose()
    } catch {
      // handled
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Commerce Vendor' : 'Onboard Commerce Vendor'}
      description="Register artisan workshops, fitness gym chains, furniture makers, and verified merchants."
      icon={<Store size={20} />}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Vendor / Brand Name *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Workspace Kraft Nigeria"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Slug *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. workspace-kraft"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Registered Legal Name
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Workspace Kraft Solutions Ltd (CAC RC: 1234567)"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Contact Email
            </label>
            <input
              type="email"
              className="input"
              placeholder="vendor@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              className="input"
              placeholder="+234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Website
            </label>
            <input
              type="text"
              className="input"
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Logo URL
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://... logo image"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Service & Delivery Operating Zones */}
        <div
          style={{
            padding: '14px',
            background: 'var(--surface-hover)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
            SERVICE & DELIVERY OPERATING COVERAGE
          </div>
          <div style={{ marginBottom: defaultDeliveryCoverage === 'REGIONAL_ZONES' || defaultDeliveryCoverage === 'LOCAL_RADIUS' ? '12px' : '0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Coverage Model
            </label>
            <select
              className="input"
              value={defaultDeliveryCoverage}
              onChange={(e) => setDefaultDeliveryCoverage(e.target.value)}
              style={{ height: '36px', fontSize: '13px' }}
            >
              <option value="NATIONWIDE">Nationwide (All States & Cities)</option>
              <option value="REGIONAL_ZONES">Regional Operating Zones (Mainland, Island, Oyo, etc.)</option>
              <option value="LOCAL_RADIUS">Local City Only</option>
              <option value="PICKUP_ONLY">In-Store / On-Premise Only</option>
            </select>
          </div>

          {(defaultDeliveryCoverage === 'REGIONAL_ZONES' || defaultDeliveryCoverage === 'LOCAL_RADIUS') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>
                  Active Operating Zones ({defaultDeliveryZones.length} selected)
                </label>
                {defaultDeliveryZones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDefaultDeliveryZones([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {zonesToDisplay.length > 0 ? (
                  zonesToDisplay.map((zone) => {
                    const isSelected = defaultDeliveryZones.includes(zone.tag)
                    return (
                      <button
                        key={zone.tag}
                        type="button"
                        onClick={() => {
                          setDefaultDeliveryZones((prev) =>
                            isSelected ? prev.filter((t) => t !== zone.tag) : [...prev, zone.tag],
                          )
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent)' : 'var(--surface)',
                          color: isSelected ? '#fff' : 'var(--text)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {zone.name}
                      </button>
                    )
                  })
                ) : (
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    No zones configured in the Delivery Zones table yet. Configure zones in Commerce Workspace &gt; Delivery Zones.
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                Services (cleaners, painters, artisans) and products from this vendor will only be deliverable in these zones.
              </p>
            </div>
          )}
        </div>

        {/* Settlement Account Box */}
        <div
          style={{
            padding: '14px',
            background: 'var(--surface-hover)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
            SETTLEMENT ACCOUNT DETAILS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Bank Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. GTBank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{ height: '36px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Account Number
              </label>
              <input
                type="text"
                className="input"
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={{ height: '36px', fontSize: '13px' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
              Account Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Workspace Kraft Solutions"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              style={{ height: '36px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="vendor-verified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
            />
            <label htmlFor="vendor-verified" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Verified Partner (Badge & Instant Checkout)
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="vendor-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label htmlFor="vendor-active" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Active in Platform
            </label>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Vendor' : 'Onboard Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
