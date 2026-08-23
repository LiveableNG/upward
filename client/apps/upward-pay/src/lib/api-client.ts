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
  
  const makeRequest = async (token: string | null): Promise<T> => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token && Capacitor.isNativePlatform()) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (Capacitor.isNativePlatform()) {
      headers['x-client-platform'] = 'capacitor'
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

    const res = await fetch(url, fetchOptions)
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
