import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

const SAVINGS_CONFIG_KEY = 'DEFAULT'
const PREFUND_AMOUNT = 1000

@Injectable()
export class GetWalletUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userUuid: string) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')
    const profile = await this.prisma.upward_user.findUnique({ where: { id: user.id! } })
    if (!profile?.savingsWalletEnabled) {
      throw new BadRequestException('Savings wallet is not enabled for this account')
    }

    const wallet = await this.prisma.upward_wallet.findUnique({
      where: { userId: user.id! },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!wallet) {
      return {
        balance: 0,
        currency: 'NGN',
        transactions: [],
      }
    }

    return {
      ...wallet,
      availableBalance: wallet.balance,
    }
  }
}

@Injectable()
export class CreditWalletUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    userId: number
    amount: number
    reference?: string
    type: 'PREFUND' | 'WALLET_DEPOSIT' | 'INTEREST'
    narration: string
    metadata?: Record<string, unknown>
  }) {
    if (data.amount <= 0) return null

    return this.prisma.$transaction(async (tx) => {
      if (data.reference) {
        const exists = await tx.upward_wallet_transaction.findUnique({
          where: { reference: data.reference },
        })
        if (exists) return exists
      }

      const wallet = await tx.upward_wallet.upsert({
        where: { userId: data.userId },
        create: {
          userId: data.userId,
          balance: 0,
        },
        update: {},
      })

      await tx.upward_wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: data.amount } },
      })

      return tx.upward_wallet_transaction.create({
        data: {
          walletId: wallet.id,
          userId: data.userId,
          type: data.type,
          status: 'SUCCESS',
          amount: data.amount,
          reference: data.reference,
          narration: data.narration,
          metadata: (data.metadata || {}) as any,
        },
      })
    })
  }
}

@Injectable()
export class FundWalletUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly prisma: PrismaService,
  ) {}

  async execute(data: { userUuid: string; amount: number }) {
    if (!Number.isFinite(data.amount) || data.amount < 100) {
      throw new BadRequestException('Minimum wallet deposit is 100 NGN')
    }

    const user = await this.userRepository.findByUuid(data.userUuid)
    if (!user) throw new UnauthorizedException('User not found')
    const profile = await this.prisma.upward_user.findUnique({ where: { id: user.id! } })
    if (!profile?.savingsWalletEnabled) {
      throw new BadRequestException('Savings wallet is not enabled for this account')
    }
    if (!user.email) throw new BadRequestException('User email is required to initialize payment')

    const fee = 0

    const metadata = {
      source_app: 'upward',
      type: 'WALLET_DEPOSIT',
      paymentKind: 'WALLET_DEPOSIT',
      userId: user.id,
      userUuid: user.uuid,
      forcePaystack: true,
      description: 'Savings wallet deposit',
    }

    const reference = `WLT-${randomUUID()}`
    const init = await this.paymentGateway.initializeTransaction({
      email: user.email,
      amount: data.amount + fee,
      reference,
      metadata,
      channels: ['card', 'bank', 'bank_transfer'],
    })

    return {
      ...init,
      amount: data.amount,
      fee,
      reference,
    }
  }
}

@Injectable()
export class GetSavingsGoalsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userUuid: string) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')
    return this.prisma.upward_savings_goal.findMany({
      where: { userId: user.id! },
      orderBy: { createdAt: 'asc' },
    })
  }
}

@Injectable()
export class CreateSavingsGoalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userUuid: string, body: any) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')

    return this.prisma.upward_savings_goal.create({
      data: {
        userId: user.id!,
        name: body.name,
        category: body.category || body.type,
        targetAmount: Number(body.targetAmount || 0),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        reminderEnabled: body.reminderEnabled !== false,
        reminderFrequency: body.reminderFrequency || 'MONTHLY',
        reminderDay: body.reminderDay || 27,
        autoSaveEnabled: !!body.autoSaveEnabled,
      },
    })
  }
}

