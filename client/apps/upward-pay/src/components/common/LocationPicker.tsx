'use client'

import { MapPin, Globe, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getCountries, getCities, type Country } from '@/features/onboarding/services/locationService'

interface LocationPickerProps {
  country: string
  city: string
  onCountryChange: (country: string) => void
  onCityChange: (city: string) => void
}

export default function LocationPicker({ country, city, onCountryChange, onCityChange }: LocationPickerProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)

  // Fetch initial countries
  useEffect(() => {
    async function init() {
      setLoadingCountries(true)
      try {
        const response = await getCountries()
        setCountries(response.data)
      } catch (err) {
        console.error('Failed to load countries', err)
      } finally {
        setLoadingCountries(false)
      }
    }
    init()
  }, [])

  // Fetch cities when country changes
  useEffect(() => {
    if (country) {
      async function fetchCities() {
        setLoadingCities(true)
        try {
          // Send country name as used in backend logic (lowercase)
          const response = await getCities(country)
          setCities(response.data)
        } catch (err) {
          console.error('Failed to load cities', err)
        } finally {
          setLoadingCities(false)
        }
      }
      fetchCities()
    } else {
      setCities([])
    }
  }, [country])

  return (
    <div className="location-picker">
      <div className="auth-form__field">
        <label htmlFor="country">Country</label>
        <div className="input-with-icon">
          {loadingCountries ? <Loader2 className="animate-spin" size={17} /> : <Globe size={17} />}
          <select
            id="country"
            value={country}
            onChange={(e) => {
              onCountryChange(e.target.value)
              onCityChange('') // Reset city
            }}
            className="auth-form__select"
            required
            disabled={loadingCountries}
          >
            <option value="">{loadingCountries ? 'Loading countries...' : 'Select Country'}</option>
            {countries.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="auth-form__field mt-4">
        <label htmlFor="city">City</label>
        <div className="input-with-icon">
          {loadingCities ? <Loader2 className="animate-spin" size={17} /> : <MapPin size={17} />}
          <select
            id="city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="auth-form__select"
            disabled={!country || loadingCities}
            required
          >
            <option value="">
              {!country ? 'Select a country first' : loadingCities ? 'Loading cities...' : 'Select City'}
            </option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <style jsx>{`
        .auth-form__select {
          flex: 1;
          background: none;
          border: none;
          padding: 14px 12px;
          font-size: 15px;
          font-family: var(--font);
          color: var(--text);
          outline: none;
          cursor: pointer;
        }
        .auth-form__select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
