import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Service } from '@shared/infrastructure/common/s3/s3.service'
import { ReceiptService } from '@shared/infrastructure/common/receipt/receipt.service'
import {
  ISavedLandlordRepository,
  ITransactionRepository,
  SAVED_LANDLORD_REPOSITORY,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  IPaymentGateway,
  SavedLandlord,
  Transaction,
} from '@domains/payments/payment.repository'
import { TENANT_REPOSITORY } from '@domains/users/tenant.repository'

@Injectable()
export class SaveLandlordUseCase {
  constructor(
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
  ) {}

  async execute(data: Omit<SavedLandlord, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.landlordRepo.create(data)
  }
}

@Injectable()
export class GetSavedLandlordsUseCase {
  constructor(
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
  ) {}

  async execute(tenantId: string) {
    return this.landlordRepo.findByTenantId(tenantId)
  }
}

@Injectable()
export class RecordTransactionUseCase {
  private readonly logger = new Logger(RecordTransactionUseCase.name)

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      this.logger.log(`Recording transaction for reference: ${data.reference}`)

      // Idempotency check
      const existing = await this.txRepo.findByReference(data.reference)
      if (existing) {
        this.logger.warn(
          `Transaction with reference ${data.reference} already exists. Returning existing record.`,
        )
        return existing
      }

      // Verification
      let isVerified = false
      try {
        isVerified = await this.gateway.verifyTransaction(data.reference)
      } catch (e) {
        this.logger.error(`Gateway verification failed for ${data.reference}:`, e)
      }

      const txData = {
        ...data,
        status: isVerified ? 'SUCCESS' : 'FAILED',
      }

      const result = await this.txRepo.create(txData)
      this.logger.log(`Transaction recorded successfully with ID: ${result.id}`)
      return result
    } catch (error) {
      this.logger.error(`Failed to record transaction ${data.reference}:`, error)
      throw error
    }
  }
}

@Injectable()
export class GetBanksUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute() {
    return this.gateway.getBanks()
  }
}

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
  ) {}

  async execute(id: string) {
    return this.txRepo.findById(id)
  }
}

@Injectable()
export class GetTenantTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
  ) {}

  async execute(tenantId: string) {
    return this.txRepo.findByTenantId(tenantId)
  }
}

@Injectable()
export class VerifyAccountUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute(accountNumber: string, bankCode: string) {
    return this.gateway.verifyAccountNumber(accountNumber, bankCode)
  }
}

@Injectable()
export class ProcessGuestPaymentTokenUseCase {
  async execute(_token: string) {
    // MOCK DECODER logic here as per user request.
    return {
      companyName: 'Livable Properties',
      companyAddress: '12-14 Kingsway Road, Ikoyi, Lagos',
      role: 'Property Manager',
      totalAmount: 450000,
      tenantFirstName: 'Guest',
      tenantLastName: 'User',
      tenantEmail: 'guest@example.com',
      companyBankName: 'Guaranty Trust Bank',
      companyBankCode: '058',
      companyAccountNumber: '0123456789',
      invoiceNumber: 'INV-REQ',
      lineItems: [
        { label: 'Annual Rent', amount: 400000 },
        { label: 'Service Charge', amount: 50000 },
      ],
    }
  }
}

@Injectable()
export class GenerateReceiptPdfUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(TENANT_REPOSITORY)
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly tenantRepo: any,
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
    private readonly s3Service: S3Service,
    private readonly receiptService: ReceiptService,
    private readonly configService: ConfigService,
  ) {}

  async execute(txId: string): Promise<string> {
    const tx = await this.txRepo.findById(txId)
    if (!tx) throw new Error('Transaction not found')

    const tenant = await this.tenantRepo.findById(tx.tenantId)
    const landlord = tx.landlordId ? await this.landlordRepo.findById(tx.landlordId) : null

    const receiptData = {
      title: tx.type === 'RENT' ? 'Rent Payment Receipt' : 'Savings Deposit Receipt',
      receiptNumber: tx.receiptNumber || `RCP-${tx.reference.slice(-5).toUpperCase()}`,
      paidAt: tx.createdAt,
      tenantName: tenant?.fullName || 'Tenant',
      landlordName: landlord?.name,
      propertyName: tx.type === 'RENT' ? 'Property Unit' : 'Upward Savings',
      propertyAddress: tx.narration,
      amount: tx.amount,
      currency: 'NGN',
      reference: tx.reference,
      channel: 'Paystack',
      type: tx.type,
      lineItems: tx.lineItems,
    }

    const buffer = await this.receiptService.generateReceiptPdf(receiptData)

    const storageProvider = this.configService.get('STORAGE_PROVIDER') || 'DATABASE'
    let receiptUrl: string

    if (storageProvider === 'S3') {
      const key = `upward-receipts/${tx.id}.pdf`
      receiptUrl = await this.s3Service.uploadBuffer(buffer, key, 'application/pdf')
      receiptUrl = await this.s3Service.getDownloadUrl(receiptUrl)
    } else {
      const base64 = buffer.toString('base64')
      receiptUrl = `data:application/pdf;base64,${base64}`
    }

    await this.txRepo.update(txId, { receiptUrl, receiptNumber: receiptData.receiptNumber })

    return receiptUrl
  }
}
