import { type LineItemAllocation, type LineItemRecord } from '@/features/payments/types'

export function distributeAmount(
  amount: number,
  items: LineItemRecord[],
  transactionFee: number,
  benefitsFee: number,
  isBenefitsOptedIn: boolean,
): LineItemAllocation[] {
  const allocs: LineItemAllocation[] = items.map((i) => {
    let remaining = Math.max(0, i.totalAmount - i.amountPaid)
    let totalAmount = i.totalAmount

    if (i.id === -2 || i.name === 'Transaction Fee') {
      totalAmount = amount > 0 ? transactionFee : 0
      remaining = totalAmount
    } else if (i.id === -3 || i.name === 'Upward Benefits') {
      if (i.status === 'PAID') {
        totalAmount = i.totalAmount
        remaining = 0
      } else {
        totalAmount = amount > 0 && isBenefitsOptedIn ? benefitsFee : 0
        remaining = totalAmount
      }
    }

    return {
      id: i.id,
      name: i.name,
      totalAmount,
      amountPaid: i.amountPaid,
      remaining,
      allocated: 0,
    }
  })

  let remaining = amount

  const txFeeItem = allocs.find((a) => a.id === -2 || a.name === 'Transaction Fee')
  if (txFeeItem && txFeeItem.remaining > 0) {
    const pay = Math.min(remaining, txFeeItem.remaining)
    txFeeItem.allocated = pay
    remaining -= pay
  }

  for (const item of allocs) {
    if (
      item.id === -2 ||
      item.id === -3 ||
      item.name === 'Transaction Fee' ||
      item.name === 'Upward Benefits'
    ) {
      continue
    }
    if (item.remaining <= 0) continue
    const pay = Math.min(remaining, item.remaining)
    item.allocated = pay
    remaining -= pay
    if (remaining <= 0) break
  }

  if (isBenefitsOptedIn) {
    const benFeeItem = allocs.find((a) => a.id === -3 || a.name === 'Upward Benefits')
    if (benFeeItem && benFeeItem.remaining > 0) {
      const pay = Math.min(remaining, benFeeItem.remaining)
      benFeeItem.allocated = pay
    }
  }

  return allocs
}

export function buildLineItemsWithFees(
  records: LineItemRecord[],
  rates: {
    transactionFee: number
    benefitsFee: number
    benefitsPaid: boolean
    benefitsPaidForRequest: boolean
  },
): LineItemRecord[] {
  const items = records.filter(
    (i) =>
      i.id !== -2 &&
      i.id !== -3 &&
      i.name !== 'Processing Fee' &&
      i.name !== 'Transaction Fee' &&
      i.name !== 'Upward Benefits',
  )

  items.unshift({
    id: -2,
    name: 'Transaction Fee',
    totalAmount: rates.transactionFee,
    amountPaid: 0,
    status: 'PENDING',
  })

  const shouldShowBenefits =
    (rates.benefitsFee > 0 && !rates.benefitsPaid) ||
    (rates.benefitsPaid && rates.benefitsPaidForRequest)

  if (shouldShowBenefits) {
    items.unshift({
      id: -3,
      name: 'Upward Benefits',
      totalAmount: rates.benefitsFee,
      amountPaid: rates.benefitsPaidForRequest ? rates.benefitsFee : 0,
      status: rates.benefitsPaidForRequest ? 'PAID' : 'PENDING',
    })
  }

  return items
}
