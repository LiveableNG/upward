import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import { ProcessPaystackSavingsWebhookUseCase } from './process-paystack-savings-webhook.use-case'

@Injectable()
export class VerifyRentVaultFundingUseCase {
  private readonly logger = new Logger(VerifyRentVaultFundingUseCase.name)
  private readonly baseUrl = 'https://api.paystack.co'

  constructor(
    private readonly configService: ConfigService,
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    private readonly processSavingsWebhook: ProcessPaystackSavingsWebhookUseCase,
  ) {}

  async execute(userId: number) {
    const vault = await this.rentVaultRepo.findActiveByUserId(userId)
    if (!vault) {
      throw new NotFoundException('No active rent vault found.')
    }

    let newlyReconciled = 0
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || ''

    // Actively reconcile against Paystack API in case webhook delivery was delayed or unreachable
    if (secretKey && (vault.dvaCustomerCode || vault.dvaAccountNumber)) {
      try {
        const headers = {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        }

        let numericCustomerId: number | null = null
        if (vault.dvaCustomerCode) {
          const custRes = await fetch(
            `${this.baseUrl}/customer/${encodeURIComponent(vault.dvaCustomerCode)}`,
            { method: 'GET', headers },
          )
          if (custRes.ok) {
            const custJson = await custRes.json()
            if (custJson?.status && custJson?.data?.id) {
              numericCustomerId = Number(custJson.data.id)
            }
          }
        }

        const queryParams = new URLSearchParams({
          status: 'success',
          perPage: '15',
        })
        if (numericCustomerId) {
          queryParams.set('customer', String(numericCustomerId))
        }

        const txRes = await fetch(`${this.baseUrl}/transaction?${queryParams.toString()}`, {
          method: 'GET',
          headers,
        })

        if (txRes.ok) {
          const txJson = await txRes.json()
          const txs: any[] = Array.isArray(txJson?.data) ? txJson.data : []

          for (const tx of txs) {
            if (!tx?.reference || !tx?.amount) continue

            const txAccNum =
              tx.dedicated_account?.account_number ||
              tx.authorization?.receiver_bank_account_number ||
              tx.metadata?.receiver_account_number
            const isDvaChannel =
              tx.channel === 'dedicated_nuban' || tx.channel === 'dedicated_account'
            const matchesAccount =
              vault.dvaAccountNumber && String(txAccNum || '') === String(vault.dvaAccountNumber)
            const matchesCustomer =
              numericCustomerId &&
              isDvaChannel &&
              (tx.customer?.id === numericCustomerId ||
                tx.customer?.customer_code === vault.dvaCustomerCode)

            if (!matchesAccount && !matchesCustomer) continue

            const existing = await this.rentVaultRepo.findTransactionByReference(
              String(tx.reference),
            )
            if (existing) continue

            const webhookRes = await this.processSavingsWebhook.execute({
              event: 'charge.success',
              data: {
                ...tx,
                dedicated_account: {
                  account_number: vault.dvaAccountNumber || txAccNum,
                },
                metadata: {
                  ...(typeof tx.metadata === 'object' && tx.metadata ? tx.metadata : {}),
                  vault_id: vault.uuid,
                },
              },
            })

            if (webhookRes.status === 'success') {
              newlyReconciled += 1
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Paystack live DVA reconciliation check skipped for vault ${vault.uuid}: ${err?.message}`,
        )
      }
    }

    const updatedVault =
      newlyReconciled > 0 ? (await this.rentVaultRepo.findActiveByUserId(userId)) || vault : vault
    const recentTxs = await this.rentVaultRepo.findTransactionsByVaultId(updatedVault.id, 5)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentDeposit = recentTxs.find(
      (t) => t.type === 'DEPOSIT' && new Date(t.createdAt).getTime() >= fiveMinutesAgo,
    )

    const currentBalanceKobo = Number(
      updatedVault.currentPrincipalKobo + updatedVault.accruedYieldKobo,
    )

    return {
      status: 'success',
      data: {
        detected: newlyReconciled > 0 || Boolean(recentDeposit),
        newly_reconciled: newlyReconciled,
        current_balance_kobo: currentBalanceKobo,
      },
    }
  }
}
