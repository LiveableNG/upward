/**
 * Normalizes phone numbers with special handling for Nigerian formats.
 * e.g.,
 * 08124618329       -> +2348124618329
 * 8124618329        -> +2348124618329
 * 2348124618329     -> +2348124618329
 * +234 812 461 8329 -> +2348124618329
 * +23408124618329   -> +2348124618329 (accidental leading 0 after +234)
 * +1 202 555 0199   -> +12025550199
 */
export function normalizePhoneNumber(rawPhone?: string | null, defaultCountryCode = '+234'): string {
  if (!rawPhone) return ''
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '')
  if (!cleaned) return ''

  // Fix accidental double prefix or leading zero after +234 e.g. +23408124618329
  if (cleaned.startsWith('+2340') && cleaned.length === 15) {
    return '+234' + cleaned.substring(5)
  }
  if (cleaned.startsWith('2340') && cleaned.length === 14) {
    return '+234' + cleaned.substring(4)
  }

  // If already starts with '+', return
  if (cleaned.startsWith('+')) {
    return cleaned
  }

  // If starts with 00 (international exit prefix), convert to +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2)
  }

  // Nigerian local standard: 11 digits starting with 0 (e.g. 080..., 081..., 070..., 090..., 091...)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `${defaultCountryCode}${cleaned.substring(1)}`
  }

  // 10 digits without leading 0 (e.g. 8124618329, 7031234567)
  if (cleaned.length === 10 && /^[789]\d{9}$/.test(cleaned)) {
    return `${defaultCountryCode}${cleaned}`
  }

  // 13 digits starting with 234 without +
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned}`
  }

  // If starts with 0 and other length, strip 0 and prepend defaultCountryCode
  if (cleaned.startsWith('0')) {
    return `${defaultCountryCode}${cleaned.substring(1)}`
  }

  // Default: prepend + if only digits
  return `+${cleaned}`
}

/**
 * Normalizes email address by trimming and converting to lowercase.
 */
export function normalizeEmail(rawEmail?: string | null): string | null {
  if (!rawEmail) return null
  const cleaned = rawEmail.trim().toLowerCase()
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Returns alternative representation formats for a phone number
 * so queries can find matches even if legacy records were stored un-normalized.
 */
export function getPhoneSearchVariants(phone?: string | null): string[] {
  if (!phone) return []
  const normalized = normalizePhoneNumber(phone)
  if (!normalized) return []

  const variants = new Set<string>()
  variants.add(normalized)

  if (normalized.startsWith('+234') && normalized.length === 14) {
    const national = normalized.substring(4) // e.g. 8124618329
    variants.add(`0${national}`)             // 08124618329
    variants.add(`234${national}`)           // 2348124618329
    variants.add(national)                   // 8124618329
  }

  return Array.from(variants)
}

/**
 * Basic check if phone number has at least 7 digits after cleaning
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}
