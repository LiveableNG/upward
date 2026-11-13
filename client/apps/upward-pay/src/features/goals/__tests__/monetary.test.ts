import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMinorUnitAmount,
  minorToMajorDecimal,
  majorToMinorString,
  getCurrencySymbol,
} from '../utils/monetary'

test('Monetary Utilities — formatMinorUnitAmount', async (t) => {
  await t.test('formats standard kobo to Naira without decimals when clean', () => {
    assert.strictEqual(formatMinorUnitAmount('5000000', 'NGN'), '₦50,000')
    assert.strictEqual(formatMinorUnitAmount('100000', 'NGN'), '₦1,000')
    assert.strictEqual(formatMinorUnitAmount('100', 'NGN'), '₦1')
  })

  await t.test('formats minor units with fractional cents/kobo', () => {
    assert.strictEqual(formatMinorUnitAmount('5000050', 'NGN'), '₦50,000.5')
    assert.strictEqual(formatMinorUnitAmount('5000005', 'NGN'), '₦50,000.05')
  })

  await t.test('handles different currencies correctly', () => {
    assert.strictEqual(formatMinorUnitAmount('100000', 'USD'), '$1,000')
    assert.strictEqual(formatMinorUnitAmount('100000', 'EUR'), '€1,000')
    assert.strictEqual(formatMinorUnitAmount('100000', 'GBP'), '£1,000')
    assert.strictEqual(formatMinorUnitAmount('100000', 'CAD'), 'CA$1,000')
    assert.strictEqual(formatMinorUnitAmount('100000', 'GHS'), 'GHS 1,000')
  })

  await t.test('handles zero, negative, null, undefined and invalid input gracefully', () => {
    assert.strictEqual(formatMinorUnitAmount('0', 'NGN'), '₦0')
    assert.strictEqual(formatMinorUnitAmount('-50000', 'NGN'), '-₦500')
    assert.strictEqual(formatMinorUnitAmount(null, 'NGN'), '—')
    assert.strictEqual(formatMinorUnitAmount(undefined, 'NGN'), '—')
    assert.strictEqual(formatMinorUnitAmount('', 'NGN'), '—')
    assert.strictEqual(formatMinorUnitAmount('invalid', 'NGN'), '—')
  })

  await t.test('preserves BigInt precision beyond IEEE-754 limit', () => {
    // 9 quadrillion minor units would lose precision in JS Number
    const largeMinor = '900719925474099199'
    const formatted = formatMinorUnitAmount(largeMinor, 'NGN')
    assert.ok(formatted.startsWith('₦9,007,199,254,740,991'))
  })
})

test('Monetary Utilities — minorToMajorDecimal', async (t) => {
  await t.test('converts minor string to clean decimal string', () => {
    assert.strictEqual(minorToMajorDecimal('5000000'), '50000')
    assert.strictEqual(minorToMajorDecimal('5000050'), '50000.5')
    assert.strictEqual(minorToMajorDecimal('5000005'), '50000.05')
    assert.strictEqual(minorToMajorDecimal('0'), '0')
    assert.strictEqual(minorToMajorDecimal(null), '0')
    assert.strictEqual(minorToMajorDecimal(undefined), '0')
    assert.strictEqual(minorToMajorDecimal('-250000'), '-2500')
  })
})

test('Monetary Utilities — majorToMinorString', async (t) => {
  await t.test('converts major user input to minor unit string', () => {
    assert.strictEqual(majorToMinorString('50000'), '5000000')
    assert.strictEqual(majorToMinorString('50,000'), '5000000')
    assert.strictEqual(majorToMinorString('50000.50'), '5000050')
    assert.strictEqual(majorToMinorString('50000.05'), '5000005')
    assert.strictEqual(majorToMinorString('0'), '0')
    assert.strictEqual(majorToMinorString(''), '0')
    assert.strictEqual(majorToMinorString('-500'), '-50000')
  })
})

test('Monetary Utilities — getCurrencySymbol', () => {
  assert.strictEqual(getCurrencySymbol('NGN'), '₦')
  assert.strictEqual(getCurrencySymbol('ngn'), '₦')
  assert.strictEqual(getCurrencySymbol('USD'), '$')
  assert.strictEqual(getCurrencySymbol('EUR'), '€')
  assert.strictEqual(getCurrencySymbol('GBP'), '£')
  assert.strictEqual(getCurrencySymbol('ZAR'), 'ZAR ')
})
