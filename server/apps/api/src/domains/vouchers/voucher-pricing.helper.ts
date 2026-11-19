import { Offering } from '../goals/offering.repository'

/**
 * Pure domain helper that personalizes a voucher-eligible offering's display
 * pricing for a user with an available voucher balance.
 *
 * Mobile/Web client contract (OfferingCard & OfferingDetailScreen):
 * - compareAtPrice = offering.compareAtPrice ?? (pricingModel === 'FIXED' ? offering.maxPrice : null)
 * - hasDiscount = compareAtPrice != null && price != null && compareAtPrice > price
 *
 * Therefore:
 * - User with ₦0 voucher: price = basePrice, minPrice = basePrice, maxPrice = null (no strikethrough)
 * - User with >₦0 voucher: price = basePrice - discount, minPrice = basePrice - discount, maxPrice = basePrice
 */
export function applyVoucherPricingToOffering(
  offering: Offering,
  availableBalanceKobo: bigint,
): Offering {
  if (
    !offering.voucherEligible ||
    offering.pricingModel !== 'FIXED' ||
    offering.price == null ||
    offering.price <= 0
  ) {
    return offering
  }

  if (availableBalanceKobo <= 0n) {
    return {
      ...offering,
      maxPrice: null,
    }
  }

  const basePriceKobo = BigInt(Math.round(offering.price * 100))
  const discountKobo =
    availableBalanceKobo >= basePriceKobo ? basePriceKobo : availableBalanceKobo

  if (discountKobo <= 0n) {
    return {
      ...offering,
      maxPrice: null,
    }
  }

  const discountedPriceNaira = Number(basePriceKobo - discountKobo) / 100
  const basePriceNaira = Number(basePriceKobo) / 100

  return {
    ...offering,
    price: discountedPriceNaira,
    minPrice: discountedPriceNaira,
    maxPrice: basePriceNaira,
  }
}
