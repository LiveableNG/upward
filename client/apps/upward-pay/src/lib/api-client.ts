import { getAccessToken, setAccessToken } from './auth-token'
import { Capacitor } from '@capacitor/core'

const API_BASE = (typeof window !== 'undefined' && !Capacitor.isNativePlatform())
  ? '/api/v1'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1')

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function runRefresh(): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(`${API_BASE}/user/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) throw new Error('Refresh failed')
    
    const data = await response.json()
    if (data.accessToken) {
      setAccessToken(data.accessToken)
      return data.accessToken
    }
    return null
  } catch (err) {
    setAccessToken(null)
    return null
  } finally {
    isRefreshing = false
    refreshPromise = null
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  
  const makeRequest = async (token: string | null) => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }

    // Only add Authorization header if we have a token AND we are on native platform
    // On web, we rely on secure HTTP-only cookies via the same-domain proxy
    if (token && Capacitor.isNativePlatform()) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (Capacitor.isNativePlatform()) {
      headers['x-client-platform'] = 'capacitor'
    }

    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers,
      signal: controller.signal,
    }

    const res = await fetch(url, fetchOptions)
    clearTimeout(timeoutId)
    
    if (res.status === 401 && !path.includes('/user/auth/refresh') && !path.includes('/user/auth/login')) {
      // Token might be expired. Try to refresh.
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = runRefresh()
      }
      
      const newToken = await refreshPromise
      if (newToken) {
        // Retry the original request with the new token
        return makeRequest(newToken)
      } else {
        // Refresh failed, let the 401 propagate
        throw new Error('Session expired')
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'An error occurred' }))
      const error: any = new Error(errorData.message || 'Request failed')
      error.code = errorData.code
      error.data = errorData
      throw error
    }

    return res.json() as Promise<T>
  }

  return makeRequest(getAccessToken())
}

export async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  
  const makeRequest = async (token: string | null): Promise<Blob> => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token && Capacitor.isNativePlatform()) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (Capacitor.isNativePlatform()) {
      headers['x-client-platform'] = 'capacitor'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (res.status === 401 && !path.includes('/user/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = runRefresh()
      }
      const newToken = await refreshPromise
      if (newToken) return makeRequest(newToken)
      throw new Error('Session expired')
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Download failed' }))
      throw new Error(errorData.message || 'Download failed')
    }

    return res.blob()
  }

  return makeRequest(getAccessToken())
}
