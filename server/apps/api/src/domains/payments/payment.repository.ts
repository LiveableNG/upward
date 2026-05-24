

import { Prisma } from '@prisma/client'

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
  subaccountId?: number
  subaccount?: PaystackSubaccount
  createdAt: Date
  updatedAt: Date
}

export interface ISavedLandlordRepository {
  create(data: Omit<SavedLandlord, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<SavedLandlord>
  findByUserId(userId: number): Promise<SavedLandlord[]>
  findById(id: number): Promise<SavedLandlord | null>
  findByUuid(uuid: string): Promise<SavedLandlord | null>
  update(id: number, data: Partial<SavedLandlord>, tx?: Prisma.TransactionClient): Promise<SavedLandlord>
}

export interface Transaction {
  id: number
  uuid: string
  userId: number
  type: string
  status: string
  amount: number
  currency: string
  reference: string
  narration?: string
  landlordId?: string
  paymentType?: string
  propertyAddress?: string
  paymentRequestId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems?: any
  isManual?: boolean
  settlementStatus?: string
  paymentRequest?: any
  createdAt: Date
  updatedAt: Date
}

export interface ITransactionRepository {
  create(data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<Transaction>
  findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<Transaction[]>
  findById(id: number, tx?: Prisma.TransactionClient): Promise<Transaction | null>
  findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<Transaction | null>
  findByReference(reference: string, tx?: Prisma.TransactionClient): Promise<Transaction | null>
  findRecentDvaTransaction(accountNumber: string, createdAfter?: Date): Promise<Transaction | null>
  updateStatus(id: number, status: string, tx?: Prisma.TransactionClient): Promise<Transaction>
  update(id: number, data: Partial<Transaction>, tx?: Prisma.TransactionClient): Promise<Transaction>
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

export interface TransactionVerification {
  status: boolean
  amount?: number
  currency?: string
  fees?: number
}

export interface IPaymentGateway {
  getBanks(): Promise<Bank[]>
  verifyAccountNumber(accountNumber: string, bankCode: string): Promise<AccountVerification>
  verifyTransaction(reference: string): Promise<TransactionVerification>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializeTransaction(data: {
    email: string
    amount: number
    reference: string
    subaccount?: string
    metadata?: any
    channels?: string[]
  }): Promise<{ authorizationUrl: string; accessCode?: string; reference: string }>
  findOrCreateSubaccount(data: {
    businessName: string
    bankCode: string
    accountNumber: string
  }): Promise<PaystackSubaccount | null>
  createCustomer(data: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }): Promise<string>
  createDedicatedAccount(data: {
    customerCode: string
    subaccountCode?: string
  }): Promise<any>
  initiateTransfer(data: {
    amount: number
    accountNumber: string
    bankCode: string
    reference: string
    narration?: string
  }): Promise<any>
}

export interface PaymentLineItem {
  id?: number
  uuid?: string
  paymentRequestId: number
  name: string
  totalAmount: number
  amountPaid: number
  status: string // PENDING, PARTIAL, PAID
  sortOrder?: number
  createdAt?: Date
  updatedAt?: Date
}

export interface IPaymentLineItemRepository {
  create(data: Omit<PaymentLineItem, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<PaymentLineItem>
  findByPaymentRequestId(paymentRequestId: number, tx?: Prisma.TransactionClient): Promise<PaymentLineItem[]>
  update(id: number, data: Partial<PaymentLineItem>, tx?: Prisma.TransactionClient): Promise<PaymentLineItem>
  bulkCreate(items: Omit<PaymentLineItem, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>[], tx?: Prisma.TransactionClient): Promise<PaymentLineItem[]>
  deleteByPaymentRequestId(paymentRequestId: number, tx?: Prisma.TransactionClient): Promise<void>
}

export interface PaymentRequest {
  id?: number
  uuid: string
  userId: number
  userPropertyId?: number
  amount: number
  currency: string
  description?: string
  dueDate: Date
  status: string
  amountPaid?: number
  allowPartial?: boolean
  minAmount?: number
  rentStartDate?: Date
  rentEndDate?: Date
  rentType?: string
  paidAt?: Date
  reference?: string
  companyName?: string
  managerName?: string
  propertyLocation?: string
  subaccountId?: number
  subaccount?: PaystackSubaccount
  webhookUrl?: string
  platformName?: string
  platformId?: number
  isManual?: boolean
  lineItemRecords?: PaymentLineItem[]
  userPropertyUuid?: string
  createdAt: Date
  updatedAt: Date
}

export interface IPaymentRequestRepository {
  create(data: Omit<PaymentRequest, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<PaymentRequest>
  findById(id: number, tx?: Prisma.TransactionClient): Promise<PaymentRequest | null>
  findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<PaymentRequest | null>
  findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<PaymentRequest[]>
  findByUserIdAndStatus(userId: number, status: string, tx?: Prisma.TransactionClient): Promise<PaymentRequest[]>
  update(id: number, data: Partial<PaymentRequest>, tx?: Prisma.TransactionClient): Promise<PaymentRequest>
  delete(id: number, tx?: Prisma.TransactionClient): Promise<void>
}

export interface PaystackSubaccount {
  id: number
  uuid: string
  accountNumber: string
  bankCode: string
  subaccountCode: string
  businessName?: string
  createdAt: Date
  updatedAt: Date
}

export interface ISubaccountRepository {
  create(data: Omit<PaystackSubaccount, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<PaystackSubaccount>
  findByAccountInfo(accountNumber: string, bankCode: string): Promise<PaystackSubaccount | null>
}

export interface WebhookLog {
  id: string
  platformId: number
  event: string
  url: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
  status: string // PENDING, SENT, FAILED
  responseCode?: number
  errorMessage?: string
  retries: number
  lastTriedAt?: Date
  createdAt: Date
  updatedAt: Date
  platform?: {
    name: string
  }
}

export interface IWebhookRepository {
  create(data: Omit<WebhookLog, 'id' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<WebhookLog>
  update(id: string, data: Partial<WebhookLog>, tx?: Prisma.TransactionClient): Promise<WebhookLog>
  findToRetry(maxRetries: number): Promise<WebhookLog[]>
  findAll(params: {
    page: number
    limit: number
    search?: string
    status?: string
  }): Promise<{ logs: WebhookLog[]; total: number }>
  findById(id: string): Promise<WebhookLog | null>
}

export interface Overpayment {
  id: number
  uuid: string
  userId: number
  amount: number
  currency: string
  transactionId?: number
  paymentRequestId?: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface IOverpaymentRepository {
  create(data: Omit<Overpayment, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<Overpayment>
  findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<Overpayment[]>
  findByUserIdAndStatus(userId: number, status: string, tx?: Prisma.TransactionClient): Promise<Overpayment[]>
  update(id: number, data: Partial<Overpayment>, tx?: Prisma.TransactionClient): Promise<Overpayment>
}


export interface DVAAccount {
  id: number
  uuid: string
  accountNumber: string
  accountName: string
  bankName: string
  bankCode: string
  accountCode: string
  paystackCustomerId: string
  userPropertyId: number
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface IDVAAccountRepository {
  create(data: Omit<DVAAccount, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<DVAAccount>
  findByUserPropertyId(userPropertyId: number): Promise<DVAAccount | null>
  findByAccountNumber(accountNumber: string): Promise<DVAAccount | null>
}

export const SAVED_LANDLORD_REPOSITORY = Symbol('SAVED_LANDLORD_REPOSITORY')
export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY')
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')
export const PAYMENT_REQUEST_REPOSITORY = Symbol('PAYMENT_REQUEST_REPOSITORY')
export const SUBACCOUNT_REPOSITORY = Symbol('SUBACCOUNT_REPOSITORY')
export const WEBHOOK_REPOSITORY = Symbol('WEBHOOK_REPOSITORY')
export const OVERPAYMENT_REPOSITORY = Symbol('OVERPAYMENT_REPOSITORY')
export const PAYMENT_LINE_ITEM_REPOSITORY = Symbol('PAYMENT_LINE_ITEM_REPOSITORY')
export const DVA_ACCOUNT_REPOSITORY = Symbol('DVA_ACCOUNT_REPOSITORY')
