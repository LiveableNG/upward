import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common'
import {
  TRANSACTION_REPOSITORY,
  ITransactionRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetUserTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    const paymentTxs = await this.txRepo.findByUserId(user.id!)

    let savingsTxs: any[] = []
    if (this.prisma?.upward_rent_vault_transaction) {
      const vaultTxs = await this.prisma.upward_rent_vault_transaction.findMany({
        where: { userId: user.id! },
        orderBy: { createdAt: 'desc' },
      })

      savingsTxs = vaultTxs
        .filter((vt) => Number(vt.amountKobo || 0n) > 0)
        .map((vt) => {
          const isDebit = [
            'SETTLEMENT_DISBURSEMENT',
            'BREAKOUT_PAYOUT',
            'LIQUIDATION_PENALTY',
            'PENALTY_DEDUCTION',
          ].includes(vt.type)

          const narrationMap: Record<string, string> = {
            DEPOSIT: 'Rent Savings Deposit',
            YIELD_ACCRUAL: 'Daily Savings Interest',
            CASHBACK: 'Rent Savings Cashback',
            SETTLEMENT_DISBURSEMENT: vt.narration || 'Rent Paid from Savings',
            BREAKOUT_PAYOUT: vt.narration || 'Rent Savings Withdrawal',
          }

          const transactionTypeMap: Record<string, string> = {
            DEPOSIT: 'SAVINGS_DEPOSIT',
            YIELD_ACCRUAL: 'SAVINGS_YIELD',
            CASHBACK: 'SAVINGS_CASHBACK',
            SETTLEMENT_DISBURSEMENT: 'SAVINGS_SETTLEMENT',
            BREAKOUT_PAYOUT: 'SAVINGS_WITHDRAWAL',
          }

          return {
            id: `vault_${vt.id}`,
            uuid: vt.uuid,
            amount: Number(vt.amountKobo) / 100,
            currency: 'NGN',
            status: 'SUCCESS',
            channel: 'Rent Savings',
            direction: isDebit ? 'debit' : 'credit',
            type: vt.type,
            transactionType: transactionTypeMap[vt.type] || 'SAVINGS',
            source: 'RENT_SAVINGS',
            reference: vt.reference,
            narration: narrationMap[vt.type] || vt.narration || 'Rent Savings Activity',
            createdAt: vt.createdAt,
            isManual: false,
            lineItems: [],
          }
        })
    }

    const combined = [
      ...paymentTxs.map((t: any) => ({
        ...t,
        direction: 'debit',
        channel: t.channel || (t.isManual ? 'Manual Transfer' : 'Paystack'),
        source: 'PAYMENT',
      })),
      ...savingsTxs,
    ].sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )

    return combined
  }
}
