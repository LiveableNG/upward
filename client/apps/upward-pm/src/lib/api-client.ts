import { getAccessToken, setAccessToken } from './auth-token'
import { Capacitor } from '@capacitor/core'

const API_BASE = (typeof window !== 'undefined' && !Capacitor.isNativePlatform())
  ? '/api/v1' 
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1')

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function runRefresh(isPortal: boolean): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const refreshPath = isPortal ? '/landlords/auth/refresh' : '/pm/auth/refresh'
    const response = await fetch(`${API_BASE}${refreshPath}`, {
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
  let finalPath = path;

  // Path translation for Landlord Portal
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')) {
    if (path.startsWith('/pm/')) {
      finalPath = path.replace('/pm/', '/landlords/management/');
    }
  }

  const url = finalPath.startsWith('http') ? finalPath : `${API_BASE}${finalPath}`
  
  const makeRequest = async (token: string | null): Promise<T> => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token && Capacitor.isNativePlatform()) {
      headers['Authorization'] = `Bearer ${token}`
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (Capacitor.isNativePlatform()) {
      headers['x-client-platform'] = 'capacitor'
    }

    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const controller = new AbortController()
    const timeoutMs = (options.body instanceof FormData || path.includes('/ai-document/')) ? 120000 : 15000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const fetchOptions: RequestInit = {
      credentials: 'include',
      cache: 'no-store',
      ...options,
      headers,
      signal: controller.signal,
    }

    const res = await fetch(url, fetchOptions)
    clearTimeout(timeoutId)
    
    const isPublicAuthRoute = path.includes('/auth/') && !path.includes('/auth/me')

    if (res.status === 401 && !isPublicAuthRoute) {
      if (!isRefreshing) {
        isRefreshing = true
        const isPortal = path.startsWith('/landlords') || 
                         (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal'))
        refreshPromise = runRefresh(isPortal)
      }
      
      const newToken = await refreshPromise
      if (newToken) {
        return makeRequest(newToken)
      } else {
        // If it's a 401 on an authenticated route and refresh failed, we don't always want a loud error
        const isAuthRoute = !path.includes('/auth/') || path.includes('/auth/me')
        if (isAuthRoute) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('upward_session_active')
            const isPortal = window.location.pathname.startsWith('/portal')
            const loginPath = isPortal ? '/portal/login' : '/pm-login'
            const isPublicPage = window.location.pathname === '/' ||
                                 window.location.pathname === '/welcome' ||
                                 window.location.pathname === '/login' || 
                                 window.location.pathname === '/signup' ||
                                 window.location.pathname === '/pm-login' || 
                                 window.location.pathname === '/pm-signup' ||
                                 window.location.pathname === '/forgot-password' ||
                                 window.location.pathname === '/pm-forgot-password' ||
                                 window.location.pathname.startsWith('/invite') ||
                                 window.location.pathname.startsWith('/reset-password') ||
                                 (isPortal && (window.location.pathname === '/portal/login' || window.location.pathname === '/portal/signup'))

            if (!isPublicPage) {
              window.location.href = `${loginPath}?redirect=${encodeURIComponent(window.location.pathname)}`
            }
          }
          throw new Error('Session expired')
        }
        return {} as T
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'An error occurred' }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error: any = new Error(errorData.message || 'Request failed')
      error.code = errorData.code
      error.data = errorData
      throw error
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return {} as T
    }

    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/pdf') || contentType?.includes('image/')) {
      return (await res.blob()) as any
    }

    try {
      const text = await res.text()
      if (!text) return {} as T
      return JSON.parse(text)
    } catch (err) {
      throw new Error('Invalid response format from server')
    }
  }

  return makeRequest(getAccessToken())
}
