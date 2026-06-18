import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { UpdateExternalPaymentRequestUseCase } from '@application/use-cases/external/update-payment-request.use-case'
import { IPaymentRequestRepository, IPaymentLineItemRepository } from '@domains/payments/payment.repository'
import { EventBus } from '@application/events/domain-event'

describe('UpdateExternalPaymentRequestUseCase', () => {
  let useCase: UpdateExternalPaymentRequestUseCase
  let paymentRequestRepository: jest.Mocked<IPaymentRequestRepository>
  let lineItemRepository: jest.Mocked<IPaymentLineItemRepository>
  let eventBus: jest.Mocked<EventBus>

  const makePaymentRequest = (overrides: Partial<any> = {}) => ({
    id: 100,
    uuid: 'pay-req-uuid-001',
    userId: 1,
    userPropertyId: 30,
    amount: 500000,
    currency: 'NGN',
    dueDate: new Date(),
    status: 'PENDING',
    amountPaid: 0,
    platformId: 99,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    paymentRequestRepository = {
      findByUuid: jest.fn(),
      update: jest.fn(),
    } as any

    lineItemRepository = {
      deleteByPaymentRequestId: jest.fn(),
      bulkCreate: jest.fn(),
      findByPaymentRequestId: jest.fn().mockResolvedValue([]),
    } as any

    eventBus = {
      publish: jest.fn(),
    } as any

    useCase = new UpdateExternalPaymentRequestUseCase(
      paymentRequestRepository,
      lineItemRepository,
      eventBus,
    )
  })

  it('should successfully update a payment request without line items', async () => {
    const pr = makePaymentRequest()
    paymentRequestRepository.findByUuid.mockResolvedValue(pr)
    paymentRequestRepository.update.mockResolvedValue({ ...pr, amount: 600000 })

    const result = await useCase.execute(99, 'pay-req-uuid-001', {
      amount: 600000,
      description: 'Updated Rent description',
    })

    expect(paymentRequestRepository.update).toHaveBeenCalledWith(100, expect.objectContaining({
      amount: 600000,
      description: 'Updated Rent description',
    }))
    expect(eventBus.publish).toHaveBeenCalled()
    expect(result.amount).toBe(600000)
  })

  it('should update line items and verify total amount sum matching', async () => {
    const pr = makePaymentRequest()
    paymentRequestRepository.findByUuid.mockResolvedValue(pr)
    paymentRequestRepository.update.mockResolvedValue({ ...pr, amount: 500000 })

    await useCase.execute(99, 'pay-req-uuid-001', {
      amount: 500000,
      lineItems: [
        { name: 'Rent base', amount: 450000 },
        { name: 'Service charge', amount: 50000 },
      ],
    })

    expect(lineItemRepository.deleteByPaymentRequestId).toHaveBeenCalledWith(100)
    expect(lineItemRepository.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Rent base', totalAmount: 450000 }),
      expect.objectContaining({ name: 'Service charge', totalAmount: 50000 }),
    ])
  })

  it('should throw BadRequestException if line items total does not match amount', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest())

    await expect(
      useCase.execute(99, 'pay-req-uuid-001', {
        amount: 500000,
        lineItems: [{ name: 'Rent', amount: 200000 }],
      })
    ).rejects.toThrow(BadRequestException)
  })

  it('should throw UnauthorizedException if platformId does not match', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({ platformId: 88 }))

    await expect(
      useCase.execute(99, 'pay-req-uuid-001', { amount: 600000 })
    ).rejects.toThrow(UnauthorizedException)
  })

  it('should throw BadRequestException if payments have been received', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({ amountPaid: 10000 }))

    await expect(
      useCase.execute(99, 'pay-req-uuid-001', { amount: 600000 })
    ).rejects.toThrow(BadRequestException)
  })
})
