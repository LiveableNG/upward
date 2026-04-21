const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

import { getAccessToken, setAccessToken } from './auth-token'

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function runRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/user/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    })
    
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

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers
    }

    const res = await fetch(url, fetchOptions)
    
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
