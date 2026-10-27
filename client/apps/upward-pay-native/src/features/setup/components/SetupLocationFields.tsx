import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'

import { CaptionText } from '@/components/text'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { countryApiIdToCode, countryCodeToApiId } from '@/features/setup/locationCountry'
import {
  fetchCities,
  fetchCountries,
  type Country,
} from '@/features/setup/services/locationService'
import { STATES } from '@/lib/location-data'
import { useAppTheme } from '@/theme'

type SetupLocationFieldsProps = {
  countryCode: string
  state: string
  onCountryChange: (countryCode: string) => void
  onStateChange: (state: string) => void
}

export function SetupLocationFields({
  countryCode,
  state,
  onCountryChange,
  onStateChange,
}: SetupLocationFieldsProps) {
  const { colors } = useAppTheme()
  const countryId = countryCodeToApiId(countryCode)

  const countriesQuery = useQuery({
    queryKey: ['locations', 'countries'],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 60,
  })

  const citiesQuery = useQuery({
    queryKey: ['locations', 'cities', countryId],
    queryFn: () => fetchCities(countryId),
    enabled: Boolean(countryId),
    staleTime: 1000 * 60 * 30,
  })

  const countries = countriesQuery.data ?? []
  const cityOptions =
    citiesQuery.data && citiesQuery.data.length > 0
      ? citiesQuery.data
      : (STATES[countryCode] ?? STATES.NG ?? [])

  const countryLabel =
    countries.find((c: Country) => countryApiIdToCode(c.id) === countryCode)?.name ??
    (countryCode === 'KE' ? 'Kenya' : 'Nigeria')

  return (
    <View style={{ gap: 8 }}>
      {countriesQuery.isLoading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={colors.clay} />
          <CaptionText color="textMuted">Loading countries…</CaptionText>
        </View>
      ) : (
        <OptionPicker
          label="Country"
          value={countryLabel}
          options={countries.map((c) => c.name)}
          onChange={(name) => {
            const match = countries.find((c) => c.name === name)
            if (!match) return
            onCountryChange(countryApiIdToCode(match.id))
            onStateChange('')
          }}
        />
      )}

      {citiesQuery.isFetching && !citiesQuery.data ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={colors.clay} />
          <CaptionText color="textMuted">Loading states / cities…</CaptionText>
        </View>
      ) : (
        <OptionPicker
          label="State / city"
          value={state}
          options={cityOptions}
          onChange={onStateChange}
          placeholder="Select"
        />
      )}
    </View>
  )
}
