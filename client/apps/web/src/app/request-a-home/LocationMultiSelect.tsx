'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import {
  MAX_REQUEST_HOME_LOCATIONS,
  filterLocationOptions,
  getLocationOptionByKey,
  type RequestHomeLocation,
} from '@/lib/request-home-locations'

type LocationMultiSelectProps = {
  value: RequestHomeLocation[]
  onChange: (locations: RequestHomeLocation[]) => void
}
  
export function LocationMultiSelect({ value, onChange }: LocationMultiSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selectedKeys = useMemo(
    () => value.map((location) => `${location.state}|${location.area}|${location.subArea || ''}`),
    [value],
  )

  const suggestions = useMemo(
    () => (query.trim() ? filterLocationOptions(query, selectedKeys) : []),
    [query, selectedKeys],
  )

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const addLocation = (key: string) => {
    if (value.length >= MAX_REQUEST_HOME_LOCATIONS) return
    const option = getLocationOptionByKey(key)
    if (!option) return
    if (selectedKeys.includes(option.key)) return

    const next: RequestHomeLocation = {
      state: option.state,
      area: option.area,
      ...(option.subArea ? { subArea: option.subArea } : {}),
    }
    onChange([...value, next])
    setQuery('')
    setOpen(false)
  }

  const removeLocation = (key: string) => {
    onChange(
      value.filter(
        (location) => `${location.state}|${location.area}|${location.subArea || ''}` !== key,
      ),
    )
  }

  return (
    <div className="rah-loc" ref={rootRef}>
      <div className="rah-loc__search-wrap">
        <Search size={16} className="rah-loc__search-icon" aria-hidden />
        <input
          type="search"
          className="rah-input rah-loc__search"
          placeholder={
            value.length >= MAX_REQUEST_HOME_LOCATIONS
              ? `Maximum ${MAX_REQUEST_HOME_LOCATIONS} areas`
              : 'Search areas — e.g. Yaba, Lekki, Wuse'
          }
          value={query}
          disabled={value.length >= MAX_REQUEST_HOME_LOCATIONS}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            setOpen(nextQuery.trim().length > 0)
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true)
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />

        {open && query.trim() && value.length < MAX_REQUEST_HOME_LOCATIONS ? (
          <div id={listId} className="rah-loc__dropdown" role="listbox">
            {suggestions.length === 0 ? (
              <p className="rah-loc__empty">No matching locations</p>
            ) : (
              suggestions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="rah-loc__option"
                  role="option"
                  onClick={() => addLocation(option.key)}
                >
                  <MapPin size={14} aria-hidden />
                  <span>{option.label}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {value.length > 0 ? (
        <div className="rah-loc__selected" aria-label="Selected locations">
          {value.map((location) => {
            const key = `${location.state}|${location.area}|${location.subArea || ''}`
            const option = getLocationOptionByKey(key)
            const label =
              option?.label ||
              [location.subArea, location.area, location.state].filter(Boolean).join(', ')
            return (
              <span key={key} className="rah-loc__chip">
                <MapPin size={14} aria-hidden />
                <span>{label}</span>
                <button
                  type="button"
                  className="rah-loc__chip-remove"
                  onClick={() => removeLocation(key)}
                  aria-label={`Remove ${label}`}
                >
                  <X size={14} />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}

      <p className="rah-loc__hint">
        {value.length}/{MAX_REQUEST_HOME_LOCATIONS} areas selected
      </p>
    </div>
  )
}
