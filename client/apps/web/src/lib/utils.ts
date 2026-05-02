/**
 * Generates a unique ID with an optional prefix
 */
export function generateId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11)

  return prefix ? `${prefix}_${uuid}` : uuid
}
