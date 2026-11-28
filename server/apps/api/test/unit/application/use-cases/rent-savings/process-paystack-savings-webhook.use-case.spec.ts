import * as crypto from 'crypto'
import { UnauthorizedException } from '@nestjs/common'
import {
  PaystackWebhookPayload,
  ProcessPaystackSavingsWebhookUseCase,
} from '@application/use-cases/rent-savings/process-paystack-savings-webhook.use-case'
import { IRentVaultRepository } from '@domains/rent-savings/rent-vault.repository'
import { IPaymentGateway } from '@domains/payments/payment.repository'
import { IArmJobQueue } from '@domains/rent-savings/arm-job.interface'
import { EncryptionService } from '../../../../../src/shared/infrastructure/common/encryption.service'

describe('ProcessPaystackSavingsWebhookUseCase', () => {
  const SECRET = 'sk_test_paystack_secret_unit_test'

  let useCase: ProcessPaystackSavingsWebhookUseCase
  let rentVaultRepo: jest.Mocked<IRentVaultRepository>
  let paymentGateway: jest.Mocked<IPaymentGateway>
  let armJobQueue: jest.Mocked<IArmJobQueue>
  let prisma: any
  let txClient: any
  let encryption: EncryptionService
  let configService: any

  const mockVault = {
    id: 1,
    uuid: 'vault-uuid-001',
    userId: 10,
    targetAmountKobo: 240000000n,
    currentPrincipalKobo: 0n,
    accruedYieldKobo: 0n,
    cadence: 'MONTHLY' as const,
    contractualDueDate: new Date(),
    unlockDate: new Date(),
    lockStatus: 'LOCKED' as const,
    preferredFundingMethod: 'DVA' as const,
    dvaAccountNumber: '9012345678',
    dvaCustomerCode: 'CUS_valid_001',
    dvaAssignmentStatus: 'ACTIVE',
    autoBypassPmApproval: true,
    investmentProvider: 'ARM',
    providerMembershipId: '3005719',
    providerAccountNumber: '3005719-ARMMMF-01',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  function signPayload(payload: PaystackWebhookPayload) {
    const rawBody = JSON.stringify(payload)
    const signature = crypto.createHmac('sha512', SECRET).update(rawBody).digest('hex')
    return { rawBody, signature }
  }

  beforeEach(() => {
    rentVaultRepo = {
      findTransactionByReference: jest.fn().mockResolvedValue(null),
      findByUuid: jest.fn().mockResolvedValue(mockVault),
      findByDvaAccountNumber: jest.fn().mockResolvedValue(mockVault),
      createTransaction: jest.fn(),
      incrementBalances: jest.fn(),
      update: jest.fn(),
      findSavingsScoreByVaultId: jest.fn().mockResolvedValue(null),
      upsertSavingsScore: jest.fn().mockResolvedValue({} as any),
    } as any

    paymentGateway = {
      verifyTransaction: jest.fn().mockResolvedValue({
        status: true,
        amount: 200000,
        amountKobo: 20000000n,
        currency: 'NGN',
        channel: 'dedicated_nuban',
        reference: 'dva_tx_999',
        gatewayStatus: 'success',
        customerCode: 'CUS_valid_001',
        customerEmail: 'saver@example.com',
        receiverAccountNumber: '9012345678',
        metadata: { vault_id: 'vault-uuid-001' },
      }),
    } as any

    armJobQueue = {
      enqueueJob: jest.fn().mockResolvedValue(true),
      reconcilePendingJobs: jest.fn(),
    } as any

    txClient = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      upward_rent_vault_transaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 501, uuid: 'tx-uuid-501' }),
      },
      upward_rent_vault: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockVault),
        findUnique: jest.fn().mockResolvedValue(mockVault),
        update: jest.fn().mockResolvedValue(mockVault),
      },
      upward_arm_job: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 901,
          uuid: 'arm-job-uuid-901',
          idempotencyKey: data.idempotencyKey,
          jobType: data.jobType,
          armTransactionId: data.armTransactionId,
        })),
      },
    }

    prisma = {
      upward_transaction: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      upward_user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'saver@example.com' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(txClient)),
    }

    encryption = new EncryptionService()
    configService = {
      get: jest.fn().mockReturnValue(SECRET),
    }

    useCase = new ProcessPaystackSavingsWebhookUseCase(
      configService,
      rentVaultRepo,
      paymentGateway,
      prisma,
      encryption,
      armJobQueue,
    )
  })

  it('should reject webhooks with missing or invalid Paystack HMAC signature', async () => {
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'forged_ref', amount: 20000000, currency: 'NGN' },
    }

    await expect(useCase.execute(payload, undefined, JSON.stringify(payload))).rejects.toThrow(
      UnauthorizedException,
    )

    await expect(
      useCase.execute(payload, 'deadbeef_invalid_sig', JSON.stringify(payload)),
    ).rejects.toThrow(UnauthorizedException)

    expect(paymentGateway.verifyTransaction).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('should ignore unsupported Paystack events even when validly signed', async () => {
    const payload: PaystackWebhookPayload = {
      event: 'subscription.create',
      data: { reference: 'ref_123', amount: 5000000, currency: 'NGN' },
    }
    const { rawBody, signature } = signPayload(payload)

    const result = await useCase.execute(payload, signature, rawBody)

    expect(result.status).toBe('ignored')
    expect(paymentGateway.verifyTransaction).not.toHaveBeenCalled()
  })

  it('should reject unverified Paystack transactions even with a valid webhook signature', async () => {
    paymentGateway.verifyTransaction.mockResolvedValueOnce({
      status: false,
      gatewayStatus: 'abandoned',
    })
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'fake_unverified_ref', amount: 20000000, currency: 'NGN' },
    }
    const { rawBody, signature } = signPayload(payload)

    await expect(useCase.execute(payload, signature, rawBody)).rejects.toThrow(
      UnauthorizedException,
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(armJobQueue.enqueueJob).not.toHaveBeenCalled()
  })

  it('should reject tampered webhook amounts that disagree with Paystack verify API', async () => {
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'dva_tx_999', amount: 99999900, currency: 'NGN' }, // tampered vs 20000000n verified
    }
    const { rawBody, signature } = signPayload(payload)

    await expect(useCase.execute(payload, signature, rawBody)).rejects.toThrow(
      UnauthorizedException,
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('should reject cross-customer hijacking when Paystack customer_code mismatches vault', async () => {
    paymentGateway.verifyTransaction.mockResolvedValueOnce({
      status: true,
      amount: 200000,
      amountKobo: 20000000n,
      currency: 'NGN',
      channel: 'dedicated_nuban',
      reference: 'dva_tx_999',
      customerCode: 'CUS_ATTACKER_999',
      receiverAccountNumber: '9012345678',
    })
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'dva_tx_999', amount: 20000000, currency: 'NGN' },
    }
    const { rawBody, signature } = signPayload(payload)

    await expect(useCase.execute(payload, signature, rawBody)).rejects.toThrow(
      UnauthorizedException,
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('should block cross-system replay if reference already exists in general upward_transaction', async () => {
    prisma.upward_transaction.findUnique.mockResolvedValueOnce({ id: 777 })
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'already_used_rent_ref', amount: 20000000, currency: 'NGN' },
    }
    const { rawBody, signature } = signPayload(payload)

    const result = await useCase.execute(payload, signature, rawBody)

    expect(result.status).toBe('ignored')
    expect(paymentGateway.verifyTransaction).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('should atomically verify with Paystack, credit vault once, persist outbox ARM job, and enqueue to BullMQ', async () => {
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: {
        reference: 'dva_tx_999',
        amount: 20000000,
        currency: 'NGN',
        channel: 'dedicated_nuban',
        dedicated_account: { account_number: '9012345678' },
      },
    }
    const { rawBody, signature } = signPayload(payload)

    const result = await useCase.execute(payload, signature, rawBody)

    expect(result.status).toBe('success')
    expect((result as any).amount_kobo).toBe(20000000)
    expect((result as any).arm_job_status).toBe('QUEUED')
    expect((result as any).arm_job_id).toBe('arm-job-uuid-901')

    expect(paymentGateway.verifyTransaction).toHaveBeenCalledWith('dva_tx_999')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(txClient.$queryRaw).toHaveBeenCalledTimes(1)
    expect(txClient.upward_rent_vault_transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vaultId: 1,
          type: 'DEPOSIT',
          amountKobo: 20000000n,
          reference: 'dva_tx_999',
        }),
      }),
    )
    expect(txClient.upward_rent_vault.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { currentPrincipalKobo: { increment: 20000000n } },
    })
    expect(txClient.upward_arm_job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: 'ARM_SUBSCRIBE__dva_tx_999',
          jobType: 'SUBSCRIBE',
          status: 'QUEUED',
          amountKobo: 20000000n,
          reference: 'dva_tx_999',
        }),
      }),
    )
    expect(armJobQueue.enqueueJob).toHaveBeenCalledWith({
      id: 901,
      uuid: 'arm-job-uuid-901',
      idempotencyKey: 'ARM_SUBSCRIBE__dva_tx_999',
      jobType: 'SUBSCRIBE',
    })
  })

  it('should prevent double credit when reference is already processed', async () => {
    rentVaultRepo.findTransactionByReference.mockResolvedValueOnce({
      id: 88,
      reference: 'dva_tx_999',
    } as any)
    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'dva_tx_999', amount: 20000000, currency: 'NGN' },
    }
    const { rawBody, signature } = signPayload(payload)

    const result = await useCase.execute(payload, signature, rawBody)

    expect(result.status).toBe('already_processed')
    expect(paymentGateway.verifyTransaction).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(armJobQueue.enqueueJob).not.toHaveBeenCalled()
  })

  it('should handle concurrent duplicate webhook race cleanly via Prisma P2002 without double-crediting or double-enqueuing', async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed' })

    const payload: PaystackWebhookPayload = {
      event: 'charge.success',
      data: { reference: 'dva_tx_999', amount: 20000000, currency: 'NGN' },
    }
    const { rawBody, signature } = signPayload(payload)

    const result = await useCase.execute(payload, signature, rawBody)

    expect(result.status).toBe('already_processed')
    expect(armJobQueue.enqueueJob).not.toHaveBeenCalled()
  })

  it('should process dedicatedaccount.payment.success and publish RentVaultUpdatedEvent', async () => {
    const mockEventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
      subscribe: jest.fn(),
    }

    paymentGateway.verifyTransaction.mockResolvedValueOnce({
      status: true,
      amount: 350000,
      amountKobo: 35000000n,
      currency: 'NGN',
      channel: 'dedicated_nuban',
      reference: 'TFD_9012345678_350000_12345',
      gatewayStatus: 'success',
      customerCode: 'CUS_valid_001',
      customerEmail: 'saver@example.com',
      receiverAccountNumber: '9012345678',
    })

    const useCaseWithBus = new ProcessPaystackSavingsWebhookUseCase(
      configService,
      rentVaultRepo,
      paymentGateway,
      prisma,
      encryption,
      armJobQueue,
      mockEventBus as any,
    )

    const payload: PaystackWebhookPayload = {
      event: 'dedicatedaccount.payment.success',
      data: {
        reference: 'TFD_9012345678_350000_12345',
        amount: 35000000,
        currency: 'NGN',
        dedicated_account: {
          account_number: '9012345678',
        },
      },
    }
    const { rawBody, signature } = signPayload(payload)

    const result = await useCaseWithBus.execute(payload, signature, rawBody)

    expect(result.status).toBe('success')
    expect(rentVaultRepo.findByDvaAccountNumber).toHaveBeenCalledWith('9012345678')
    expect(txClient.upward_rent_vault.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { currentPrincipalKobo: { increment: 35000000n } },
    })
    expect(armJobQueue.enqueueJob).toHaveBeenCalledTimes(1)
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1)
  })
})
