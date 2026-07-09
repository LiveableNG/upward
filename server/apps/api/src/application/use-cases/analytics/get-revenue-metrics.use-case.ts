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

      if (tx.lineItems && Array.isArray(tx.lineItems)) {
        tx.lineItems.forEach((item: any) => {
          const name = item.name || item.label || ''
          const amt = Number(item.amountPaid || item.amount || item.totalAmount || 0)
          if (name === 'Processing Fee' || name === 'Transaction Fee') {
            txFee += amt
          } else if (name === 'Upward Benefits') {
            benFee += amt
          }
        })
      }

      totalUpwardFees += txFee
      totalBenefitsFees += benFee
      totalRentProcessed += tx.amount - txFee - benFee
    })

    return {
      totalUpwardFees,
      totalBenefitsFees,
      totalRentProcessed,
    }
  }
}
