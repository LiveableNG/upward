import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import * as crypto from 'crypto'
import { isProductionRuntime } from '../../../src/shared/utils/runtime-env'
import { SimulateTransferUseCase } from '../../../src/application/use-cases/payments/simulate-transfer.use-case'
import { ProcessPaystackSavingsWebhookUseCase } from '../../../src/application/use-cases/rent-savings/process-paystack-savings-webhook.use-case'
import { SimulateVaultDepositUseCase } from '../../../src/application/use-cases/rent-savings/simulate-vault-deposit.use-case'
import { ProcessPaymentWebhookUseCase } from '../../../src/application/use-cases/payments/process-payment-webhook.use-case'
import { OnboardSavingsInvestorUseCase } from '../../../src/application/use-cases/rent-savings/onboard-savings-investor.use-case'

describe('Production simulation & mock DVA guards', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('isProductionRuntime', () => {
    it('returns false when secret key starts with sk_test_ even if NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production'
      expect(isProductionRuntime('sk_test_123')).toBe(false)
    })

    it('returns true when secret key starts with sk_live_', () => {
      process.env.NODE_ENV = 'development'
      expect(isProductionRuntime('sk_live_abc')).toBe(true)
    })

    it('returns true when NODE_ENV is production and no key is configured', () => {
      process.env.NODE_ENV = 'production'
      expect(isProductionRuntime()).toBe(true)
    })

    it('returns false when NODE_ENV is development and no key is configured', () => {
      process.env.NODE_ENV = 'development'
      expect(isProductionRuntime()).toBe(false)
    })
  })

  describe('SimulateTransferUseCase', () => {
    it('blocks transfer simulation in production even when PAYSTACK_SECRET_KEY is missing', async () => {
      process.env.NODE_ENV = 'production'
      process.env.VERCEL_ENV = 'production'

      const uc = new SimulateTransferUseCase(
        {} as any,
        { get: () => undefined } as any,
        {} as any,
      )

      await expect(
        uc.execute({
          beneficiaryBank: 'Wema Bank',
          beneficiaryAccount: '0212345678',
          amount: 10000,
        }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('blocks transfer simulation when live Paystack key is configured', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.VERCEL_ENV

      const uc = new SimulateTransferUseCase(
        {} as any,
        { get: () => 'sk_live_secret' } as any,
        {} as any,
      )

      await expect(
        uc.execute({
          beneficiaryBank: 'Wema Bank',
          beneficiaryAccount: '0212345678',
          amount: 10000,
        }),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('ProcessPaystackSavingsWebhookUseCase', () => {
    it('rejects unsigned webhooks in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.VERCEL_ENV = 'production'

      const uc = new ProcessPaystackSavingsWebhookUseCase(
        { get: () => 'sk_live_secret' } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      )

      const payload = {
        event: 'charge.success',
        data: { reference: 'DEP_1', amount: 100000, currency: 'NGN' },
      }

      await expect(
        uc.execute(payload, undefined, JSON.stringify(payload)),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('rejects missing PAYSTACK_SECRET_KEY in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.VERCEL_ENV = 'production'

      const uc = new ProcessPaystackSavingsWebhookUseCase(
        { get: () => '' } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      )

      const payload = {
        event: 'charge.success',
        data: { reference: 'DEP_2', amount: 100000, currency: 'NGN' },
      }

      await expect(
        uc.execute(payload, 'any-sig', JSON.stringify(payload)),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('accepts valid HMAC signature in production and rejects mismatched signature', async () => {
      process.env.NODE_ENV = 'production'
      process.env.VERCEL_ENV = 'production'
      const secret = 'sk_live_secret'

      const uc = new ProcessPaystackSavingsWebhookUseCase(
        { get: () => secret } as any,
        { findTransactionByReference: jest.fn().mockResolvedValue({ id: 1 }) } as any,
        {} as any,
        {} as any,
        {} as any,
      )

      const payload = {
        event: 'charge.success',
        data: { reference: 'DEP_OK', amount: 100000, currency: 'NGN' },
      }
      const raw = JSON.stringify(payload)
      const validSig = crypto.createHmac('sha512', secret).update(raw).digest('hex')

      await expect(uc.execute(payload, 'bad-sig', raw)).rejects.toThrow(UnauthorizedException)
      await expect(uc.execute(payload, validSig, raw)).resolves.toEqual({
        status: 'already_processed',
        reference: 'DEP_OK',
      })
    })
  })

  describe('SimulateVaultDepositUseCase', () => {
    it('blocks simulated vault deposits in production and with live Paystack keys', async () => {
      process.env.NODE_ENV = 'production'
      const ucProd = new SimulateVaultDepositUseCase(
        { get: () => 'sk_test_123' } as any,
        {} as any,
        {} as any,
      )
      await expect(
        ucProd.execute(1, { amount_kobo: 500000 }),
      ).rejects.toThrow(ForbiddenException)

      process.env.NODE_ENV = 'development'
      const ucLive = new SimulateVaultDepositUseCase(
        { get: () => 'sk_live_secret' } as any,
        {} as any,
        {} as any,
      )
      await expect(
        ucLive.execute(1, { amount_kobo: 500000 }),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('ProcessPaymentWebhookUseCase', () => {
    it('rejects invalid signatures in production when live secret is configured', async () => {
      process.env.NODE_ENV = 'production'

      const prismaMock = {
        upward_webhook_log: {
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        },
      }
      const uc = new ProcessPaymentWebhookUseCase(
        {} as any,
        {} as any,
        { get: () => 'sk_live_prod_key' } as any,
        {} as any,
        {} as any,
        {} as any,
        prismaMock as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      )

      await expect(
        uc.execute(
          { event: 'charge.success', data: { reference: 'ref_1', amount: 1000 } },
          'wrong-signature',
        ),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('OnboardSavingsInvestorUseCase', () => {
    it('does not invent a random fake 02... DVA in production when Paystack DVA fails', async () => {
      process.env.NODE_ENV = 'production'
      process.env.VERCEL_ENV = 'production'
      process.env.PAYSTACK_SECRET_KEY = 'sk_live_prod'

      const prisma = {
        upward_kyc_verification: {
          findFirst: jest.fn().mockImplementation(async (args?: any) => {
            if (args?.where?.userId?.not) return null
            return {
              bvnVerified: true,
              ninVerified: true,
              idNumberEncrypted: 'enc_22211122233',
            }
          }),
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        upward_pm_tenant_record: { findFirst: jest.fn().mockResolvedValue(null) },
        upward_user_property: {
          findFirst: jest.fn().mockResolvedValue({
            rentAmount: 2000000,
            rentEndDate: new Date(Date.now() + 180 * 24 * 3600 * 1000),
          }),
        },
        upward_rent_vault: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 99 }),
        },
        upward_rent_savings_score: { upsert: jest.fn() },
        upward_user: { update: jest.fn() },
      }

      const encryption = {
        decrypt: jest.fn().mockReturnValue('22211122233'),
        encrypt: jest.fn((v: string) => `enc_${v}`),
        hash: jest.fn((v: string) => `hash_${v}`),
      }

      const userRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 10,
          uuid: 'user-uuid-10',
          email: 'user@example.com',
          firstName: 'Ada',
          lastName: 'Okafor',
          phone: '08012345678',
          kycStatus: 'VERIFIED',
        }),
        update: jest.fn().mockResolvedValue({ id: 10 }),
      }

      const kycProvider = {
        verify: jest.fn().mockResolvedValue({
          success: true,
          provider: 'mock',
          firstName: 'Ada',
          lastName: 'Okafor',
          reference: 'KYC_REF_1',
        }),
      }

      const kycRepository = {
        findVerifiedByHash: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 55 }),
      }

      const paymentGateway = {
        createCustomer: jest.fn().mockResolvedValue({ data: { customer_code: 'CUS_123' } }),
        createDedicatedAccount: jest.fn().mockRejectedValue(new Error('Paystack DVA unavailable')),
      }

      const assetManagementProvider = {
        onboardInvestor: jest.fn().mockResolvedValue({ success: false }),
      }

      const uc = new OnboardSavingsInvestorUseCase(
        prisma as any,
        encryption as any,
        userRepo as any,
        kycProvider as any,
        kycRepository as any,
        paymentGateway as any,
        assetManagementProvider as any,
        { getRates: jest.fn().mockResolvedValue({ savingsEnabled: true }) } as any,
      )

      const res = await uc.execute(10, {
        bvn: '22211122233',
        nin: '11122233344',
        means_of_id_type: 'NIN',
        means_of_id_doc_key: 'users/user-uuid-10/arm-kyc/id_card/test-id.jpg',
        means_of_id_mime_type: 'image/jpeg',
        means_of_id_file_name: 'nin-slip.jpg',
        residential_address_number: '14',
        residential_street: 'Admiralty Way',
        residential_town: 'Lekki',
        residential_state: 'Lagos',
        utility_bill_doc_key: 'users/user-uuid-10/arm-kyc/utility_bill/nepa-bill.pdf',
        utility_bill_mime_type: 'application/pdf',
        utility_bill_file_name: 'nepa-bill.pdf',
        consent_accepted: true,
        mothers_maiden_name: 'Okafor',
        occupation: 'Engineer',
        source_of_funds: 'Salary',
        next_of_kin_name: 'Chidi Okafor',
        next_of_kin_relationship: 'Sibling',
        next_of_kin_phone: '08099998888',
      })

      expect(res.data.dedicated_account).toBeNull()
      expect(prisma.upward_rent_vault.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dvaAccountNumber: null,
            dvaAssignmentStatus: 'PENDING',
          }),
        }),
      )
    })
  })
})
