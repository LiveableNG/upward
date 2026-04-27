import { useQuery } from '@tanstack/react-query'
import * as locationService from '../services/locationService'

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: () => locationService.getCountries()
  })
}

export const useCities = (country: string) => {
  return useQuery({
    queryKey: ['cities', country],
    queryFn: () => locationService.getCities(country),
    enabled: !!country
  })
}
