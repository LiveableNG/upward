export interface Country {
  id: string
  name: string
}

export interface LocationRepository {
  getCountries(): Promise<Country[]>
  getCities(countryId: string): Promise<string[]>
}

export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY')
