import { Injectable } from '@nestjs/common'

@Injectable()
export class LocationsService {
  private readonly countries = [
    { id: 'nigeria', name: 'Nigeria' },
    { id: 'kenya', name: 'Kenya' },
  ]

  getCountries() {
    return this.countries
  }

  async getCities(countryName: string): Promise<string[]> {
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: countryName }),
      })

      if (!response.ok) {
        console.error(`Failed to fetch cities for ${countryName}: ${response.statusText}`)
        return []
      }

      const result = (await response.json()) as { data: string[] }
      return result.data || []
    } catch (error) {
      console.error(`Error fetching cities for ${countryName}:`, error)
      return []
    }
  }
}
