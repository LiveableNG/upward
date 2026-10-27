export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('+')) return trimmed
  return `+234${trimmed.replace(/^0/, '')}`
}
