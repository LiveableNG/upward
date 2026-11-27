import { Injectable, Logger, BadRequestException, ForbiddenException, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ProcessPaymentWebhookUseCase } from './process-payment-webhook.use-case'
import { ProcessPaystackSavingsWebhookUseCase } from '../rent-savings/process-paystack-savings-webhook.use-case'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

@Injectable()
export class SimulateTransferUseCase {
  private readonly logger = new Logger(SimulateTransferUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly processWebhook: ProcessPaymentWebhookUseCase,
    @Optional()
    private readonly processSavingsWebhook?: ProcessPaystackSavingsWebhookUseCase,
  ) { }

  async execute(data: {
    beneficiaryBank: string
    beneficiaryAccount: string
    amount: number
    narration?: string
  }) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')
    if (isProductionRuntime(secret)) {
      throw new ForbiddenException('Transfer simulation is disabled in production.')
    }
    const isTestKey = secret?.startsWith('sk_test_') || !secret

    if (!isTestKey) {
      throw new BadRequestException('Simulation is only allowed in Test Mode (using sandbox keys).')
    }

    let dva: any = null
    let matchedVaultId: number | undefined = undefined
    let matchedVaultUuid: string | undefined = undefined

    if (this.prisma?.upward_rent_vault) {
      const rentVault = await this.prisma.upward_rent_vault.findFirst({
        where: {
          dvaAccountNumber: data.beneficiaryAccount,
          lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (rentVault) {
        matchedVaultId = rentVault.id
        matchedVaultUuid = rentVault.uuid
        dva = {
          id: rentVault.id,
          accountNumber: rentVault.dvaAccountNumber,
          accountName: rentVault.dvaAccountName || 'Upward Rent Savings',
          bankName: rentVault.dvaBankName || data.beneficiaryBank,
          bankCode: (rentVault.dvaBankName || data.beneficiaryBank)
            .toLowerCase()
            .replace(/\s+/g, '-'),
          paystackCustomerId: rentVault.dvaCustomerCode || 'CUS_rent_vault_dva',
        }

        // Remove any accidental mock DVA record created before Rent Vault DVA lookup existed
        await this.prisma.upward_dedicated_virtual_account
          .deleteMany({
            where: {
              accountNumber: data.beneficiaryAccount,
              paystackCustomerId: 'CUS_mock_dva_test',
            },
          })
          .catch(() => {})
      }
    }

    if (!dva) {
      dva = await this.prisma.upward_dedicated_virtual_account.findUnique({
        where: { accountNumber: data.beneficiaryAccount },
      })
    }

    if (!dva) {
      const pmDva = await this.prisma.upward_pm_dedicated_virtual_account.findUnique({
        where: { accountNumber: data.beneficiaryAccount }
      })
      if (pmDva) {
        dva = {
          id: pmDva.id,
          accountNumber: pmDva.accountNumber,
          accountName: pmDva.accountName,
          bankName: pmDva.bankName,
          bankCode: pmDva.bankCode,
          paystackCustomerId: 'CUS_mock_dva_test',
        } as any
      }
    }

    if (!dva) {
      this.logger.log(`Mock DVA not found in DB for account: ${data.beneficiaryAccount}. Linking automatically...`)

      const activeProp = await this.prisma.upward_user_property.findFirst({
        where: { isVerified: true, isPastTenancy: false },
        orderBy: { createdAt: 'desc' }
      })

      if (!activeProp) {
        throw new BadRequestException(
          `Dedicated Virtual Account ${data.beneficiaryAccount} does not exist, and no active verified property could be found to link it automatically.`
        )
      }

      dva = await this.prisma.upward_dedicated_virtual_account.create({
        data: {
          accountNumber: data.beneficiaryAccount,
          accountName: 'TEST ACCOUNT',
          bankName: data.beneficiaryBank,
          bankCode: data.beneficiaryBank.toLowerCase().replace(/\s+/g, '-'),
          accountCode: `DVA_${data.beneficiaryAccount}`,
          paystackCustomerId: 'CUS_mock_dva_test',
          userPropertyId: activeProp.id,
        }
      })
    }

    const reference = `TFD_${data.beneficiaryAccount}_${data.amount}_${Date.now()}`
    const amountKobo = Math.round(data.amount * 100)

    // For Rent Savings Vaults in non-prod DemoBank simulations, credit directly through
    // the atomic ledger + Postgres outbox + BullMQ pipeline so public webhooks stay 100% Paystack-verified.
    if (matchedVaultId && this.processSavingsWebhook) {
      this.logger.log(
        `[DEV SIMULATOR] Crediting Rent Vault ${matchedVaultUuid} atomically via DemoBank transfer (ref=${reference})`,
      )
      const result = await this.processSavingsWebhook.creditVaultAndEnqueueArm({
        vaultId: matchedVaultId,
        reference,
        amountKobo: BigInt(amountKobo),
        channel: 'dedicated_nuban',
        narration: data.narration?.trim() || 'Rent savings deposit via simulated bank transfer (dev)',
        source: 'DEV_SIMULATION',
        metadata: {
          simulatedVia: 'DEMO_BANK',
          beneficiaryBank: data.beneficiaryBank,
          beneficiaryAccount: data.beneficiaryAccount,
        },
      })

      return {
        success: true,
        reference,
        result,
      }
    }

    const payload = {
      event: 'charge.success',
      data: {
        id: Math.floor(Math.random() * 100000000),
        domain: 'test',
        status: 'success',
        reference: reference,
        amount: amountKobo,
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'dedicated_nuban',
        currency: 'NGN',
        ip_address: '127.0.0.1',
        metadata: {
          source_app: 'upward',
          ...(matchedVaultUuid ? { vault_id: matchedVaultUuid } : {}),
          ...(data.narration?.trim() ? { narration: data.narration.trim() } : {}),
        },
        customer: {
          id: 999999,
          first_name: 'Test',
          last_name: 'User',
          email: 'user@test.com',
          customer_code: dva.paystackCustomerId,
        },
        dedicated_account: {
          id: dva.id,
          account_name: dva.accountName,
          account_number: dva.accountNumber,
          bank: {
            name: dva.bankName,
            slug: dva.bankCode,
          },
        },
      },
    }

    const payloadString = JSON.stringify(payload)
    const hash = createHmac('sha512', secret || '')
      .update(payloadString)
      .digest('hex')

    this.logger.log(`Triggering webhook simulation for reference: ${reference}`)
    const result = await this.processWebhook.execute(payload, hash)

    return {
      success: true,
      reference,
      result,
    }
  }
}
