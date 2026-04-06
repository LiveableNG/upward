import { randomUUID } from 'crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  IPaymentGateway,
  WALLET_REPOSITORY,
  IWalletRepository,
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
  SavingsGoal,
} from '@domains/payments/payment.repository'
import { TENANT_REPOSITORY } from '@domains/users/tenant.repository'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { TransactionCompletedEvent } from '@application/events/definition/transaction-completed.event'

@Injectable()
export class InitializeWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: IWalletRepository,
    @Inject(TENANT_REPOSITORY)
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly tenantRepo: any,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute(tenantId: string) {
    const existing = await this.walletRepo.findByTenantId(tenantId)
    if (existing?.accountNumber) return existing

    const tenant = await this.tenantRepo.findById(tenantId)
    if (!tenant) throw new Error('Tenant not found')

    const wallet = existing || (await this.walletRepo.create(tenantId))

    try {
      // Create DVA via Gateway
      const dva = await this.gateway.createVirtualAccount({
        email: tenant.email,
        fullName: tenant.fullName,
        phone: tenant.phone,
      })

      return this.walletRepo.update(wallet.id, {
        accountNumber: dva.accountNumber,
        bankName: dva.bankName,
        accountName: dva.accountName || `UPWARD / ${tenant.fullName.toUpperCase()}`,
        bankCode: dva.bankCode,
      })
    } catch (error) {
      // Return wallet even if DVA fails so the user can still use the app
      console.error('DVA creation failed:', error)
      return wallet
    }
  }
}

@Injectable()
export class FundWalletUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(TENANT_REPOSITORY)
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly tenantRepo: any,
  ) {}

  async execute(tenantId: string, amount: number) {
    const tenant = await this.tenantRepo.findById(tenantId)
    if (!tenant) throw new Error('Tenant not found')

    const reference = `WAL-${randomUUID()}`

    return this.gateway.initializeTransaction({
      email: tenant.email,
      amount,
      reference,
      metadata: {
        tenantId,
        type: 'WALLET_DEPOSIT',
      },
    })
  }
}

@Injectable()
export class CreateSavingsGoalUseCase {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY)
    private readonly goalRepo: ISavingsGoalRepository,
  ) {}

  async execute(data: {
    tenantId: string
    name: string
    targetAmount: number
    startDate: Date
    endDate?: Date
    reminderEnabled?: boolean
    reminderFrequency?: string
    reminderDay?: number
    autoSaveEnabled?: boolean
    autoSaveAmount?: number
  }) {
    return this.goalRepo.create({
      ...data,
      reminderEnabled: data.reminderEnabled || false,
      autoSaveEnabled: data.autoSaveEnabled || false,
      status: 'ACTIVE',
    })
  }
}

@Injectable()
export class UpdateSavingsGoalUseCase {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY)
    private readonly goalRepo: ISavingsGoalRepository,
  ) {}

  async execute(id: string, data: Partial<SavingsGoal>) {
    return this.goalRepo.update(id, data)
  }
}

@Injectable()
export class GetSavingsGoalsUseCase {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY)
    private readonly goalRepo: ISavingsGoalRepository,
  ) {}

  async execute(tenantId: string) {
    return this.goalRepo.findByTenantId(tenantId)
  }
}

@Injectable()
export class GetWalletDetailsUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
  ) {}

  async execute(tenantId: string) {
    const wallet = await this.walletRepo.findByTenantId(tenantId)
    const transactions = await this.txRepo.findByTenantId(tenantId)

    return {
      wallet,
      transactions: transactions.filter(
        (t) => t.walletId === wallet?.id || t.type === 'WALLET_DEPOSIT',
      ),
    }
  }
}

@Injectable()
export class ProcessWalletWebhookUseCase {
  private readonly logger = new Logger(ProcessWalletWebhookUseCase.name)

  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: IWalletRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(SAVINGS_GOAL_REPOSITORY)
    private readonly goalRepo: ISavingsGoalRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(payload: any) {
    const { event, data } = payload

    if (event === 'charge.success') {
      const reference = data.reference
      const amount = data.amount / 100 // convert kobo to naira
      const tenantId = data.metadata?.tenantId
      const type = data.metadata?.type || 'WALLET_DEPOSIT'
      const goalId = data.metadata?.goalId

      if (!tenantId) {
        this.logger.error(`No tenantId found in metadata for reference ${reference}`)
        return
      }

      // 1. Idempotency check
      const existingTx = await this.txRepo.findByReference(reference)
      if (existingTx && existingTx.status === 'SUCCESS') return

      // 2. Get or Initialize Wallet
      let wallet = await this.walletRepo.findByTenantId(tenantId)
      if (!wallet) {
        wallet = await this.walletRepo.create(tenantId)
      }

      // 3. Record Transaction
      const tx = await this.txRepo.create({
        tenantId,
        amount,
        reference,
        type,
        status: 'SUCCESS',
        walletId: wallet.id,
        goalId,
        narration: `Wallet funding via ${data.channel}`,
      })

      // 4. Update Wallet Balance
      await this.walletRepo.incrementBalance(wallet.id, amount)

      // 5. Update Goal Progress if applicable
      if (goalId) {
        await this.goalRepo.updateProgress(goalId, amount)
      }

      // 6. Publish Event
      this.eventBus.publish(
        new TransactionCompletedEvent(
          tx.id,
          tenantId,
          type,
          amount,
          reference,
          'SUCCESS',
          new Date(),
        ),
      )
    }
  }
}
