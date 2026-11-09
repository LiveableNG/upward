'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, ChevronDown, Check, X, Search, AlertCircle, Clock, RotateCcw } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  type UserDeliveryLocation,
  type DeliveryZoneItem,
  PRESET_DELIVERY_ZONES,
  resolveDeliveryZone,
  formatShortLocation,
  saveStoredDeliveryLocation,
} from '../utils/deliveryLocation'
import { fetchDeliveryZones } from '../services/goalsService'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [zones, setZones] = useState<DeliveryZoneItem[]>(PRESET_DELIVERY_ZONES)
  const [isLoadingZones, setIsLoadingZones] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch live configured zones from backend API
  useEffect(() => {
    let isMounted = true
    const loadZones = async () => {
      try {
        setIsLoadingZones(true)
        const dynamic = await fetchDeliveryZones()
        if (isMounted && dynamic && dynamic.length > 0) {
          setZones(dynamic)
        }
      } catch (err) {
        console.warn('Failed to load dynamic delivery zones', err)
      } finally {
        if (isMounted) setIsLoadingZones(false)
      }
    }
    loadZones()
    return () => {
      isMounted = false
    }
  }, [])

  // Lock body scroll and listen for Escape when sheet is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = orig
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen])

  const rentalProperty = user?.properties?.[0]
  const rentalAddress = rentalProperty?.address

  // Filter zones according to search query
  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones
    const q = searchQuery.toLowerCase().trim()
    return zones.filter((zone) => {
      const matchName = zone.name.toLowerCase().includes(q)
      const matchState = zone.state.toLowerCase().includes(q)
      const matchTag = zone.tag.toLowerCase().includes(q)
      const matchAreas = zone.areasCovered?.toLowerCase().includes(q)
      return matchName || matchState || matchTag || matchAreas
    })
  }, [zones, searchQuery])

  const handleSelectZone = (zone: DeliveryZoneItem) => {
    const newLoc: UserDeliveryLocation = {
      address: zone.name,
      zoneTag: zone.tag,
      zoneName: zone.name,
      state: zone.state,
      isDelivering: zone.isDelivering,
      pauseReason: zone.pauseReason,
      deliveryFeeKobo: zone.deliveryFeeKobo,
      label: zone.name,
      isRentalDefault: false,
    }
    saveStoredDeliveryLocation(newLoc)
    onLocationChange(newLoc)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleSelectRental = () => {
    if (!rentalAddress) return
    const resolution = resolveDeliveryZone(rentalAddress, zones)
    const newLoc: UserDeliveryLocation = {
      address: rentalAddress,
      zoneTag: resolution.zoneTag,
      zoneName: resolution.zoneName,
      state: resolution.state,
      isDelivering: resolution.isDelivering,
      pauseReason: resolution.pauseReason,
      deliveryFeeKobo: resolution.deliveryFeeKobo,
      label: 'Your Rental Address',
      isRentalDefault: true,
    }
    saveStoredDeliveryLocation(newLoc)
    onLocationChange(newLoc)
    setIsOpen(false)
    setSearchQuery('')
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
            <span className="delivery-bar__value">{formatShortLocation(location)}</span>
          </div>
          {!location.isDelivering && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm, 6px)',
                marginLeft: '4px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Paused
            </span>
          )}
          <ChevronDown size={14} className="delivery-bar__chevron" />
        </button>
      </div>

      <BottomSheetModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Choose Delivery Coverage Zone"
        subtitle="Select your region or search your delivery area to check verified logistics coverage."
        maxWidth="520px"
      >
        {/* Search Bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by state, city, landmark or area (e.g. Lekki, Ikeja, Wuse)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '13.5px',
                background: 'var(--surface)',
                outline: 'none',
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="delivery-sheet__content" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Zero Zones Configured Empty State (Upward Theme) */}
          {zones.length === 0 && !isLoadingZones && (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg, 16px)',
                border: '1px solid var(--border)',
                margin: '12px 20px 20px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--clay-faint)',
                  border: '1px solid var(--border)',
                  color: 'var(--clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <MapPin size={22} />
              </div>
              <h4
                style={{
                  margin: '0 0 6px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                Delivery Coverage Expanding Soon
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                We are working towards expanding our delivery coverage to other locations soon!
                <br />
                Once delivery coverage zones are rolled out, you will be able to select your zone
                and order directly to your door.
              </p>
            </div>
          )}

          {/* Search Uncovered State Notice (Upward Theme) */}
          {searchQuery.trim() && filteredZones.length === 0 && zones.length > 0 && (
            <div
              style={{
                padding: '26px 20px',
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg, 16px)',
                border: '1px solid var(--border)',
                margin: '8px 20px 16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--clay-faint)',
                  border: '1px solid var(--border)',
                  color: 'var(--clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <MapPin size={22} />
              </div>
              <h4
                style={{
                  margin: '0 0 6px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                Location Not Covered Yet
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                We couldn’t find an active delivery zone for "<strong>{searchQuery}</strong>".
                <br />
                <span style={{ color: 'var(--clay)', fontWeight: 600 }}>
                  We are working towards expanding our delivery coverage to other locations soon!
                </span>
              </p>
            </div>
          )}

          {/* Primary Lease Residence (if tenant has property) */}
          {rentalAddress && !searchQuery && (
            <div className="delivery-sheet__section">
              <span className="delivery-sheet__section-title">Verified Rental Property</span>
              <button
                type="button"
                className={`delivery-sheet__option ${
                  location.isRentalDefault ? 'delivery-sheet__option--selected' : ''
                }`}
                onClick={handleSelectRental}
              >
                <div className="delivery-sheet__option-icon">
                  <MapPin size={18} />
                </div>
                <div className="delivery-sheet__option-details">
                  <span className="delivery-sheet__option-title">Primary Lease Residence</span>
                  <span className="delivery-sheet__option-sub">{rentalAddress}</span>
                </div>
                {location.isRentalDefault && (
                  <div className="delivery-sheet__check">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Available Configured Zones */}
          <div className="delivery-sheet__section">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span className="delivery-sheet__section-title" style={{ margin: 0 }}>
                Available Coverage Zones ({filteredZones.length})
              </span>
              {isLoadingZones && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Updating zones...
                </span>
              )}
            </div>

            <div
              className="delivery-sheet__presets"
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {filteredZones.map((zone) => {
                const isSelected = !location.isRentalDefault && location.zoneTag === zone.tag
                return (
                  <button
                    key={zone.tag}
                    type="button"
                    className={`delivery-sheet__option ${
                      isSelected ? 'delivery-sheet__option--selected' : ''
                    }`}
                    onClick={() => handleSelectZone(zone)}
                    style={{
                      alignItems: 'flex-start',
                      padding: '14px 16px',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="delivery-sheet__option-icon"
                      style={{
                        color: zone.isDelivering ? 'var(--success, #22c55e)' : 'var(--text-muted)',
                        background: zone.isDelivering
                          ? 'var(--success-bg, rgba(34, 197, 94, 0.12))'
                          : 'var(--surface2)',
                        marginTop: '2px',
                      }}
                    >
                      <MapPin size={18} />
                    </div>

                    <div className="delivery-sheet__option-details" style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <span
                          className="delivery-sheet__option-title"
                          style={{ fontWeight: 700, fontSize: '14px' }}
                        >
                          {zone.name}
                        </span>
                        {zone.isDelivering ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--success, #22c55e)',
                              background: 'var(--success-bg, rgba(34, 197, 94, 0.08))',
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            Delivering
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              background: 'var(--surface2)',
                              border: '1px solid var(--border)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            Paused
                          </span>
                        )}
                      </div>

                      <span
                        className="delivery-sheet__option-sub"
                        style={{ marginTop: '4px', fontSize: '12.5px', lineHeight: 1.4 }}
                      >
                        {zone.areasCovered ||
                          `${zone.state} ${zone.region ? `· ${zone.region}` : ''}`}
                      </span>

                      {zone.estimatedDeliveryDays && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '6px',
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Clock size={12} />
                          <span>{zone.estimatedDeliveryDays}</span>
                        </div>
                      )}

                      {!zone.isDelivering && zone.pauseReason && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '11.5px',
                            color: '#DC2626',
                            background: '#FEF2F2',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            lineHeight: 1.3,
                          }}
                        >
                          {zone.pauseReason}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div
                        className="delivery-sheet__check"
                        style={{ marginLeft: '10px', marginTop: '4px' }}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </BottomSheetModal>
    </>
  )
}
