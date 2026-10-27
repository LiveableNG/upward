export function asList<T = unknown>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object') {
    const data = (res as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

export function panelErrorMessage(err: unknown): string {
  const e = err as { status?: number; message?: string } | undefined
  if (e?.status === 501) return 'Not available yet for your estate.'
  if (e?.status === 404) return 'This home is not linked to your building yet.'
  return e?.message ?? 'Could not load'
}
