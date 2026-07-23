'use client'

import { useMemo, useState } from 'react'
import { MapPin, Plus, X } from 'lucide-react'
import {
  HOME_REQUEST_AREAS,
  HOME_REQUEST_LOCATION_COPY,
  HOME_REQUEST_STATES,
  type HomeRequestLocation,
  type HomeRequestState,
} from '@/features/dashboard/constants/homeRequestLocations'
import {
  formatHomeRequestLocation,
  homeRequestLocationKey,
  isSameHomeRequestLocation,
} from '@/features/dashboard/utils/homeRequestLocations'

const WHOLE_SUB_AREA = '__whole__'

type HomeRequestLocationPickerProps = {
  value: HomeRequestLocation[]
  onChange: (locations: HomeRequestLocation[]) => void
}

export function HomeRequestLocationPicker({ value, onChange }: HomeRequestLocationPickerProps) {
  const [state, setState] = useState<HomeRequestState>('Lagos')
  const [area, setArea] = useState('')
  const [subArea, setSubArea] = useState(WHOLE_SUB_AREA)
  const [error, setError] = useState('')

  const areaOptions = useMemo(() => HOME_REQUEST_AREAS[state] ?? [], [state])
  const subAreaOptions = useMemo(
    () => areaOptions.find((option) => option.area === area)?.subAreas ?? [],
    [area, areaOptions],
  )

  const handleStateChange = (nextState: HomeRequestState) => {
    setState(nextState)
    setArea('')
    setSubArea(WHOLE_SUB_AREA)
    setError('')
  }

  const handleAreaChange = (nextArea: string) => {
    setArea(nextArea)
    setSubArea(WHOLE_SUB_AREA)
    setError('')
  }

  const handleAddLocation = () => {
    if (!area) {
      setError(HOME_REQUEST_LOCATION_COPY.areaRequired)
      return
    }

    const nextLocation: HomeRequestLocation = {
      state,
      area,
      ...(subArea !== WHOLE_SUB_AREA ? { subArea } : {}),
    }

    if (value.some((location) => isSameHomeRequestLocation(location, nextLocation))) {
      setError(HOME_REQUEST_LOCATION_COPY.duplicateError)
      return
    }

    onChange([...value, nextLocation])
    setError('')
  }

  const handleRemoveLocation = (location: HomeRequestLocation) => {
    const key = homeRequestLocationKey(location)
    onChange(value.filter((item) => homeRequestLocationKey(item) !== key))
    setError('')
  }

  return (
    <div className="home-req__locations">
      <div className="home-req__locations-head">
        <label className="pay-flow__field-label">{HOME_REQUEST_LOCATION_COPY.sectionTitle}</label>
        <p className="home-req__locations-hint">{HOME_REQUEST_LOCATION_COPY.sectionHint}</p>
      </div>

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="home-req-state">
          {HOME_REQUEST_LOCATION_COPY.stateLabel}
        </label>
        <div className="pay-flow__input-wrap">
          <select
            id="home-req-state"
            className="home-req__select"
            value={state}
            onChange={(event) => handleStateChange(event.target.value as HomeRequestState)}
          >
            {HOME_REQUEST_STATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="home-req-area">
          {HOME_REQUEST_LOCATION_COPY.areaLabel}
        </label>
        <div className="pay-flow__input-wrap">
          <MapPin size={16} className="pay-flow__select-trigger-icon" aria-hidden />
          <select
            id="home-req-area"
            className="home-req__select"
            value={area}
            onChange={(event) => handleAreaChange(event.target.value)}
            disabled={!state}
          >
            <option value="">Select area</option>
            {areaOptions.map((option) => (
              <option key={option.area} value={option.area}>
                {option.area}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="home-req-sub-area">
          {HOME_REQUEST_LOCATION_COPY.subAreaLabel}{' '}
          <span className="pay-flow__field-optional">(optional)</span>
        </label>
        <div className="pay-flow__input-wrap">
          <select
            id="home-req-sub-area"
            className="home-req__select"
            value={subArea}
            onChange={(event) => {
              setSubArea(event.target.value)
              setError('')
            }}
            disabled={!area}
          >
            <option value={WHOLE_SUB_AREA}>{HOME_REQUEST_LOCATION_COPY.subAreaWhole}</option>
            {subAreaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="home-req__locations-error">{error}</p> : null}

      <button
        type="button"
        className="home-req__add-location"
        onClick={handleAddLocation}
        disabled={!area}
      >
        <Plus size={16} aria-hidden />
        {HOME_REQUEST_LOCATION_COPY.addLocation}
      </button>

      {value.length > 0 ? (
        <div className="home-req__selected">
          <span className="pay-flow__field-label">{HOME_REQUEST_LOCATION_COPY.selectedLabel}</span>
          <div className="home-req__selected-list">
            {value.map((location) => (
              <span key={homeRequestLocationKey(location)} className="home-req__selected-chip">
                <span>{formatHomeRequestLocation(location)}</span>
                <button
                  type="button"
                  className="home-req__selected-remove"
                  onClick={() => handleRemoveLocation(location)}
                  aria-label={`Remove ${formatHomeRequestLocation(location)}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
