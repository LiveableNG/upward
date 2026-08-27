import { Injectable } from '@nestjs/common'

@Injectable()
export class GetRevenueMetricsUseCase {
  execute(successTransactions: any[]) {
    let totalUpwardFees = 0
    let totalBenefitsFees = 0
    let totalRentProcessed = 0

    successTransactions.forEach((tx) => {
      let txFee = 0
      let benFee = 0

      if (tx.fee || tx.platformFee) {
        txFee += Number(tx.fee || tx.platformFee || 0)
      }

      if (tx.lineItems && Array.isArray(tx.lineItems)) {
        tx.lineItems.forEach((item: any) => {
          const name = item.name || item.label || ''
          const amt = Number(item.amountPaid || item.amount || item.totalAmount || 0)
          const lower = name.toLowerCase().trim()
          if (lower.includes('benefit')) {
            benFee += amt
          } else if (
            !lower.includes('service charge') &&
            !lower.includes('maintenance') &&
            !lower.includes('management') &&
            !lower.includes('security') &&
            !lower.includes('caution') &&
            !lower.includes('legal') &&
            !lower.includes('agency') &&
            (
              lower === 'processing fee' ||
              lower === 'transaction fee' ||
              lower.includes('upward') ||
              lower.includes('processing fee') ||
              lower.includes('transaction fee') ||
              lower.includes('paystack') ||
              lower.includes('gateway fee')
            )
          ) {
            if (!tx.fee && !tx.platformFee) {
              txFee += amt
            }
          }
        })
      }

      totalUpwardFees += txFee
      totalBenefitsFees += benFee
      totalRentProcessed += Math.max(0, tx.amount - txFee - benFee)
    })

    return {
      totalUpwardFees,
      totalBenefitsFees,
      totalRentProcessed,
    }
  }
}
