import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ProcessPaymentWebhookUseCase } from './process-payment-webhook.use-case'

@Injectable()
export class SimulateTransferUseCase {
  private readonly logger = new Logger(SimulateTransferUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly processWebhook: ProcessPaymentWebhookUseCase,
  ) { }

  async execute(data: { beneficiaryBank: string; beneficiaryAccount: string; amount: number }) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')
    const isTestKey = secret?.startsWith('sk_test_') || !secret

    if (!isTestKey) {
      throw new BadRequestException('Simulation is only allowed in Test Mode (using sandbox keys).')
    }

    let dva = await this.prisma.upward_dedicated_virtual_account.findUnique({
      where: { accountNumber: data.beneficiaryAccount }
    })

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
