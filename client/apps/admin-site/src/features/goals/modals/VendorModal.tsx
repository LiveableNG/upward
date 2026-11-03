import React, { useState, useEffect } from 'react'
import { Store } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { slugify } from '../utils'
import type { CommerceVendor } from '../types'

interface VendorModalProps {
  isOpen: boolean
  onClose: () => void
  vendor: CommerceVendor | null
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  vendor,
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
  const [submitting, setSubmitting] = useState(false)

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
    }
  }, [vendor, isOpen])

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