@Injectable()
export class UpdateSavingsGoalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userUuid: string, goalUuid: string, body: any) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')

    const goal = await this.prisma.upward_savings_goal.findUnique({ where: { uuid: goalUuid } })
    if (!goal || goal.userId !== user.id) throw new NotFoundException('Savings goal not found')

    return this.prisma.upward_savings_goal.update({
      where: { uuid: goalUuid },
      data: {
        name: body.name ?? goal.name,
        category: body.category ?? body.type ?? goal.category,
        targetAmount: body.targetAmount ?? goal.targetAmount,
        startDate: body.startDate ? new Date(body.startDate) : goal.startDate,
        endDate: body.endDate ? new Date(body.endDate) : goal.endDate,
        reminderEnabled: body.reminderEnabled ?? goal.reminderEnabled,
        reminderFrequency: body.reminderFrequency ?? goal.reminderFrequency,
        reminderDay: body.reminderDay ?? goal.reminderDay,
        autoSaveEnabled: body.autoSaveEnabled ?? goal.autoSaveEnabled,
      },
    })
  }
}

@Injectable()
export class EnableSavingsWalletForUserUseCase {
  constructor(private readonly prisma: PrismaService, private readonly creditWallet: CreditWalletUseCase) {}

  async execute(userUuid: string, enabled: boolean) {
    const user = await this.prisma.upward_user.findUnique({ where: { uuid: userUuid } })
    if (!user) throw new NotFoundException('User not found')

    await this.prisma.upward_user.update({
      where: { uuid: userUuid },
      data: { savingsWalletEnabled: enabled },
    })

    if (enabled) {
      await this.prisma.upward_wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: { isActive: true },
      })

      const alreadyPrefunded = await this.prisma.upward_wallet_transaction.findFirst({
        where: { userId: user.id, type: 'PREFUND' },
      })
      if (!alreadyPrefunded) {
        await this.creditWallet.execute({
          userId: user.id,
          amount: PREFUND_AMOUNT,
          type: 'PREFUND',
          narration: 'Welcome prefund',
          reference: `PREFUND-${user.uuid}`,
          metadata: { source: 'ADMIN_ENABLE' },
        })
      }
    }

    return { success: true }
  }
}

@Injectable()
export class SetDailySavingsInterestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rate: number, adminId?: string) {
    if (!Number.isFinite(rate) || rate < 0) {
      throw new BadRequestException('Daily interest rate must be a positive number')
    }
    return this.prisma.upward_savings_config.upsert({
      where: { key: SAVINGS_CONFIG_KEY },
      create: { key: SAVINGS_CONFIG_KEY, dailyInterestRate: rate, updatedByAdminId: adminId },
      update: { dailyInterestRate: rate, updatedByAdminId: adminId },
    })
  }
}

@Injectable()
export class ApplyDailySavingsInterestUseCase {
  constructor(private readonly prisma: PrismaService, private readonly creditWallet: CreditWalletUseCase) {}

  async execute() {
    const config = await this.prisma.upward_savings_config.findUnique({
      where: { key: SAVINGS_CONFIG_KEY },
    })
    const rate = config?.dailyInterestRate || 0
    if (rate <= 0) return { processed: 0, rate }

    const wallets = await this.prisma.upward_wallet.findMany({
      where: {
        isActive: true,
        user: { savingsWalletEnabled: true },
      },
      include: { user: true },
    })

    let processed = 0
    for (const wallet of wallets) {
      const interest = Number((wallet.balance * rate).toFixed(2))
      if (interest <= 0) continue
      await this.creditWallet.execute({
        userId: wallet.userId,
        amount: interest,
        type: 'INTEREST',
        narration: 'Daily savings interest',
        reference: `INT-${wallet.userId}-${new Date().toISOString().slice(0, 10)}`,
        metadata: { rate },
      })
      processed += 1
    }

    return { processed, rate }
  }
}
