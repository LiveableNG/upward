import { request } from '@/lib/api-client'

export interface Country {
  id: string
  name: string
}

export async function getCountries() {
  return request<{ data: Country[] }>('/locations/countries')
}

export async function getCities(country: string) {
  return request<{ data: string[] }>(`/locations/cities?country=${country.toLowerCase()}`)
}
