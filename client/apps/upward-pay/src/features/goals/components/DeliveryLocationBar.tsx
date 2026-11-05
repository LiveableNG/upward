'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  MapPin,
  ChevronDown,
  Check,
  X,
  Home,
  Compass,
  Building,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  type UserDeliveryLocation,
  PRESET_DELIVERY_ZONES,
  resolveDeliveryZone,
  formatShortLocation,
  getStoredDeliveryLocation,
  saveStoredDeliveryLocation,
} from '../utils/deliveryLocation'
import '../styles/goals.css'

interface DeliveryLocationBarProps {
  location: UserDeliveryLocation
  onLocationChange: (loc: UserDeliveryLocation) => void
}

export const DeliveryLocationBar: React.FC<DeliveryLocationBarProps> = ({
  location,
  onLocationChange,
}) => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [customAddress, setCustomAddress] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal/sheet is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [isOpen])

  const rentalProperty = user?.properties?.[0]
  const rentalAddress = rentalProperty?.property_address || rentalProperty?.address

  const handleSelectPreset = (zoneTag: UserDeliveryLocation['zoneTag'], label: string) => {
    const newLoc: UserDeliveryLocation = {
      address: label,
      zoneTag,
      label,
      isRentalDefault: false,
    }
    saveStoredDeliveryLocation(newLoc)
    onLocationChange(newLoc)
    setIsOpen(false)
    setIsCustomMode(false)
  }

  const handleSelectRental = () => {
    if (!rentalAddress) return
    const zoneTag = resolveDeliveryZone(rentalAddress)
    const newLoc: UserDeliveryLocation = {
      address: rentalAddress,
      zoneTag,
      label: 'Your Rental Address',
      isRentalDefault: true,
    }
    saveStoredDeliveryLocation(newLoc)
    onLocationChange(newLoc)
    setIsOpen(false)
    setIsCustomMode(false)
  }

  const handleConfirmCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customAddress.trim()) return
    const zoneTag = resolveDeliveryZone(customAddress)
    const newLoc: UserDeliveryLocation = {
      address: customAddress.trim(),
      zoneTag,
      label: customAddress.trim().split(',')[0] || customAddress.trim(),
      isRentalDefault: false,
    }
    saveStoredDeliveryLocation(newLoc)
    onLocationChange(newLoc)
    setIsOpen(false)
    setIsCustomMode(false)
  }

  return (
    <>
      <div className="delivery-bar">
        <button
          type="button"
          className="delivery-bar__trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Change delivery location"
        >
          <div className="delivery-bar__icon-wrap">
            <MapPin size={14} className="delivery-bar__icon" />
          </div>
          <div className="delivery-bar__text">
            <span className="delivery-bar__label">Delivering to:</span>
            <span className="delivery-bar__value">
              {formatShortLocation(location)}
            </span>
          </div>
          <ChevronDown size={14} className="delivery-bar__chevron" />
        </button>
      </div>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="lifestyle-sheet__backdrop"
            onClick={() => setIsOpen(false)}
            role="presentation"
          >
            <div
              className="lifestyle-sheet__container delivery-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Select Delivery Location"
            >
              <div className="lifestyle-sheet__handle" />

              <div className="lifestyle-sheet__header">
                <div>
                  <h3 className="lifestyle-sheet__title">Delivery Address</h3>
                  <p className="lifestyle-sheet__subtitle">
                    Select where you would like physical items and services delivered.
                  </p>
                </div>
                <button
                  type="button"
                  className="lifestyle-sheet__close"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="delivery-sheet__content">
                {rentalAddress && (
                  <div className="delivery-sheet__section">
                    <span className="delivery-sheet__section-title">
                      Verified Rental Property
                    </span>
                    <button
                      type="button"
                      className={`delivery-sheet__option ${
                        location.isRentalDefault
                          ? 'delivery-sheet__option--selected'
                          : ''
                      }`}
                      onClick={handleSelectRental}
                    >
                      <div className="delivery-sheet__option-icon">
                        <Home size={18} />
                      </div>
                      <div className="delivery-sheet__option-details">
                        <span className="delivery-sheet__option-title">
                          Primary Lease Residence
                        </span>
                        <span className="delivery-sheet__option-sub">
                          {rentalAddress}
                        </span>
                      </div>
                      {location.isRentalDefault && (
                        <div className="delivery-sheet__check">
                          <Check size={16} strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  </div>
                )}

                <div className="delivery-sheet__section">
                  <span className="delivery-sheet__section-title">
                    Delivery Coverage Zones
                  </span>
                  <div className="delivery-sheet__presets">
                    {PRESET_DELIVERY_ZONES.map((preset) => {
                      const isSelected =
                        !location.isRentalDefault &&
                        location.zoneTag === preset.tag &&
                        !isCustomMode
                      return (
                        <button
                          key={preset.tag}
                          type="button"
                          className={`delivery-sheet__option ${
                            isSelected ? 'delivery-sheet__option--selected' : ''
                          }`}
                          onClick={() =>
                            handleSelectPreset(preset.tag, preset.label)
                          }
                        >
                          <div className="delivery-sheet__option-icon">
                            <Building size={18} />
                          </div>
                          <div className="delivery-sheet__option-details">
                            <span className="delivery-sheet__option-title">
                              {preset.label}
                            </span>
                            <span className="delivery-sheet__option-sub">
                              {preset.description}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="delivery-sheet__check">
                              <Check size={16} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="delivery-sheet__section">
                  <span className="delivery-sheet__section-title">
                    Custom Address
                  </span>
                  {!isCustomMode ? (
                    <button
                      type="button"
                      className="delivery-sheet__custom-btn"
                      onClick={() => setIsCustomMode(true)}
                    >
                      <Compass size={16} />
                      <span>Enter a specific delivery address</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleConfirmCustom}
                      className="delivery-sheet__custom-form"
                    >
                      <input
                        type="text"
                        placeholder="e.g. 14 Adeleke Street, Victoria Island"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        className="delivery-sheet__input"
                        autoFocus
                      />
                      <div className="delivery-sheet__custom-actions">
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => setIsCustomMode(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn--primary"
                          disabled={!customAddress.trim()}
                        >
                          Save Address
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
