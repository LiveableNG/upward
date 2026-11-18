export function formatCurrency(amount: number, currency = 'NGN'): string {
  const rounded = Math.round(amount)
  return `${currency} ${rounded.toLocaleString()}`
}

export const NotificationCopy = {
  tenant: {
    rentPaymentSuccessful(amount: number, currency = 'NGN') {
      const formatted = formatCurrency(amount, currency)
      return {
        title: 'Rent payment successful',
        message: `Your rent payment of ${formatted} has been received successfully.`,
        type: 'PAYMENT',
        url: '/dashboard/transactions',
      }
    },

    partialRentPaymentReceived(amount: number, remaining: number, currency = 'NGN') {
      const formattedAmount = formatCurrency(amount, currency)
      const formattedRemaining = formatCurrency(remaining, currency)
      return {
        title: 'Partial rent payment received',
        message: `${formattedAmount} received. Your outstanding rent balance is ${formattedRemaining}.`,
        type: 'PAYMENT',
        url: '/dashboard/transactions',
      }
    },

    rentPaymentUnsuccessful() {
      return {
        title: 'Rent payment unsuccessful',
        message: 'Your payment could not be completed. Please try again or use another payment method.',
        type: 'PAYMENT',
        url: '/dashboard/pay-rent',
      }
    },

    rentReceiptAvailable(amount: number, currency = 'NGN', receiptUuid?: string) {
      const formatted = formatCurrency(amount, currency)
      return {
        title: 'Rent receipt available',
        message: `Your receipt for the ${formatted} rent payment is ready to view.`,
        type: 'PAYMENT',
        url: receiptUuid ? `/dashboard/receipts?id=${receiptUuid}` : '/dashboard/receipts',
      }
    },

    rentReminder(amount: number, currency = 'NGN', daysUntil: number, propertyAddress?: string) {
      const formatted = formatCurrency(amount, currency)
      const target = propertyAddress ? ` for ${propertyAddress}` : ''
      const timing = daysUntil === 0 ? 'is due today' : `is due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
      return {
        title: 'Rent payment reminder',
        message: `Your rent payment of ${formatted}${target} ${timing}.`,
        type: 'PAYMENT',
        url: '/dashboard/pay-rent',
      }
    },

    rentOverdue(amount: number, currency = 'NGN', daysOverdue: number, propertyAddress?: string) {
      const formatted = formatCurrency(amount, currency)
      const target = propertyAddress ? ` for ${propertyAddress}` : ''
      return {
        title: 'Rent payment overdue',
        message: `Your rent payment of ${formatted}${target} is ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} past due.`,
        type: 'PAYMENT',
        url: '/dashboard/pay-rent',
      }
    },

    vaultDocumentAdded(documentTitle: string, categoryName?: string) {
      const categoryDesc = categoryName ? ` under ${categoryName}` : ''
      return {
        title: 'New document in Tenant Vault',
        message: `"${documentTitle}" has been added to your vault${categoryDesc}.`,
        type: 'VAULT_DOCUMENT',
        url: '/dashboard/my-home/documents',
      }
    },

    credibilityRequestDeclined(propertyAddress?: string) {
      const target = propertyAddress ? ` for ${propertyAddress}` : ''
      return {
        title: 'Credibility verification update',
        message: `Your rent verification request${target} could not be confirmed by the property manager.`,
        type: 'CREDIBILITY',
        url: '/dashboard/score-breakdown',
      }
    },
  },

  pm: {
    rentPaymentReceived(tenantName: string, amount: number, unitName: string, propertyName: string, currency = 'NGN') {
      const formatted = formatCurrency(amount, currency)
      return {
        title: 'Rent payment received',
        message: `${tenantName} paid ${formatted} for Unit ${unitName} at ${propertyName}.`,
        type: 'PAYMENT_COMPLETED',
      }
    },

    partialRentPaymentReceived(
      tenantName: string,
      amount: number,
      remaining: number,
      unitName: string,
      propertyName: string,
      currency = 'NGN',
    ) {
      const formatted = formatCurrency(amount, currency)
      const formattedRemaining = formatCurrency(remaining, currency)
      return {
        title: 'Partial rent payment received',
        message: `${tenantName} paid ${formatted} towards rent for Unit ${unitName} at ${propertyName}. Outstanding balance: ${formattedRemaining}.`,
        type: 'PAYMENT_COMPLETED',
      }
    },
  },
}
