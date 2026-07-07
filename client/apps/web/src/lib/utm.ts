export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type UtmKey = (typeof UTM_KEYS)[number]
export type UtmParams = Partial<Record<UtmKey, string>>

const STORAGE_KEY = 'upward:first-touch-utm'

export function getUtmFromSearchParams(searchParams: URLSearchParams): UtmParams {
  const result: UtmParams = {}
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)
    if (value) result[key] = value
  }
  return result
}

export function mergeUtmIntoUrl(url: string, utm: UtmParams): string {
  const parsedUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://upward.goodtenants.io')
  for (const key of UTM_KEYS) {
    const value = utm[key]
    if (value && !parsedUrl.searchParams.get(key)) {
      parsedUrl.searchParams.set(key, value)
    }
  }
  return parsedUrl.pathname + parsedUrl.search
}

export function persistFirstTouchUtm(utm: UtmParams): void {
  if (typeof window === 'undefined') return
  if (Object.keys(utm).length === 0) return
  const existing = readStoredUtm()
  if (Object.keys(existing).length > 0) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
}

export function readStoredUtm(): UtmParams {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as UtmParams
  } catch {
    return {}
  }
}
