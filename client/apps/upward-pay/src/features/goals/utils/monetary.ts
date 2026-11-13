export function formatMinorUnitAmount(
  amountMinor: string | bigint | number | null | undefined,
  currency = 'NGN',
  minorDigits = 2,
): string {
  if (amountMinor == null || amountMinor === '') return '—'

  let str: string
  if (typeof amountMinor === 'bigint') {
    str = amountMinor.toString()
  } else if (typeof amountMinor === 'number') {
    if (!Number.isFinite(amountMinor)) return '—'
    str = Math.trunc(amountMinor).toString()
  } else {
    str = String(amountMinor).trim()
  }

  if (!/^-?\d+$/.test(str)) return '—'

  const isNegative = str.startsWith('-')
  const absStr = isNegative ? str.slice(1) : str
  const bi = BigInt(absStr)

  const divisor = BigInt(10 ** minorDigits)
  const integerPart = bi / divisor
  const fractionalPart = bi % divisor

  const intFormatted = integerPart.toLocaleString('en-US')

  const symbol = getCurrencySymbol(currency)

  const zero = BigInt(0)
  if (fractionalPart === zero) {
    return `${isNegative ? '-' : ''}${symbol}${intFormatted}`
  }

  const fracStr = fractionalPart.toString().padStart(minorDigits, '0').replace(/0+$/, '')
  return `${isNegative ? '-' : ''}${symbol}${intFormatted}.${fracStr}`
}

export function minorToMajorDecimal(
  amountMinor: string | bigint | null | undefined,
  minorDigits = 2,
): string {
  if (amountMinor == null || amountMinor === '') return '0'
  const str = typeof amountMinor === 'bigint' ? amountMinor.toString() : String(amountMinor).trim()
  if (!/^-?\d+$/.test(str)) return '0'

  const isNegative = str.startsWith('-')
  const absStr = isNegative ? str.slice(1) : str
  const bi = BigInt(absStr)

  const divisor = BigInt(10 ** minorDigits)
  const integerPart = bi / divisor
  const fractionalPart = bi % divisor

  const zero = BigInt(0)
  if (fractionalPart === zero) {
    return `${isNegative ? '-' : ''}${integerPart.toString()}`
  }

  const fracStr = fractionalPart.toString().padStart(minorDigits, '0').replace(/0+$/, '')
  return `${isNegative ? '-' : ''}${integerPart.toString()}.${fracStr}`
}

export function majorToMinorString(majorStr: string, minorDigits = 2): string {
  const clean = majorStr.replace(/,/g, '').trim()
  if (!clean || !/^-?\d*(\.\d*)?$/.test(clean) || clean === '.' || clean === '-') return '0'

  const isNegative = clean.startsWith('-')
  const unsigned = isNegative ? clean.slice(1) : clean
  const [intPart = '0', fracPart = ''] = unsigned.split('.')

  const safeInt = intPart === '' ? '0' : intPart
  const paddedFrac = (fracPart + '0'.repeat(minorDigits)).slice(0, minorDigits)

  const minorBi = BigInt(safeInt) * BigInt(10 ** minorDigits) + BigInt(paddedFrac)
  const zero = BigInt(0)
  return `${isNegative && minorBi !== zero ? '-' : ''}${minorBi.toString()}`
}

export function getCurrencySymbol(currency = 'NGN'): string {
  switch (currency.toUpperCase()) {
    case 'NGN':
      return '₦'
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'CAD':
      return 'CA$'
    default:
      return `${currency} `
  }
}
