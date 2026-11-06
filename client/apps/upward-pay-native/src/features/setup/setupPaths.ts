export const SETUP_PATHS = {
  rental: '/dashboard/setup/rental',
  confirm: '/dashboard/setup/confirm',
  phone: '/dashboard/setup/phone',
  properties: '/dashboard/setup/properties',
  dashboard: '/dashboard',
} as const

export type SetupHref = (typeof SETUP_PATHS)[keyof typeof SETUP_PATHS]

export function setupEditPropertyPath(propertyUuid: string): string {
  return `${SETUP_PATHS.rental}?mode=edit&property=${encodeURIComponent(propertyUuid)}`
}

export function setupAddPropertyPath(): string {
  return `${SETUP_PATHS.rental}?mode=edit&new=1`
}
