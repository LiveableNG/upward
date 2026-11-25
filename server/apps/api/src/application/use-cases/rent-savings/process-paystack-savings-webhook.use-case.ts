import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

export interface PaystackWebhookPayload {
  event: string
  data: {
    reference: string
    amount: number // in kobo
    currency: string
    channel?: string
    status?: string
    customer?: {
      customer_code?: string
      email?: string
    }
    metadata?: {
      vault_id?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

@Injectable()
export class ProcessPaystackSavingsWebhookUseCase {
  private readonly logger = new Logger(ProcessPaystackSavingsWebhookUseCase.name)
  private readonly secretKey: string

  constructor(
    private readonly configService: ConfigService,
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    private readonly providerRegistry: AssetManagementProviderRegistry,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || ''
  }

  public verifySignature(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
    if (!this.secretKey) {
      if (isProductionRuntime(this.secretKey)) {
        this.logger.error('PAYSTACK_SECRET_KEY missing in production; rejecting webhook signature')
        return false
      }
      this.logger.warn(
        'PAYSTACK_SECRET_KEY not set; skipping signature verification in development',
      )
      return true
    }
    if (!signatureHeader) {
      return false
    }
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      .digest('hex')
    return hash === signatureHeader
  }

  async execute(
    payload: PaystackWebhookPayload,
    signatureHeader?: string,
    rawBody?: string | Buffer,
  ) {
    const isProd = isProductionRuntime(this.secretKey)
    if (isProd) {
      if (!this.secretKey) {
        this.logger.error('PAYSTACK_SECRET_KEY missing in production; rejecting savings webhook')
        throw new UnauthorizedException('Webhook secret is not configured')
      }
      if (!signatureHeader || !rawBody || !this.verifySignature(rawBody, signatureHeader)) {
        this.logger.error('Missing or invalid Paystack savings webhook signature in production')
        throw new UnauthorizedException('Invalid webhook signature')
      }
    } else if (rawBody && signatureHeader && !this.verifySignature(rawBody, signatureHeader)) {
      this.logger.error('Invalid Paystack webhook signature')
      throw new BadRequestException('Invalid webhook signature')
    }

    if (payload.event !== 'charge.success') {
      this.logger.log(`Ignoring unsupported Paystack event: ${payload.event}`)
      return { status: 'ignored', message: `Unhandled event: ${payload.event}` }
    }

    const { reference, amount, channel, metadata } = payload.data
    const amountKobo = BigInt(Math.round(amount || 0))

    if (amountKobo <= 0n) {
      return { status: 'ignored', message: 'Amount is zero or negative' }
    }

    const existingTx = await this.rentVaultRepo.findTransactionByReference(reference)
    if (existingTx) {
      this.logger.warn(`Duplicate webhook reference ignored: ${reference}`)
      return { status: 'already_processed', reference }
    }

    let vault = null
    if (metadata?.vault_id) {
      vault = await this.rentVaultRepo.findByUuid(String(metadata.vault_id))
    }

    if (!vault && payload.data.dedicated_account) {
      const dvaAcc = (payload.data.dedicated_account as any)?.account_number
      if (dvaAcc) {
        vault = await this.rentVaultRepo.findByDvaAccountNumber(dvaAcc)
      }
    }

    if (!vault) {
      this.logger.warn(
        `Could not correlate Paystack webhook reference ${reference} to an active rent vault`,
      )
      return { status: 'vault_not_found', reference }
    }

    const currentBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo
    const newBalance = currentBalance + amountKobo

    let armPurchaseId: string | undefined
    let armTransactionId: string | undefined

    if (vault.investmentProvider) {
      try {
        const provider = this.providerRegistry.getProvider(vault.investmentProvider)
        const purchaseRes = await provider.subscribe({
          membershipId: vault.providerMembershipId || 'OMNIBUS_MASTER',
          productCode: 'ARMMMF',
          amountKobo,
          reference: `ARM_${reference}`,
        })
        armPurchaseId = purchaseRes.purchaseId
        armTransactionId = purchaseRes.transactionId
        if (armPurchaseId) {
          await this.rentVaultRepo.update(vault.id, {
            armPurchaseId,
          })
          this.logger.log(
            `Successfully submitted purchase to ARM for vault ${vault.uuid}. PurchaseId: ${armPurchaseId}`,
          )
        }
      } catch (armErr: any) {
        this.logger.warn(
          `Instant ARM subscription queued/pending for vault ${vault.uuid} (will be captured in omnibus sweep): ${armErr?.message}`,
        )
      }
    }

    await this.rentVaultRepo.createTransaction({
      vaultId: vault.id,
      userId: vault.userId,
      type: 'DEPOSIT',
      amountKobo,
      principalDeltaKobo: amountKobo,
      yieldDeltaKobo: 0n,
      balanceAfterKobo: newBalance,
      reference,
      channel: channel || 'DVA_NIP',
      narration: `Rent savings deposit via ${channel || 'Paystack DVA'}`,
      metadata: {
        customer: payload.data.customer,
        receivedAt: new Date().toISOString(),
        ...(armPurchaseId ? { armPurchaseId } : {}),
        ...(armTransactionId ? { armTransactionId } : {}),
      },
    })

    await this.rentVaultRepo.incrementBalances(vault.id, amountKobo, 0n)
    this.logger.log(
      `Successfully credited vault ${vault.uuid} with ₦${Number(amountKobo) / 100} (ref: ${reference})`,
    )

    await this.updateSavingsScoreOnDeposit(
      vault.id,
      vault.userId,
      vault.targetAmountKobo,
      newBalance,
    )

    return {
      status: 'success',
      vault_id: vault.uuid,
      amount_kobo: Number(amountKobo),
      reference,
    }
  }

  private async updateSavingsScoreOnDeposit(
    vaultId: number,
    userId: number,
    targetAmountKobo: bigint,
    newBalanceKobo: bigint,
  ) {
    try {
      const currentScore = await this.rentVaultRepo.findSavingsScoreByVaultId(vaultId)
      const targetNum = Number(targetAmountKobo)
      const balanceNum = Number(newBalanceKobo)
      const ratio = targetNum > 0 ? balanceNum / targetNum : 0

      const goalPoints = Math.min(50, Math.round(ratio * 50))
      const currentCadence = currentScore?.cadencePoints ?? 0
      const newCadence = Math.min(50, currentCadence + 10)
      const totalScore = Math.min(100, newCadence + goalPoints)

      await this.rentVaultRepo.upsertSavingsScore(vaultId, userId, {
        cadencePoints: newCadence,
        velocityPoints: goalPoints,
        loanDisciplinePoints: 0,
        totalScore,
        historyLog: [
          ...(currentScore?.historyLog || []),
          {
            reason: `Deposit milestone reached (${Math.round(ratio * 100)}%)`,
            delta: totalScore - (currentScore?.totalScore || 20),
            timestamp: new Date().toISOString(),
          },
        ],
      })
    } catch (err) {
      this.logger.error(`Error updating savings score for vault ${vaultId}`, err)
    }
  }
}
