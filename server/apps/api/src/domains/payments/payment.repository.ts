export const SAVED_LANDLORD_REPOSITORY = Symbol('SAVED_LANDLORD_REPOSITORY')
export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY')
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')

export interface SavedLandlord {
  id: number
  uuid: string
  userId: number
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
  create(data: Omit<SavedLandlord, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<SavedLandlord>
  findByUserId(userId: number): Promise<SavedLandlord[]>
  findById(id: number): Promise<SavedLandlord | null>
  findByUuid(uuid: string): Promise<SavedLandlord | null>
  update(id: number, data: Partial<SavedLandlord>): Promise<SavedLandlord>
}

export interface Transaction {
  id: number
  uuid: string
  userId: number
  type: string
  status: string
  amount: number
  reference: string
  narration?: string
  landlordId?: string
  paymentType?: string
  propertyAddress?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems?: any
  createdAt: Date
  updatedAt: Date
}

export interface ITransactionRepository {
  create(data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<Transaction>
  findByUserId(userId: number): Promise<Transaction[]>
  findById(id: number): Promise<Transaction | null>
  findByUuid(uuid: string): Promise<Transaction | null>
  findByReference(reference: string): Promise<Transaction | null>
  updateStatus(id: number, status: string): Promise<Transaction>
  update(id: number, data: Partial<Transaction>): Promise<Transaction>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializeTransaction(data: {
    email: string
    amount: number
    reference: string
    metadata?: any
  }): Promise<{ authorizationUrl: string }>
  // createVirtualAccount(user: {
  //   email: string
  //   firstName: string
  //   lastName: string
  //   phone?: string
  // }): Promise<{ bankName: string; accountNumber: string; bankCode?: string; accountName?: string }>
}

