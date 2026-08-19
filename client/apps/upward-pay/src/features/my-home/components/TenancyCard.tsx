'use client'

import { Building2, ChevronDown, Home, MapPin } from 'lucide-react'
import type { MyHomeProperty } from '../hooks/useMyHome'
import { getRentInfo } from '../utils/rentInfo'

type Props = {
  property: MyHomeProperty
  properties: MyHomeProperty[]
  selectedUuid: string
  onSelectProperty: (uuid: string) => void
}

export function TenancyCard({ property, properties, selectedUuid, onSelectProperty }: Props) {
  const rentInfo = getRentInfo(property.rentStartDate, property.rentEndDate)
  const managerName = property.managerDisplayName

  return (
    <section className="my-home-tenancy" aria-label="Tenancy details">
      <h2 className="my-home-tenancy__title">My home</h2>

      {properties.length > 1 ? (
        <label className="my-home-tenancy__picker">
          <Building2 size={15} aria-hidden />
          <select
            aria-label="Select property"
            value={selectedUuid}
            onChange={(event) => onSelectProperty(event.target.value)}
          >
            {properties.map((item) => (
              <option key={item.uuid} value={item.uuid}>
                {item.unitName ? `${item.unitName} · ${item.label}` : item.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden />
        </label>
      ) : null}

      <div className="my-home-tenancy__unit">
        <Home size={15} aria-hidden />
        <span>{property.unitName || 'Your unit'}</span>
      </div>

      <div className="my-home-tenancy__address">
        <MapPin size={15} aria-hidden />
        <span>{property.label}</span>
      </div>

      {managerName || property.managerEmail ? (
        <div className="my-home-tenancy__manager">
          <p className="my-home-tenancy__manager-label">Manager info</p>
          {managerName ? <p className="my-home-tenancy__manager-name">{managerName}</p> : null}
          {property.managerEmail ? (
            <a className="my-home-tenancy__manager-email" href={`mailto:${property.managerEmail}`}>
              {property.managerEmail}
            </a>
          ) : null}
        </div>
      ) : null}

      {rentInfo ? (
        <>
          <div className="my-home-tenancy__rent-divider" />
          <div className="my-home-tenancy__rent">
            <div className="my-home-tenancy__rent-left">
              <span className="my-home-tenancy__rent-label">Rent expires</span>
              <span className="my-home-tenancy__rent-date">{rentInfo.expiresOn}</span>
            </div>
            <span
              className={`my-home-tenancy__rent-remaining${rentInfo.expired ? ' my-home-tenancy__rent-remaining--expired' : ''}`}
            >
              {rentInfo.timeLeft}
            </span>
          </div>
          <div className="my-home-tenancy__rent-bar" aria-hidden>
            <span
              className="my-home-tenancy__rent-bar-fill"
              style={{ width: `${rentInfo.percentageTimeLeft}%` }}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
