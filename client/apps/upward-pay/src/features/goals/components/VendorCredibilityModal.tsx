'use client'

import React, { useEffect } from 'react'
import { X, ShieldCheck, Mail, Phone, MapPin, Star, CheckCircle2, Building2 } from 'lucide-react'
import type { CommerceVendor } from '../types/goals.types'

interface VendorCredibilityModalProps {
  vendor: CommerceVendor | null
  isOpen: boolean
  onClose: () => void
}

export const VendorCredibilityModal: React.FC<VendorCredibilityModalProps> = ({
  vendor,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !vendor) return null

  return (
    <div
      className="vendor-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-modal-title"
      onClick={onClose}
    >
      <div className="vendor-modal__container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vendor-modal__header">
          <div className="vendor-modal__title-row">
            <span className="vendor-modal__avatar-badge">
              <Building2 size={24} />
            </span>
            <div>
              <div className="vendor-modal__name-row">
                <h2 id="vendor-modal-title" className="vendor-modal__title">
                  {vendor.name}
                </h2>
                {vendor.isVerified && (
                  <span className="vendor-modal__verified-pill">
                    <ShieldCheck size={14} />
                    Verified Merchant
                  </span>
                )}
              </div>
              <p className="vendor-modal__slug">@{vendor.slug}</p>
            </div>
          </div>

          <button
            type="button"
            className="vendor-modal__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="vendor-modal__body">
          {/* Trust Guarantee Box */}
          <div className="vendor-modal__trust-box">
            <CheckCircle2 size={18} className="vendor-modal__trust-icon" />
            <div>
              <p className="vendor-modal__trust-title">Upward Certified Merchant</p>
              <p className="vendor-modal__trust-desc">
                This merchant has been verified by the Upward Operations team for licensing,
                customer satisfaction, and service delivery standards.
              </p>
            </div>
          </div>

          {/* Rating if present */}
          {vendor.rating != null && (
            <div className="vendor-modal__stat-card">
              <div className="vendor-modal__rating-row">
                <Star size={18} className="vendor-modal__star-icon" />
                <span className="vendor-modal__rating-value">{vendor.rating.toFixed(1)}</span>
                <span className="vendor-modal__rating-scale">/ 5.0</span>
              </div>
              <span className="vendor-modal__rating-label">Tenant Satisfaction Score</span>
            </div>
          )}

          {/* Contact & Location Details */}
          <div className="vendor-modal__details-list">
            <h4 className="vendor-modal__details-heading">Merchant Information</h4>

            {vendor.contactEmail && (
              <div className="vendor-modal__detail-item">
                <Mail size={16} className="vendor-modal__detail-icon" />
                <div>
                  <span className="vendor-modal__detail-label">Email Support</span>
                  <a
                    href={`mailto:${vendor.contactEmail}`}
                    className="vendor-modal__detail-value vendor-modal__detail-link"
                  >
                    {vendor.contactEmail}
                  </a>
                </div>
              </div>
            )}

            {vendor.contactPhone && (
              <div className="vendor-modal__detail-item">
                <Phone size={16} className="vendor-modal__detail-icon" />
                <div>
                  <span className="vendor-modal__detail-label">Phone Support</span>
                  <a
                    href={`tel:${vendor.contactPhone}`}
                    className="vendor-modal__detail-value vendor-modal__detail-link"
                  >
                    {vendor.contactPhone}
                  </a>
                </div>
              </div>
            )}

            {vendor.address && (
              <div className="vendor-modal__detail-item">
                <MapPin size={16} className="vendor-modal__detail-icon" />
                <div>
                  <span className="vendor-modal__detail-label">Business Address</span>
                  <p className="vendor-modal__detail-value">{vendor.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="vendor-modal__footer">
          <button type="button" className="vendor-modal__done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
