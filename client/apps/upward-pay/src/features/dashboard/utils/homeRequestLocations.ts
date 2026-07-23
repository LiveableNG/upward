import type { HomeRequestLocation } from '../constants/homeRequestLocations'

export function homeRequestLocationKey(location: HomeRequestLocation): string {
  return [location.state, location.area, location.subArea ?? ''].join('|')
}

export function formatHomeRequestLocation(location: HomeRequestLocation): string {
  if (location.subArea) {
    return `${location.area} - ${location.subArea}`
  }
  return location.area
}

export function formatHomeRequestLocations(locations: HomeRequestLocation[]): string {
  if (locations.length === 0) return 'No locations'
  return locations.map(formatHomeRequestLocation).join(', ')
}

export function isSameHomeRequestLocation(a: HomeRequestLocation, b: HomeRequestLocation): boolean {
  return homeRequestLocationKey(a) === homeRequestLocationKey(b)
}

export function getPrimaryHomeRequestState(locations: HomeRequestLocation[]): string {
  return locations[0]?.state ?? ''
}
