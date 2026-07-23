import type { HomeRequestLocation } from '@/features/dashboard/constants/homeRequestLocations'
import { formatHomeRequestLocation } from '@/features/dashboard/utils/homeRequestLocations'

export function HomeRequestLocationsList({
  locations,
}: {
  locations: HomeRequestLocation[]
}) {
  if (locations.length === 0) return null

  return (
    <ul className="home-req__locations-list">
      {locations.map((location) => (
        <li key={`${location.state}-${location.area}-${location.subArea ?? 'whole'}`}>
          <span className="home-req__locations-list-label">{formatHomeRequestLocation(location)}</span>
          <span className="home-req__locations-list-state">{location.state}</span>
        </li>
      ))}
    </ul>
  )
}
