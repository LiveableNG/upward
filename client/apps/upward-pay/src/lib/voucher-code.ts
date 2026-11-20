const VOUCHER_STORAGE_KEY = 'upward_signup_voucher_code'
const VOUCHER_COOKIE_NAME = 'upward_signup_voucher'
const VALID_VOUCHER_CODE_REGEX = /^[A-Za-z0-9_-]{2,64}$/

export function sanitizeVoucherCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toUpperCase()
  return VALID_VOUCHER_CODE_REGEX.test(trimmed) ? trimmed : null
}

export function persistSignupVoucherCode(rawCode: string | null | undefined): string | null {
  const code = sanitizeVoucherCode(rawCode)
  if (!code || typeof window === 'undefined') return null

  try {
    window.sessionStorage.setItem(VOUCHER_STORAGE_KEY, code)
  } catch {
    // Ignore storage quota / private mode errors
  }

  try {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${VOUCHER_COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=86400; SameSite=Lax${secureFlag}`
  } catch {
    // Ignore cookie errors
  }

  return code
}

export function getSignupVoucherCode(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const fromUrl = new URLSearchParams(window.location.search).get('voucher') ||
      new URLSearchParams(window.location.search).get('v')
    const sanitizedUrl = sanitizeVoucherCode(fromUrl)
    if (sanitizedUrl) {
      persistSignupVoucherCode(sanitizedUrl)
      return sanitizedUrl
    }
  } catch {
    // Ignore URL parse errors
  }

  try {
    const fromSession = sanitizeVoucherCode(window.sessionStorage.getItem(VOUCHER_STORAGE_KEY))
    if (fromSession) return fromSession
  } catch {
    // Ignore storage errors
  }

  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${VOUCHER_COOKIE_NAME}=`))
    if (match) {
      const value = decodeURIComponent(match.split('=').slice(1).join('='))
      return sanitizeVoucherCode(value)
    }
  } catch {
    // Ignore cookie errors
  }

  return null
}

export function clearSignupVoucherCode(): void {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(VOUCHER_STORAGE_KEY)
  } catch {
    // Ignore
  }

  try {
    document.cookie = `${VOUCHER_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  } catch {
    // Ignore
  }
}
