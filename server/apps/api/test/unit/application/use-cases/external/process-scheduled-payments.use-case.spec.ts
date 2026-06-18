import { ProcessScheduledExternalPaymentRequestsUseCase } from '@application/use-cases/external/process-scheduled-payments.use-case'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { IPaymentRequestRepository, IPaymentLineItemRepository } from '@domains/payments/payment.repository'
import { UserRepository } from '@domains/users/user.repository'
import { NotificationRepository } from '@domains/notifications/notification.repository'
import { ResolveDedicatedAccountUseCase } from '@application/use-cases/payments/payment.use-cases'
import { WebhookService } from '@shared/infrastructure/common/webhook/webhook.service'
import { EventBus } from '@application/events/domain-event'

describe('ProcessScheduledExternalPaymentRequestsUseCase', () => {
  let useCase: ProcessScheduledExternalPaymentRequestsUseCase
  let prisma: any
  let paymentRequestRepository: jest.Mocked<IPaymentRequestRepository>
  let lineItemRepository: jest.Mocked<IPaymentLineItemRepository>
  let userRepository: jest.Mocked<UserRepository>
  let notificationRepository: jest.Mocked<NotificationRepository>
  let resolveDedicatedAccount: jest.Mocked<ResolveDedicatedAccountUseCase>
  let webhookService: jest.Mocked<WebhookService>
  let eventBus: jest.Mocked<EventBus>

  const makeMockScheduledRequest = (overrides: Partial<any> = {}) => ({
    id: 100,
    uuid: 'pay-req-uuid-001',
    userId: 1,
    userPropertyId: 30,
    amount: 500000,
    currency: 'NGN',
    dueDate: new Date(),
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() - 60000), // 1 min ago
    isRecurring: false,
    recurrenceInterval: null,
    user: { id: 1, email: 'tenant@example.com', firstName: 'Ada', lastName: 'Obi', passwordHash: 'bcrypt-hash' },
    subaccount: { id: 5, subaccountCode: 'ACCT_12345' },
    userProperty: {
      id: 30,
      company: {
        platform: { id: 99, name: 'Acme Platform' },
        platformId: 99,
      },
    },
    ...overrides,
  })

  beforeEach(() => {
    prisma = {
      upward_payment_request: {
        findMany: jest.fn(),
      },
    } as any

    paymentRequestRepository = {
      update: jest.fn(),
      create: jest.fn(),
    } as any

    lineItemRepository = {
      findByPaymentRequestId: jest.fn().mockResolvedValue([]),
      bulkCreate: jest.fn(),
    } as any

    userRepository = {
      findById: jest.fn(),
    } as any

    notificationRepository = {
      createNotification: jest.fn(),
    } as any

    resolveDedicatedAccount = {
      execute: jest.fn().mockResolvedValue({
        accountNumber: '1234567890',
        accountName: 'Ada Obi',
        bankName: 'Test Bank',
        bankCode: '058',
      }),
    } as any

    webhookService = {
      sendWebhook: jest.fn(),
    } as any

    eventBus = {
      publish: jest.fn(),
    } as any

    useCase = new ProcessScheduledExternalPaymentRequestsUseCase(
      prisma,
      paymentRequestRepository,
      lineItemRepository,
      userRepository,
      notificationRepository,
      resolveDedicatedAccount,
      webhookService,
      eventBus,
    )
  })

  it('should successfully activate a due scheduled payment request', async () => {
    const mockPr = makeMockScheduledRequest()
    prisma.upward_payment_request.findMany.mockResolvedValue([mockPr] as any)
    paymentRequestRepository.update.mockResolvedValue(mockPr as any)

    const result = await useCase.execute()

    expect(paymentRequestRepository.update).toHaveBeenCalledWith(100, { status: 'PENDING' })
    expect(resolveDedicatedAccount.execute).toHaveBeenCalled()
    expect(notificationRepository.createNotification).toHaveBeenCalled()
    expect(eventBus.publish).toHaveBeenCalled()
    expect(webhookService.sendWebhook).toHaveBeenCalledWith(
      99,
      'payment_request.activated',
      expect.objectContaining({
        paymentUuid: 'pay-req-uuid-001',
        status: 'PENDING',
      })
    )
    expect(result).toContain('pay-req-uuid-001')
  })

  it('should handle recurring requests and create a cloned scheduled request for the next period', async () => {
    const mockPr = makeMockScheduledRequest({
      isRecurring: true,
      recurrenceInterval: 'MONTHLY',
    })
    prisma.upward_payment_request.findMany.mockResolvedValue([mockPr] as any)
    paymentRequestRepository.update.mockResolvedValue(mockPr as any)
    paymentRequestRepository.create.mockResolvedValue({ id: 101, uuid: 'cloned-uuid' } as any)

    await useCase.execute()

    expect(paymentRequestRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SCHEDULED',
      isRecurring: true,
      recurrenceInterval: 'MONTHLY',
    }))
  })
})
