import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  ReceiptService,
  ReceiptPdfData,
} from '@shared/infrastructure/common/receipt/receipt.service'
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
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { TransactionCompletedEvent } from '@application/events/definition/transaction-completed.event'

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
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
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

      if (isVerified) {
        this.eventBus.publish(
          new TransactionCompletedEvent(
            result.id,
            result.tenantId,
            result.type,
            result.amount,
            result.reference,
            result.status,
            result.createdAt,
          ),
        )
      }

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
  constructor(private readonly receiptService: ReceiptService) {}

  async execute(data: ReceiptPdfData): Promise<string> {
    // Ensure paidAt is a Date object (if stringified by JSON transport)
    if (data.paidAt && typeof data.paidAt === 'string') {
      data.paidAt = new Date(data.paidAt)
    }

    const buffer = await this.receiptService.generateReceiptPdf(data)

    // Simply convert to base64 and return as data URI
    const base64 = buffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
  }
}
