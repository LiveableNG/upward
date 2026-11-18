'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  MapPin,
  ChevronDown,
  Check,
  X,
  Search,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  type UserDeliveryLocation,
  type DeliveryZoneItem,
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
  const [zones, setZones] = useState<DeliveryZoneItem[]>([])
  const [isLoadingZones, setIsLoadingZones] = useState(true)

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
        if (isMounted) {
          setZones(dynamic || [])
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
            <span className="delivery-bar__value">
              {formatShortLocation(location)}
            </span>
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
        subtitle="Select your region to verify delivery logistics coverage."
        maxWidth="520px"
      >
        {/* Search Bar */}
        <div className="delivery-sheet__search-box">
          <Search size={16} className="delivery-sheet__search-icon" />
          <input
            type="text"
            placeholder="Search by state, city, landmark or area (e.g. Lekki, Ikeja, Wuse)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="delivery-sheet__search-input"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="delivery-sheet__search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="delivery-sheet__content">
          {/* Zero Zones Configured Empty State (Upward Theme) */}
          {zones.length === 0 && !isLoadingZones && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--shell-border, #f0e9df)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--clay-faint)',
                  border: '1px solid var(--shell-border, #f0e9df)',
                  color: 'var(--clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <MapPin size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                Delivery Coverage Expanding Soon
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                We are working towards expanding our delivery coverage to other locations soon!
                <br />
                Once delivery coverage zones are rolled out, you will be able to select your zone and order directly to your door.
              </p>
            </div>
          )}

          {/* Search Uncovered State Notice (Upward Theme) */}
          {searchQuery.trim() && filteredZones.length === 0 && zones.length > 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--shell-border, #f0e9df)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--clay-faint)',
                  border: '1px solid var(--shell-border, #f0e9df)',
                  color: 'var(--clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <MapPin size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                Location Not Covered Yet
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
              <span className="delivery-sheet__section-title">
                Verified Rental Property
              </span>
              <div className="delivery-sheet__presets">
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
                    <MapPin size={16} />
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
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Available Configured Zones */}
          <div className="delivery-sheet__section">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2px',
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

            <div className="delivery-sheet__presets">
              {filteredZones.map((zone) => {
                const isSelected =
                  !location.isRentalDefault && location.zoneTag === zone.tag
                return (
                  <button
                    key={zone.tag}
                    type="button"
                    className={`delivery-sheet__option ${
                      isSelected ? 'delivery-sheet__option--selected' : ''
                    }`}
                    onClick={() => handleSelectZone(zone)}
                  >
                    <div
                      className="delivery-sheet__option-icon"
                      style={{
                        color: zone.isDelivering ? 'var(--success, #15803d)' : 'var(--text-muted)',
                        background: zone.isDelivering ? 'rgba(22, 163, 74, 0.1)' : 'var(--surface2)',
                      }}
                    >
                      <MapPin size={16} />
                    </div>

                    <div className="delivery-sheet__option-details">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span className="delivery-sheet__option-title">
                          {zone.name}
                        </span>
                        {zone.isDelivering ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#15803d',
                              background: 'rgba(22, 163, 74, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              flexShrink: 0,
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
                              border: '1px solid var(--shell-border, #f0e9df)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              flexShrink: 0,
                            }}
                          >
                            Paused
                          </span>
                        )}
                      </div>

                      <span className="delivery-sheet__option-sub">
                        {zone.areasCovered || `${zone.state} ${zone.region ? `· ${zone.region}` : ''}`}
                      </span>

                      {zone.estimatedDeliveryDays && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '4px',
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
                            color: '#b91c1c',
                            background: '#fef2f2',
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
                      <div className="delivery-sheet__check">
                        <Check size={14} strokeWidth={2.5} />
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
