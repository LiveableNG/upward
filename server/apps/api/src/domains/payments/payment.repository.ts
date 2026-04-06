export const SAVED_LANDLORD_REPOSITORY = Symbol('SAVED_LANDLORD_REPOSITORY')
export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY')
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')
export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY')
export const SAVINGS_GOAL_REPOSITORY = Symbol('SAVINGS_GOAL_REPOSITORY')

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
  landlordId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems?: any
  walletId?: string
  goalId?: string
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializeTransaction(data: {
    email: string
    amount: number
    reference: string
    metadata?: any
  }): Promise<{ authorizationUrl: string }>
  createVirtualAccount(tenant: {
    email: string
    fullName: string
    phone?: string
  }): Promise<{ bankName: string; accountNumber: string; bankCode?: string; accountName?: string }>
}

export interface Wallet {
  id: string
  tenantId: string
  balance: number
  bankName?: string
  accountNumber?: string
  accountName?: string
  bankCode?: string
  createdAt: Date
  updatedAt: Date
}

export interface IWalletRepository {
  findByTenantId(tenantId: string): Promise<Wallet | null>
  create(tenantId: string): Promise<Wallet>
  incrementBalance(id: string, amount: number): Promise<Wallet>
  decrementBalance(id: string, amount: number): Promise<Wallet>
  update(id: string, data: Partial<Wallet>): Promise<Wallet>
}

export interface SavingsGoal {
  id: string
  tenantId: string
  name: string
  targetAmount: number
  currentAmount: number
  startDate: Date
  endDate?: Date
  status: string

  reminderEnabled: boolean
  reminderFrequency?: string
  reminderDay?: number
  autoSaveEnabled: boolean
  autoSaveAmount?: number

  createdAt: Date
  updatedAt: Date
}

export interface ISavingsGoalRepository {
  create(
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'currentAmount'>,
  ): Promise<SavingsGoal>
  findByTenantId(tenantId: string): Promise<SavingsGoal[]>
  findById(id: string): Promise<SavingsGoal | null>
  updateProgress(id: string, amount: number): Promise<SavingsGoal>
  update(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal>
}
