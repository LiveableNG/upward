import { ArmNotificationProcessorService } from '../../../../src/infrastructure/queues/arm-operations/arm-notification-processor.service'
import { EncryptionService } from '../../../../src/shared/infrastructure/common/encryption.service'

describe('ArmNotificationProcessorService', () => {
  let processor: ArmNotificationProcessorService
  let prisma: any
  let emailService: any
  let notificationService: any
  let configService: any
  let encryption: EncryptionService

  const completedJob = {
    id: 42,
    uuid: 'job-uuid-42',
    idempotencyKey: 'ARM_SUBSCRIBE__PAY_REF_100',
    jobType: 'SUBSCRIBE',
    status: 'COMPLETED',
    vaultId: 7,
    userId: 12,
    amountKobo: 5000000n,
    reference: 'PAY_REF_100',
    armTransactionId: '11111111-2222-4333-8444-555555555555',
    armInstructionId: 'ARM-PUR-88888',
    attempts: 1,
    maxAttempts: 5,
    lastError: null,
    notifiedUserAt: null as Date | null,
    notifiedAdminAt: null as Date | null,
  }

  beforeEach(() => {
    encryption = new EncryptionService()

    emailService = {
      sendEmailWithRetry: jest.fn().mockResolvedValue({ success: true, mailgunId: 'mg-1' }),
      sendSystemAlertToAdmins: jest.fn().mockResolvedValue({ attempted: 1, sent: 1, failed: 0 }),
    }

    notificationService = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
    }

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ADMIN_SITE_URL') return 'http://localhost:3003'
        if (key === 'PAY_APP_URL') return 'http://localhost:3001'
        return undefined
      }),
    }

    prisma = {
      upward_arm_job: {
        findUnique: jest.fn().mockResolvedValue({ ...completedJob }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      upward_notification: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      upward_user: {
        findUnique: jest.fn().mockResolvedValue({
          firstName: encryption.encrypt('Ada'),
          lastName: encryption.encrypt('Obi'),
          email: encryption.encrypt('ada@example.com'),
        }),
      },
      upward_rent_vault: {
        findUnique: jest.fn().mockResolvedValue({ uuid: 'vault-uuid-7' }),
      },
    }

    processor = new ArmNotificationProcessorService(
      prisma,
      encryption,
      emailService,
      configService,
      notificationService,
    )
  })

  it('delivers USER_SUCCESS in-app/push + email and stamps notifiedUserAt only after email succeeds', async () => {
    const res = await processor.processNotification({
      armJobId: 42,
      armJobUuid: 'job-uuid-42',
      kind: 'USER_SUCCESS',
    })

    expect(res).toEqual({ status: 'sent', kind: 'USER_SUCCESS' })
    expect(notificationService.notifyUser).toHaveBeenCalledTimes(1)
    expect(emailService.sendEmailWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        type: 'SAVINGS_FUNDED',
      }),
    )
    expect(prisma.upward_arm_job.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42, notifiedUserAt: null },
      }),
    )
  })

  it('throws on email outage (so BullMQ retries) and does NOT stamp notifiedUserAt', async () => {
    emailService.sendEmailWithRetry.mockResolvedValueOnce({
      success: false,
      error: 'Mailgun 503 Service Unavailable',
    })

    await expect(
      processor.processNotification({
        armJobId: 42,
        armJobUuid: 'job-uuid-42',
        kind: 'USER_SUCCESS',
      }),
    ).rejects.toThrow('Mailgun 503 Service Unavailable')

    expect(prisma.upward_arm_job.updateMany).not.toHaveBeenCalled()
  })

  it('deduplicates in-app notification on email retry when in-app alert was already sent', async () => {
    prisma.upward_notification.findFirst.mockResolvedValueOnce({ id: 999 })

    const res = await processor.processNotification({
      armJobId: 42,
      armJobUuid: 'job-uuid-42',
      kind: 'USER_SUCCESS',
    })

    expect(res).toEqual({ status: 'sent', kind: 'USER_SUCCESS' })
    expect(notificationService.notifyUser).not.toHaveBeenCalled()
    expect(emailService.sendEmailWithRetry).toHaveBeenCalledTimes(1)
    expect(prisma.upward_arm_job.updateMany).toHaveBeenCalledTimes(1)
  })

  it('throws on ADMIN_FAILURE when all admin email deliveries fail so BullMQ retries', async () => {
    prisma.upward_arm_job.findUnique.mockResolvedValueOnce({
      ...completedJob,
      status: 'FAILED',
      armInstructionId: null,
      lastError: 'ARM timeout',
    })
    emailService.sendSystemAlertToAdmins.mockResolvedValueOnce({
      attempted: 2,
      sent: 0,
      failed: 2,
    })

    await expect(
      processor.processNotification({
        armJobId: 42,
        armJobUuid: 'job-uuid-42',
        kind: 'ADMIN_FAILURE',
      }),
    ).rejects.toThrow('Admin failure alert delivery failed')

    expect(prisma.upward_arm_job.updateMany).not.toHaveBeenCalled()
    expect(notificationService.notifyUser).not.toHaveBeenCalled()
  })

  it('skips cleanly if notification was already sent', async () => {
    prisma.upward_arm_job.findUnique.mockResolvedValueOnce({
      ...completedJob,
      notifiedAdminAt: new Date(),
    })

    const res = await processor.processNotification({
      armJobId: 42,
      armJobUuid: 'job-uuid-42',
      kind: 'ADMIN_SUCCESS',
    })

    expect(res).toEqual({ status: 'already_notified', kind: 'ADMIN_SUCCESS' })
    expect(emailService.sendSystemAlertToAdmins).not.toHaveBeenCalled()
  })
})
