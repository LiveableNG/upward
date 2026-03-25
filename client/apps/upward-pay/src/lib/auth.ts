import type { TenantProfile } from './api'

const TOKEN_KEY = 'upward_token'
const TENANT_KEY = 'upward_tenant'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TENANT_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function setTenant(tenant: TenantProfile): void {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant))
}

export function getTenant(): TenantProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(TENANT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function logout(): void {
  removeToken()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}
