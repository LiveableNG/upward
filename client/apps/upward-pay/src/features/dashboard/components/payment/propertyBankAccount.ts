// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropertyLike = any

export type TransferBankAccount = {
  accountNumber: string
  accountName: string
  bankName: string
  bankCode?: string
  label: string
}

export function getSuggestedTransferAccounts(prop: PropertyLike): TransferBankAccount[] {
  const accounts: TransferBankAccount[] = []
  const seen = new Set<string>()

  const add = (entry: TransferBankAccount | null) => {
    if (!entry?.accountNumber?.trim()) return
    const key = entry.accountNumber.trim()
    if (seen.has(key)) return
    seen.add(key)
    accounts.push(entry)
  }

  if (prop.manualAccount) {
    const isPmConfigured = !!(
      prop.isManaged ||
      prop.isPlatformLinked ||
      prop.companyName ||
      prop.company
    )
    add({
      accountNumber: prop.manualAccount.accountNumber,
      accountName: prop.manualAccount.accountName,
      bankName: prop.manualAccount.bankName || '',
      bankCode: prop.manualAccount.bankCode,
      label: isPmConfigured ? 'Property manager account' : 'Your saved account',
    })
  }

  if (prop.pmManualAccount) {
    add({
      accountNumber: prop.pmManualAccount.accountNumber,
      accountName: prop.pmManualAccount.accountName,
      bankName: prop.pmManualAccount.bankName || '',
      bankCode: prop.pmManualAccount.bankCode,
      label: 'Property manager account',
    })
  }

  if (prop.subaccount?.accountNumber) {
    add({
      accountNumber: prop.subaccount.accountNumber,
      accountName: prop.subaccount.businessName || prop.company?.name || 'Landlord',
      bankName: '',
      bankCode: prop.subaccount.bankCode,
      label: 'Landlord account',
    })
  }

  return accounts
}

export function propertySupportsBankTransfer(prop: PropertyLike | null | undefined): boolean {
  if (!prop) return false
  if (prop.pmManualAccount?.accountNumber?.trim()) return true
  if (!prop.manualAccount?.accountNumber?.trim()) return false
  return !!(prop.isManaged || prop.isPlatformLinked || prop.companyName || prop.company)
}

export function accountsMatch(
  a: Pick<TransferBankAccount, 'accountNumber'>,
  b: Pick<TransferBankAccount, 'accountNumber'>,
): boolean {
  return a.accountNumber.trim() === b.accountNumber.trim()
}
