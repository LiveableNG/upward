import { request } from '@/lib/api-client'

export type Country = {
  id: string
  name: string
}

export async function fetchCountries(): Promise<Country[]> {
  return request<Country[]>('/locations/countries')
}

export async function fetchCities(countryId: string): Promise<string[]> {
  const id = countryId.trim().toLowerCase()
  if (!id) return []
  return request<string[]>(`/locations/cities?country=${encodeURIComponent(id)}`)
}
