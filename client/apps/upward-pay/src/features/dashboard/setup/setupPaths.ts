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
  dashboard: '/dashboard',
  profile: '/dashboard/me',
} as const

export function setupPath(
  pathname: string,
  options?: { mode?: SetupMode },
): string {
  if (options?.mode === 'edit') {
    return `${pathname}?mode=edit`
  }
  return pathname
}

export function useSetupMode() {
  const searchParams = useSearchParams()
  const mode: SetupMode = searchParams.get('mode') === 'edit' ? 'edit' : 'onboarding'
  const isEdit = mode === 'edit'

  const withMode = (pathname: string) => setupPathForMode(pathname, mode)

  return { mode, isEdit, withMode }
}
