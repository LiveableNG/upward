import { UnrecoverableError } from 'bullmq'
import { ArmJobProcessorService } from '../../../../src/infrastructure/queues/arm-operations/arm-job-processor.service'
import {
  ArmOperationError,
  IAssetManagementProvider,
} from '../../../../src/domains/rent-savings/asset-management.provider'
import { IArmNotificationQueue } from '../../../../src/domains/rent-savings/arm-job.interface'

describe('ArmJobProcessorService', () => {
  let processor: ArmJobProcessorService
  let prisma: any
  let txClient: any
  let providerRegistry: any
  let mockArmProvider: jest.Mocked<IAssetManagementProvider>
  let notificationQueue: jest.Mocked<IArmNotificationQueue>

  const baseJob = {
    id: 42,
    uuid: 'job-uuid-42',
    idempotencyKey: 'ARM_SUBSCRIBE__PAY_REF_100',
    jobType: 'SUBSCRIBE',
    status: 'QUEUED',
    vaultId: 7,
    userId: 12,
    transactionId: 303,
    amountKobo: 5000000n,
    reference: 'PAY_REF_100',
    armTransactionId: '11111111-2222-4333-8444-555555555555',
    armInstructionId: null as string | null,
    payload: {
      provider: 'ARM',
      membershipId: '3005719',
      productCode: 'ARMMMF',
      amountKobo: '5000000',
      armReference: 'ARM-PAY_REF_100',
      reInvestDividends: true,
    },
    result: null,
    attempts: 0,
    maxAttempts: 5,
    lastError: null,
    lockedAt: null,
    completedAt: null,
    failedAt: null,
    notifiedUserAt: null,
    notifiedAdminAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockArmProvider = {
      providerName: 'ARM',
      getYieldMetrics: jest.fn(),
      subscribe: jest.fn().mockResolvedValue({
        success: true,
        purchaseId: 'ARM-PUR-88888',
        transactionId: baseJob.armTransactionId,
        unitsAllocated: 50000,
        message: 'Queued for settlement',
      }),
      redeem: jest.fn(),
      getPortfolio: jest.fn(),
      getTransactionStatus: jest.fn().mockResolvedValue([]),
    }

    providerRegistry = {
      getProvider: jest.fn().mockReturnValue(mockArmProvider),
    }

    notificationQueue = {
      enqueueNotification: jest.fn().mockResolvedValue(true),
    }

    txClient = {
      upward_arm_job: {
        update: jest.fn().mockResolvedValue({}),
      },
      upward_rent_vault: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ providerMembershipId: null, providerAccountNumber: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_rent_vault_transaction: {
        findUnique: jest.fn().mockResolvedValue({ metadata: { source: 'PAYSTACK_WEBHOOK' } }),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_kyc_verification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }

    prisma = {
      upward_arm_job: {
        findUnique: jest.fn().mockResolvedValue({ ...baseJob }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(txClient)),
    }

    processor = new ArmJobProcessorService(prisma, providerRegistry, notificationQueue)
  })

  it('should execute ARM subscribe with pre-committed armTransactionId and enqueue BOTH USER_SUCCESS and ADMIN_SUCCESS on arm-notifications', async () => {
    const res = await processor.processArmJob(42)

    expect(res).toEqual({
      status: 'completed',
      armInstructionId: 'ARM-PUR-88888',
    })

    expect(prisma.upward_arm_job.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42, status: 'QUEUED', armInstructionId: null },
      }),
    )

    expect(mockArmProvider.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: baseJob.armTransactionId,
        amountKobo: 5000000n,
        membershipId: '3005719',
      }),
    )

    expect(txClient.upward_arm_job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({
          status: 'COMPLETED',
          armInstructionId: 'ARM-PUR-88888',
        }),
      }),
    )

    expect(notificationQueue.enqueueNotification).toHaveBeenCalledWith({
      armJobId: 42,
      armJobUuid: 'job-uuid-42',
      kind: 'USER_SUCCESS',
    })
    expect(notificationQueue.enqueueNotification).toHaveBeenCalledWith({
      armJobId: 42,
      armJobUuid: 'job-uuid-42',
      kind: 'ADMIN_SUCCESS',
    })
  })

  it('should STILL complete ARM job cleanly if notification queue throws (never re-runs ARM)', async () => {
    notificationQueue.enqueueNotification.mockRejectedValue(new Error('Redis notification blip'))

    const res = await processor.processArmJob(42)

    expect(res).toEqual({
      status: 'completed',
      armInstructionId: 'ARM-PUR-88888',
    })
  })

  it('should NEVER call ARM twice if job already has an armInstructionId or is COMPLETED', async () => {
    prisma.upward_arm_job.findUnique.mockResolvedValueOnce({
      ...baseJob,
      status: 'COMPLETED',
      armInstructionId: 'ARM-PUR-EXISTING',
      notifiedUserAt: new Date(),
      notifiedAdminAt: new Date(),
    })

    const res = await processor.processArmJob(42)

    expect(res).toEqual({
      status: 'already_completed',
      armInstructionId: 'ARM-PUR-EXISTING',
    })
    expect(prisma.upward_arm_job.updateMany).not.toHaveBeenCalled()
    expect(mockArmProvider.subscribe).not.toHaveBeenCalled()
    expect(notificationQueue.enqueueNotification).not.toHaveBeenCalled()
  })

  it('should NEVER call ARM if another concurrent worker already claimed the CAS lock', async () => {
    prisma.upward_arm_job.updateMany.mockResolvedValueOnce({ count: 0 })

    const res = await processor.processArmJob(42)

    expect(res).toEqual({ status: 'skipped_locked_or_done' })
    expect(mockArmProvider.subscribe).not.toHaveBeenCalled()
  })

  it('should reconcile existing ARM transaction on retry without ever re-submitting subscribe()', async () => {
    prisma.upward_arm_job.findUnique.mockResolvedValueOnce({
      ...baseJob,
      attempts: 1,
    })
    ;(mockArmProvider.getTransactionStatus as jest.Mock).mockResolvedValueOnce([
      {
        status: true,
        purchaseId: 'ARM-PUR-RECOVERED-99',
        transactionId: baseJob.armTransactionId,
        message: 'QueuePublication',
      },
    ])

    const res = await processor.processArmJob(42)

    expect(res).toEqual({
      status: 'completed',
      armInstructionId: 'ARM-PUR-RECOVERED-99',
      reconciledExisting: true,
    })
    expect(mockArmProvider.getTransactionStatus).toHaveBeenCalledWith({
      transactionId: baseJob.armTransactionId,
    })
    expect(mockArmProvider.subscribe).not.toHaveBeenCalled()
    expect(notificationQueue.enqueueNotification).toHaveBeenCalledTimes(2)
  })

  it('should release lock back to QUEUED on transient error while retries remain without enqueueing notifications', async () => {
    mockArmProvider.subscribe.mockRejectedValueOnce(new Error('ETIMEDOUT connecting to ARM'))

    await expect(processor.processArmJob(42, { isFinalBullMqAttempt: false })).rejects.toThrow(
      'ETIMEDOUT',
    )

    expect(prisma.upward_arm_job.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 42, status: 'PROCESSING', armInstructionId: null },
        data: expect.objectContaining({
          status: 'QUEUED',
          lockedAt: null,
        }),
      }),
    )
    expect(notificationQueue.enqueueNotification).not.toHaveBeenCalled()
  })

  it('should mark FAILED and enqueue ADMIN_FAILURE ONLY (never USER_SUCCESS) on non-retryable ARM rejection', async () => {
    mockArmProvider.subscribe.mockRejectedValueOnce(
      new ArmOperationError('ARM purchase rejected: invalid productCode', 400, false),
    )

    await expect(processor.processArmJob(42)).rejects.toThrow(UnrecoverableError)

    expect(txClient.upward_arm_job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    )
    expect(notificationQueue.enqueueNotification).toHaveBeenCalledTimes(1)
    expect(notificationQueue.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        armJobId: 42,
        armJobUuid: 'job-uuid-42',
        kind: 'ADMIN_FAILURE',
      }),
    )
  })

  it('should hydrate S3-stored id_card and utility_bill documents before dispatching ONBOARD job to ARM', async () => {
    const mockS3 = {
      getFileBuffer: jest
        .fn()
        .mockResolvedValueOnce(Buffer.from('fake-id-image-bytes'))
        .mockResolvedValueOnce(Buffer.from('%PDF-1.4 fake-utility-bill')),
    } as any

    mockArmProvider.onboardInvestor = jest.fn().mockResolvedValue({
      success: true,
      status: 'Submitted',
      customerId: 'ARM-TRACK-99',
      customerMembershipId: '3009999',
      crmAccountNumber: '3009999-ARMMMF-01',
      completedSections: 63,
    })

    const onboardJob = {
      ...baseJob,
      id: 99,
      uuid: 'job-uuid-99',
      idempotencyKey: 'ARM_ONBOARD__12__55',
      jobType: 'ONBOARD',
      payload: {
        provider: 'ARM',
        onboardingRequest: {
          customerEmail: 'funke@example.com',
          personalDetails: {
            surname: 'Akindele',
            firstName: 'Funke',
            dateOfBirth: '1991-09-24',
            gender: 'Female',
            mobilePhone: '08031234567',
          },
          address: {
            addressNumber: '14',
            streetName: 'Admiralty Way',
            town: 'Lekki',
            residentialStateCode: 'Lagos',
          },
          kycDetails: {
            bvn: '22233344455',
            nin: '11122233344',
            meansOfIdentification: 'NIN',
          },
          documents: {
            id_card: {
              s3Key: 'users/u-12/arm-kyc/id_card/nin.jpg',
              mimeType: 'image/jpeg',
              fileName: 'nin.jpg',
            },
            utility_bill: {
              s3Key: 'users/u-12/arm-kyc/utility_bill/nepa.pdf',
              mimeType: 'application/pdf',
              fileName: 'nepa.pdf',
            },
          },
        },
      },
    }

    prisma.upward_arm_job.findUnique.mockResolvedValueOnce(onboardJob)
    const processorWithS3 = new ArmJobProcessorService(
      prisma,
      providerRegistry,
      notificationQueue,
      undefined,
      mockS3,
    )

    const res = await processorWithS3.processArmJob(99)
    expect(res.status).toBe('completed')
    expect(res.armInstructionId).toBe('3009999')
    expect(mockS3.getFileBuffer).toHaveBeenCalledWith('users/u-12/arm-kyc/id_card/nin.jpg')
    expect(mockS3.getFileBuffer).toHaveBeenCalledWith('users/u-12/arm-kyc/utility_bill/nepa.pdf')
    expect(mockArmProvider.onboardInvestor).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: expect.objectContaining({
          id_card: expect.objectContaining({
            base64: Buffer.from('fake-id-image-bytes').toString('base64'),
            mimeType: 'image/jpeg',
            fileName: 'nin.jpg',
          }),
          utility_bill: expect.objectContaining({
            base64: Buffer.from('%PDF-1.4 fake-utility-bill').toString('base64'),
            mimeType: 'application/pdf',
            fileName: 'nepa.pdf',
          }),
        }),
      }),
    )
  })
})
