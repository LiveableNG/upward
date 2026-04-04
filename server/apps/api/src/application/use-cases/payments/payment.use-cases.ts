import { Inject, Injectable } from '@nestjs/common'
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
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    // For extra security, we can verify the transaction on the server side
    const isVerified = await this.gateway.verifyTransaction(data.reference)
    const txData = {
      ...data,
      status: isVerified ? 'SUCCESS' : 'FAILED',
    }
    return this.txRepo.create(txData)
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
    // Replace with proper JWT decoding logic later.
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
