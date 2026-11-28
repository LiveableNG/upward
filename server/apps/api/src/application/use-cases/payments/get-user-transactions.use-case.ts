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
        .filter(
          (vt) =>
            Number(vt.amountKobo || 0n) > 0 &&
            !(vt.type === 'CASHBACK' && String(vt.reference || '').startsWith('CASHBACK_ROLLOVER_')),
        )
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
            LIQUIDATION_PENALTY: vt.narration || 'Early Savings Withdrawal',
          }

          const transactionTypeMap: Record<string, string> = {
            DEPOSIT: 'SAVINGS_DEPOSIT',
            YIELD_ACCRUAL: 'SAVINGS_YIELD',
            CASHBACK: 'SAVINGS_CASHBACK',
            SETTLEMENT_DISBURSEMENT: 'SAVINGS_SETTLEMENT',
            BREAKOUT_PAYOUT: 'SAVINGS_WITHDRAWAL',
            LIQUIDATION_PENALTY: 'SAVINGS_WITHDRAWAL',
          }

          const meta = (vt.metadata as Record<string, any> | null) || {}

          return {
            id: `vault_${vt.id}`,
            uuid: vt.uuid,
            amount: Number(vt.amountKobo) / 100,
            currency: 'NGN',
            status: meta.payoutStatus === 'PROCESSING_REDEMPTION' ? 'PROCESSING' : 'SUCCESS',
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

    let walletTxs: any[] = []
    if (this.prisma?.upward_wallet_transaction) {
      const rawWalletTxs = await this.prisma.upward_wallet_transaction.findMany({
        where: { userId: user.id! },
        orderBy: { createdAt: 'desc' },
      })

      // Expose meaningful DVA holding wallet inflows/payouts (surplus, unallocated DVA deposits,
      // ARM fallback holds, payouts) while excluding duplicate cashback & internal sweep entries.
      const visibleWalletTypes = new Set([
        'SETTLEMENT_SURPLUS',
        'UNALLOCATED_DVA_INFLOW',
        'ARM_SUBSCRIPTION_FALLBACK',
        'WALLET_DEPOSIT',
        'PAYOUT_TO_BANK',
      ])

      const vaultRefs = new Set(savingsTxs.map((t) => String(t.reference || '')))

      walletTxs = rawWalletTxs
        .filter((wt) => {
          if (!visibleWalletTypes.has(wt.type) || Math.abs(Number(wt.amount || 0)) <= 0) {
            return false
          }
          // Deduplicate vault withdrawal payout ledger rows that are already represented by a
          // `BREAKOUT_PAYOUT` / `LIQUIDATION_PENALTY` row on `upward_rent_vault_transaction`.
          if (wt.type === 'PAYOUT_TO_BANK') {
            const wtMeta = (wt.metadata as Record<string, unknown> | null) || {}
            const sourceRef = typeof wtMeta.sourceReference === 'string' ? wtMeta.sourceReference : ''
            const strippedRef = String(wt.reference || '').replace(/^PAYOUT_/, '')
            if (
              (sourceRef && vaultRefs.has(sourceRef)) ||
              (strippedRef && vaultRefs.has(strippedRef))
            ) {
              return false
            }
          }
          return true
        })
        .map((wt) => {
          const meta = (wt.metadata as Record<string, unknown> | null) || {}
          const isDebit = wt.type === 'PAYOUT_TO_BANK' || Number(wt.amount) < 0
          const narrationMap: Record<string, string> = {
            SETTLEMENT_SURPLUS: 'Rent Savings Surplus',
            UNALLOCATED_DVA_INFLOW: 'DVA Account Deposit (Held)',
            ARM_SUBSCRIPTION_FALLBACK: 'Rent Savings Deposit (Held on DVA)',
            WALLET_DEPOSIT: 'Upward Account Deposit',
            PAYOUT_TO_BANK: 'Withdrawal to Bank',
          }
          const txTypeMap: Record<string, string> = {
            SETTLEMENT_SURPLUS: 'SAVINGS_SURPLUS',
            UNALLOCATED_DVA_INFLOW: 'DVA_HELD_INFLOW',
            ARM_SUBSCRIPTION_FALLBACK: 'DVA_ARM_FALLBACK',
            WALLET_DEPOSIT: 'DVA_WALLET_DEPOSIT',
            PAYOUT_TO_BANK: 'SAVINGS_WITHDRAWAL',
          }

          return {
            id: `wallet_${wt.id}`,
            uuid: wt.uuid,
            amount: Math.abs(Number(wt.amount)),
            currency: 'NGN',
            status: wt.status || 'SUCCESS',
            channel: 'Upward DVA',
            direction: isDebit ? 'debit' : 'credit',
            type: wt.type,
            transactionType: txTypeMap[wt.type] || 'SAVINGS',
            fundingType: (meta.fundingType as string) || wt.type,
            holdingLocation: (meta.holdingLocation as string) || 'USER_DVA_WALLET',
            routingTarget: (meta.routingTarget as string) || 'HOLD_IN_DVA',
            routingStatus: (meta.routingStatus as string) || 'HELD',
            source: 'RENT_SAVINGS',
            reference: wt.reference || wt.uuid,
            narration: narrationMap[wt.type] || wt.narration || 'Upward Account Activity',
            createdAt: wt.createdAt,
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
      ...walletTxs,
    ].sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )

    return combined
  }
}
