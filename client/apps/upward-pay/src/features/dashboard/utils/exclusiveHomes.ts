import {
  EXCLUSIVE_HOMES,
  type ExclusiveHome,
  type ExclusiveHomeBedFilter,
  type ExclusiveHomeCityFilter,
} from '../constants/exclusiveHomes'

export function filterExclusiveHomes(
  city: ExclusiveHomeCityFilter,
  beds: ExclusiveHomeBedFilter,
): ExclusiveHome[] {
  return EXCLUSIVE_HOMES.filter((home) => {
    const cityMatch = city === 'all' || home.city === city
    const bedsMatch =
      beds === 'any' ||
      (beds === '3' ? home.beds >= 3 : home.beds === Number(beds))
    return cityMatch && bedsMatch
  })
}

export function getExclusiveHomeById(id: string): ExclusiveHome | undefined {
  return EXCLUSIVE_HOMES.find((home) => home.id === id)
}

export function formatHomesCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'home available' : 'homes available'}`
}
