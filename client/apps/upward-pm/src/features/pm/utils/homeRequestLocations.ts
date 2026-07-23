import rawLocations from '@/data/location.json'

export type HomeRequestLocationOption = {
  key: string
  label: string
  state: string
  area: string
  subArea?: string
  searchText: string
}

function parseLocationEntry(entry: string): HomeRequestLocationOption | null {
  const parts = entry
    .split(' , ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  let state: string
  let area: string
  let subArea: string | undefined

  if (parts.length === 1) {
    state = parts[0]!
    area = parts[0]!
  } else if (parts.length === 2) {
    area = parts[0]!
    state = parts[1]!
  } else {
    subArea = parts[0]!
    area = parts[1]!
    state = parts[2]!
  }

  const label = [subArea, area, state]
    .filter((part, index, list) => Boolean(part) && list.indexOf(part) === index)
    .join(', ')

  return {
    key: `${state}|${area}|${subArea || ''}`,
    label,
    state,
    area,
    ...(subArea ? { subArea } : {}),
    searchText: label.toLowerCase(),
  }
}

export const HOME_REQUEST_LOCATION_OPTIONS: HomeRequestLocationOption[] = Array.from(
  new Map(
    (rawLocations as string[])
      .map(parseLocationEntry)
      .filter((option): option is HomeRequestLocationOption => option !== null)
      .map((option) => [option.key, option]),
  ).values(),
)

export const HOME_REQUEST_STATE_OPTIONS = Array.from(
  new Set(HOME_REQUEST_LOCATION_OPTIONS.map((option) => option.state)),
)
  .sort((a, b) => a.localeCompare(b))
  .map((state) => ({ label: state, value: state }))

export function filterLocationOptions(query: string, limit = 30): HomeRequestLocationOption[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return HOME_REQUEST_LOCATION_OPTIONS.filter((option) => option.searchText.includes(needle)).slice(
    0,
    limit,
  )
}

export function locationMatchesFilter(
  locations: Array<{ state: string; area: string; subArea?: string }>,
  filter: HomeRequestLocationOption | null,
): boolean {
  if (!filter) return true
  return locations.some((location) => {
    if (location.state !== filter.state) return false
    if (location.area !== filter.area) return false
    if (filter.subArea) return location.subArea === filter.subArea
    return true
  })
}
