'use client'

import { useSearchParams } from 'next/navigation'

export type SetupMode = 'onboarding' | 'edit'

export function setupPathForMode(pathname: string, mode: SetupMode): string {
  return mode === 'edit' ? setupPath(pathname, { mode: 'edit' }) : pathname
}

export const SETUP_PATHS = {
  rental: '/dashboard/setup/rental',
  confirm: '/dashboard/setup/confirm',
  phone: '/dashboard/setup/phone',
  identity: '/dashboard/verify-identity',
  dashboard: '/dashboard',
  profile: '/dashboard/me',
} as const

export const SETUP_RETURN_PATHS = {
  payRent: '/dashboard/pay-rent',
} as const

function isSafeReturnPath(path: string | null): path is string {
  return !!path && path.startsWith('/dashboard')
}

export function setupAddPropertyPath(returnTo: string): string {
  return `${SETUP_PATHS.rental}?returnTo=${encodeURIComponent(returnTo)}`
}

export function setupAddPropertyEditPath(): string {
  return `${SETUP_PATHS.rental}?mode=edit&new=1`
}

export function setupEditPropertyPath(propertyUuid: string): string {
  return `${SETUP_PATHS.rental}?mode=edit&property=${encodeURIComponent(propertyUuid)}`
}

export function setupRentalListPath(): string {
  return `${SETUP_PATHS.rental}?mode=edit`
}

export function setupPath(
  pathname: string,
  options?: { mode?: SetupMode },
): string {
  if (options?.mode === 'edit') {
    return `${pathname}?mode=edit`
  }
  return pathname
}

export function useSetupReturnTo(): string | null {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  return isSafeReturnPath(returnTo) ? returnTo : null
}

export function useSetupMode() {
  const searchParams = useSearchParams()
  const mode: SetupMode = searchParams.get('mode') === 'edit' ? 'edit' : 'onboarding'
  const isEdit = mode === 'edit'
  const returnTo = searchParams.get('returnTo')

  const withMode = (pathname: string) => {
    let path = setupPathForMode(pathname, mode)
    if (isSafeReturnPath(returnTo)) {
      const sep = path.includes('?') ? '&' : '?'
      path = `${path}${sep}returnTo=${encodeURIComponent(returnTo)}`
    }
    return path
  }

  return {
    mode,
    isEdit,
    returnTo: isSafeReturnPath(returnTo) ? returnTo : null,
    withMode,
  }
}
