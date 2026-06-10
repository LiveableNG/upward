import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { CancelExternalPaymentRequestUseCase } from '@application/use-cases/external/cancel-payment-request.use-case'
import { IPaymentRequestRepository } from '@domains/payments/payment.repository'
import { EventBus } from '@application/events/domain-event'

describe('CancelExternalPaymentRequestUseCase', () => {
  let useCase: CancelExternalPaymentRequestUseCase
  let paymentRequestRepository: jest.Mocked<IPaymentRequestRepository>
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

    eventBus = {
      publish: jest.fn(),
    } as any

    useCase = new CancelExternalPaymentRequestUseCase(paymentRequestRepository, eventBus)
  })

  it('should successfully cancel a pending payment request', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest())
    paymentRequestRepository.update.mockResolvedValue(makePaymentRequest({ status: 'CANCELLED' }))

    const result = await useCase.execute(99, 'pay-req-uuid-001')

    expect(paymentRequestRepository.update).toHaveBeenCalledWith(100, { status: 'CANCELLED' })
    expect(eventBus.publish).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })

  it('should throw NotFoundException if payment request does not exist', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(null)

    await expect(useCase.execute(99, 'non-existent')).rejects.toThrow(NotFoundException)
  })

  it('should throw UnauthorizedException if platformId does not match', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({ platformId: 88 }))

    await expect(useCase.execute(99, 'pay-req-uuid-001')).rejects.toThrow(UnauthorizedException)
  })

  it('should throw BadRequestException if request has already been paid', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({ status: 'PAID', amountPaid: 500000 }))

    await expect(useCase.execute(99, 'pay-req-uuid-001')).rejects.toThrow(BadRequestException)
  })

  it('should throw BadRequestException if request has partial payments', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({ amountPaid: 10000 }))

    await expect(useCase.execute(99, 'pay-req-uuid-001')).rejects.toThrow(BadRequestException)
  })

  it('should return already cancelled message if request is already cancelled', async () => {
    paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({ status: 'CANCELLED' }))

    const result = await useCase.execute(99, 'pay-req-uuid-001')

    expect(paymentRequestRepository.update).not.toHaveBeenCalled()
    expect(result.message).toContain('already cancelled')
  })
})
