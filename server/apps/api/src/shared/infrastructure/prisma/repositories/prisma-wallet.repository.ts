import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  IWalletRepository,
  ISavingsGoalRepository,
  Wallet,
  SavingsGoal,
} from '@domains/payments/payment.repository'

@Injectable()
export class PrismaWalletRepository implements IWalletRepository {
  constructor(private prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<Wallet | null> {
    const res = await this.prisma.upward_wallet.findUnique({
      where: { tenantId },
    })
    return res as Wallet | null
  }

  async create(tenantId: string): Promise<Wallet> {
    const res = await this.prisma.upward_wallet.create({
      data: { tenantId },
    })
    return res as Wallet
  }

  async incrementBalance(id: string, amount: number): Promise<Wallet> {
    const res = await this.prisma.upward_wallet.update({
      where: { id },
      data: { balance: { increment: amount } },
    })
    return res as Wallet
  }

  async decrementBalance(id: string, amount: number): Promise<Wallet> {
    const res = await this.prisma.upward_wallet.update({
      where: { id },
      data: { balance: { decrement: amount } },
    })
    return res as Wallet
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: string, data: any): Promise<Wallet> {
    const res = await this.prisma.upward_wallet.update({
      where: { id },
      data,
    })
    return res as Wallet
  }
}

@Injectable()
export class PrismaSavingsGoalRepository implements ISavingsGoalRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'currentAmount'>,
  ): Promise<SavingsGoal> {
    const res = await this.prisma.upward_savings_goal.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        targetAmount: data.targetAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        reminderEnabled: data.reminderEnabled,
        reminderFrequency: data.reminderFrequency,
        reminderDay: data.reminderDay,
        autoSaveEnabled: data.autoSaveEnabled,
        autoSaveAmount: data.autoSaveAmount,
      },
    })
    return res as unknown as SavingsGoal
  }

  async findByTenantId(tenantId: string): Promise<SavingsGoal[]> {
    const res = await this.prisma.upward_savings_goal.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return res as unknown as SavingsGoal[]
  }

  async findById(id: string): Promise<SavingsGoal | null> {
    const res = await this.prisma.upward_savings_goal.findUnique({
      where: { id },
    })
    return res as unknown as SavingsGoal | null
  }

  async updateProgress(id: string, amount: number): Promise<SavingsGoal> {
    const res = await this.prisma.upward_savings_goal.update({
      where: { id },
      data: { currentAmount: { increment: amount } },
    })
    return res as unknown as SavingsGoal
  }

  async update(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const res = await this.prisma.upward_savings_goal.update({
      where: { id },
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        status: data.status,
        endDate: data.endDate,
        reminderEnabled: data.reminderEnabled,
        reminderFrequency: data.reminderFrequency,
        reminderDay: data.reminderDay,
        autoSaveEnabled: data.autoSaveEnabled,
        autoSaveAmount: data.autoSaveAmount,
      },
    })
    return res as unknown as SavingsGoal
  }
}
