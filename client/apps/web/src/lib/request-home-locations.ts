import rawLocations from '../../public/location.json'

export type RequestHomeLocation = {
  state: string
  area: string
  subArea?: string
}

export type RequestHomeLocationOption = RequestHomeLocation & {
  key: string
  label: string
  searchText: string
}

function parseLocationEntry(entry: string): RequestHomeLocationOption | null {
  const parts = entry
    .split(' , ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  let location: RequestHomeLocation

  if (parts.length === 1) {
    const state = parts[0]!
    location = { state, area: state }
  } else if (parts.length === 2) {
    location = { state: parts[1]!, area: parts[0]! }
  } else {
    location = { state: parts[2]!, area: parts[1]!, subArea: parts[0]! }
  }

  const label = [location.subArea, location.area, location.state]
    .filter((part, index, list) => Boolean(part) && list.indexOf(part) === index)
    .join(', ')

  return {
    ...location,
    key: locationKey(location),
    label,
    searchText: label.toLowerCase(),
  }
}

export function locationKey(location: RequestHomeLocation): string {
  return `${location.state}|${location.area}|${location.subArea || ''}`
}

export const REQUEST_HOME_LOCATION_OPTIONS: RequestHomeLocationOption[] = Array.from(
  new Map(
    (rawLocations as string[])
      .map(parseLocationEntry)
      .filter((option): option is RequestHomeLocationOption => option !== null)
      .map((option) => [option.key, option]),
  ).values(),
)

export const MAX_REQUEST_HOME_LOCATIONS = 3

export function filterLocationOptions(
  query: string,
  selectedKeys: string[],
  limit = 40,
): RequestHomeLocationOption[] {
  const needle = query.trim().toLowerCase()
  const selected = new Set(selectedKeys)

  const matches = REQUEST_HOME_LOCATION_OPTIONS.filter((option) => {
    if (selected.has(option.key)) return false
    if (!needle) return true
    return option.searchText.includes(needle)
  })

  if (!needle) {
    const preferred = matches.filter((option) =>
      ['Lagos', 'Abuja', 'Rivers', 'Ogun', 'Oyo'].includes(option.state),
    )
    return (preferred.length > 0 ? preferred : matches).slice(0, limit)
  }

  return matches.slice(0, limit)
}

export function getLocationOptionByKey(key: string): RequestHomeLocationOption | undefined {
  return REQUEST_HOME_LOCATION_OPTIONS.find((option) => option.key === key)
}
