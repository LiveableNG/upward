/** Maps API country ids (nigeria) ↔ form/storage codes (NG). */
const ID_TO_CODE: Record<string, string> = {
  nigeria: 'NG',
  kenya: 'KE',
}

const CODE_TO_ID: Record<string, string> = {
  NG: 'nigeria',
  KE: 'kenya',
}

export function countryCodeToApiId(code: string): string {
  return CODE_TO_ID[code.toUpperCase()] ?? code.toLowerCase()
}

export function countryApiIdToCode(idOrCode: string): string {
  const lower = idOrCode.toLowerCase()
  if (ID_TO_CODE[lower]) return ID_TO_CODE[lower]
  if (lower === 'nigeria') return 'NG'
  if (lower === 'kenya') return 'KE'
  if (lower.length === 2) return lower.toUpperCase()
  return 'NG'
}
