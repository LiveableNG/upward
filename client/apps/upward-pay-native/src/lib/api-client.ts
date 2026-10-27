import { Platform } from 'react-native'

import { API_BASE_URL } from '@/lib/config'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/auth-storage'

type ApiEnvelope<T> = {
  data?: T
  message?: string
  meta?: unknown
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>
    if (envelope.data !== undefined) return envelope.data
  }
  return payload as T
}

async function runRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const storedRefreshToken = await getRefreshToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-client-platform': 'react-native',
      }
      if (storedRefreshToken) {
        headers['x-refresh-token'] = storedRefreshToken
      }

      const response = await fetch(`${API_BASE_URL}/user/auth/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken: storedRefreshToken ?? undefined }),
      })

      if (!response.ok) throw new Error('Refresh failed')

      const json = await response.json()
      const data = unwrapPayload<{ accessToken?: string; refreshToken?: string }>(json)
      if (!data.accessToken) return null

      await setAccessToken(data.accessToken)
      if (data.refreshToken) {
        await setRefreshToken(data.refreshToken)
      }
      return data.accessToken
    } catch {
      await clearAuthTokens()
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

  const makeRequest = async (token: string | null): Promise<T> => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
      'x-client-platform': 'react-native',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (path.includes('/user/auth/logout')) {
      const refresh = await getRefreshToken()
      if (refresh) headers['x-refresh-token'] = refresh
    }

    const controller = new AbortController()
    const timeoutMs = options.body instanceof FormData ? 120_000 : 15_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await fetch(url, { ...options, headers, signal: controller.signal })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.')
      }
      throw new Error(`Unable to reach the server at ${API_BASE_URL}.`)
    }
    clearTimeout(timeoutId)

    if (
      response.status === 401 &&
      !path.includes('/user/auth/refresh') &&
      !path.includes('/user/auth/login') &&
      !path.includes('/user/auth/otp-login')
    ) {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = runRefresh()
      }
      const newToken = await refreshPromise
      if (newToken) return makeRequest(newToken)
      throw new Error('Session expired')
    }

    const text = await response.text()
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')
    let parsed: unknown = {}
    if (isJson && text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { message: text }
      }
    } else if (text) {
      parsed = { message: text }
    }

    if (!response.ok) {
      const payload = parsed as { message?: string }
      const error = new Error(payload.message || 'Request failed') as Error & {
        status?: number
        data?: unknown
      }
      error.status = response.status
      error.data = parsed
      throw error
    }

    return unwrapPayload<T>(parsed)
  }

  const token = await getAccessToken()
  return makeRequest(token)
}

export function getClientPlatformLabel(): string {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'react-native'
}
