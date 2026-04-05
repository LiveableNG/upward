export const SAVED_LANDLORD_REPOSITORY = Symbol('SAVED_LANDLORD_REPOSITORY')
export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY')
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')

export interface SavedLandlord {
  id: string
  tenantId: string
  name: string
  accountName: string
  accountNumber: string
  bankName: string
  bankCode: string
  lastAmount?: number
  lastPaid?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ISavedLandlordRepository {
  create(data: Omit<SavedLandlord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedLandlord>
  findByTenantId(tenantId: string): Promise<SavedLandlord[]>
  findById(id: string): Promise<SavedLandlord | null>
  update(id: string, data: Partial<SavedLandlord>): Promise<SavedLandlord>
}

export interface Transaction {
  id: string
  tenantId: string
  type: string
  status: string
  amount: number
  reference: string
  narration?: string
  receiptNumber?: string
  receiptUrl?: string
  landlordId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems?: any
  createdAt: Date
  updatedAt: Date
}

export interface ITransactionRepository {
  create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>
  findByTenantId(tenantId: string): Promise<Transaction[]>
  findById(id: string): Promise<Transaction | null>
  findByReference(reference: string): Promise<Transaction | null>
  updateStatus(id: string, status: string): Promise<Transaction>
  update(id: string, data: Partial<Transaction>): Promise<Transaction>
}

export interface Bank {
  code: string
  name: string
}

export interface AccountVerification {
  accountNumber: string
  accountName: string
  bankCode: string
}

export interface IPaymentGateway {
  getBanks(): Promise<Bank[]>
  verifyAccountNumber(accountNumber: string, bankCode: string): Promise<AccountVerification>
  verifyTransaction(reference: string): Promise<boolean>
}
