import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, initStoredTokens } from './auth-token'
import { Capacitor } from '@capacitor/core'

export const API_BASE = (typeof window !== 'undefined' && !Capacitor.isNativePlatform())
  ? '/api/v1'
  : (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api/v1' : ''))

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

export async function runRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      await initStoredTokens()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const storedRefreshToken = getRefreshToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (Capacitor.isNativePlatform()) {
        headers['x-client-platform'] = 'capacitor'
        if (storedRefreshToken) {
          headers['x-refresh-token'] = storedRefreshToken
        }
      }

      const response = await fetch(`${API_BASE}/user/auth/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
        credentials: 'include',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error('Refresh failed')
      
      const data = await response.json()
      if (data.accessToken) {
        setAccessToken(data.accessToken)
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken)
        }
        return data.accessToken
      }
      return null
    } catch (err) {
      console.warn('[api-client] Token refresh attempt failed:', err)
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE && !path.startsWith('http')) {
    throw new Error(
      'Configuration Error: NEXT_PUBLIC_API_URL is missing. Please check your Xcode Cloud workflow environment variables.'
    )
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  
  const makeRequest = async (token: string | null): Promise<T> => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token && Capacitor.isNativePlatform()) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (Capacitor.isNativePlatform()) {
      headers['x-client-platform'] = 'capacitor'
      if (path.includes('/user/auth/logout')) {
        const rt = getRefreshToken()
        if (rt) {
          headers['x-refresh-token'] = rt
        }
      }
    }

    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const isUpload = options.body instanceof FormData
    const timeoutDuration = isUpload ? 120000 : 15000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers,
      signal: controller.signal,
    }

    let res: Response
    try {
      res = await fetch(url, fetchOptions)
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error(`[api-client] Network error requesting ${url}:`, err)
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out for ${url}. Please check your internet connection.`)
      }
      if (err.message === 'Load failed' || err.message === 'Failed to fetch') {
        throw new Error(`Unable to reach server at ${url}. Please check your internet connection or server availability.`)
      }
      throw err
    }
    clearTimeout(timeoutId)
    
    if (res.status === 401 && !path.includes('/user/auth/refresh') && !path.includes('/user/auth/login')) {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = runRefresh()
      }
      
      const newToken = await refreshPromise
      if (newToken) {
        return makeRequest(newToken)
      } else {
        throw new Error('Session expired')
      }
    }

    // Handle empty or non-JSON responses safely
    const text = await res.text()
    const contentType = res.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')

    let data: any
    if (isJson && text) {
      try {
        data = JSON.parse(text)
      } catch (e) {
        data = text
      }
    } else {
      data = text ? { message: text } : {}
    }

    if (!res.ok) {
      const error: any = new Error(data.message || 'Request failed')
      error.code = data.code
      error.status = res.status
      error.data = data
      throw error
    }

    return data as T
  }

  return makeRequest(getAccessToken())
}

export async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  if (!API_BASE && !path.startsWith('http')) {
    throw new Error(
      'Configuration Error: NEXT_PUBLIC_API_URL is missing. Please check your Xcode Cloud workflow environment variables.'
    )
  }
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
    const timeoutId = setTimeout(() => controller.abort(), 120000)

    let res: Response
    try {
      res = await fetch(url, {
        credentials: 'include',
        ...options,
        headers,
        signal: controller.signal,
      })
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error(`[api-client] Network error requesting blob ${url}:`, err)
      if (err.name === 'AbortError') {
        throw new Error(`Download timed out for ${url}. Please check your internet connection.`)
      }
      if (err.message === 'Load failed' || err.message === 'Failed to fetch') {
        throw new Error(`Unable to reach server at ${url}. Please check your internet connection or server availability.`)
      }
      throw err
    }
    
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
