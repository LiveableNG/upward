import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfirmExternalPaymentUseCase } from '@application/use-cases/external/confirm-payment.use-case'
import { IPaymentRequestRepository, PAYMENT_GATEWAY, IPaymentGateway } from '@domains/payments/payment.repository'
import { UserRepository } from '@domains/users/user.repository'
import { RecordTransactionUseCase } from '@application/use-cases/payments/payment.use-cases'
import { WebhookService } from '@shared/infrastructure/common/webhook/webhook.service'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makePaymentRequest = (overrides: Partial<any> = {}) => ({
  id: 100,
  uuid: 'pay-req-uuid-001',
  userId: 1,
  userPropertyId: 30,
  amount: 500000,
  currency: 'NGN',
  description: 'January rent',
  dueDate: new Date('2026-02-01'),
  status: 'PENDING',
  reference: undefined,
  platformId: 77,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  uuid: 'user-uuid-001',
  email: 'tenant@example.com',
  firstName: 'Ada',
  lastName: 'Obi',
  passwordHash: 'bcrypt-hash',
  emailHash: 'hash',
  firstNameHash: 'hash',
  lastNameHash: 'hash',
  isFromWaitlist: false,
  isFromInvite: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeTransaction = (overrides: Partial<any> = {}) => ({
  id: 500,
  uuid: 'tx-uuid-001',
  userId: 1,
  type: 'RENT',
  status: 'SUCCESS',
  amount: 500000,
  currency: 'NGN',
  reference: 'paystack-ref-123',
  paymentRequestId: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('ConfirmExternalPaymentUseCase', () => {
  let useCase: ConfirmExternalPaymentUseCase
  let paymentRequestRepository: jest.Mocked<IPaymentRequestRepository>
  let userRepository: jest.Mocked<UserRepository>
  let paymentGateway: jest.Mocked<IPaymentGateway>
  let recordTransactionUseCase: jest.Mocked<RecordTransactionUseCase>

  beforeEach(() => {
    paymentRequestRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any

    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUuid: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    paymentGateway = {
      getBanks: jest.fn(),
      verifyAccountNumber : jest.fn(),
      verifyTransaction: jest.fn(),
      initializeTransaction: jest.fn(),
      findOrCreateSubaccount: jest.fn(),
      createCustomer: jest.fn(),
      createDedicatedAccount: jest.fn(),
      initiateTransfer: jest.fn()
    } as any

    recordTransactionUseCase = {
      execute: jest.fn(),
    } as any

    const paymentConfig = {
      getDynamicProcessingFee: jest.fn().mockResolvedValue(2000),
    } as any

    useCase = new ConfirmExternalPaymentUseCase(
      paymentRequestRepository,
      userRepository,
      paymentGateway,
      recordTransactionUseCase,
      paymentConfig,
    )
  })

  describe('execute', () => {
    const paymentUuid = 'pay-req-uuid-001'
    const reference = 'paystack-ref-123'

    describe('Validation', () => {
      it('should throw NotFoundException if payment request does not exist', async () => {
        paymentRequestRepository.findByUuid.mockResolvedValue(null)

        await expect(useCase.execute(paymentUuid, reference)).rejects.toThrow(NotFoundException)
      })

      it('should return success immediately if payment request is already PAID', async () => {
        const paidRequest = makePaymentRequest({ status: 'PAID' })
        paymentRequestRepository.findByUuid.mockResolvedValue(paidRequest as any)

        const result = await useCase.execute(paymentUuid, reference)

        expect(result).toEqual({ success: true, message: 'Payment already confirmed as PAID' })
        expect(recordTransactionUseCase.execute).not.toHaveBeenCalled()
      })

      it('should throw NotFoundException if user associated with payment request not found', async () => {
        paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest() as any)
        userRepository.findById.mockResolvedValue(null)

        await expect(useCase.execute(paymentUuid, reference)).rejects.toThrow(NotFoundException)
        await expect(useCase.execute(paymentUuid, reference)).rejects.toThrow('User associated with payment request not found')
      })
    })

    describe('Verification Flow', () => {
      beforeEach(() => {
        paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest() as any)
        userRepository.findById.mockResolvedValue(makeUser() as any)
      })

      it('should throw BadRequestException if recordTransactionUseCase fails or returns non-success', async () => {
        recordTransactionUseCase.execute.mockResolvedValue(makeTransaction({ status: 'FAILED' }) as any)

        await expect(useCase.execute(paymentUuid, reference)).rejects.toThrow(BadRequestException)
      })

      it('should update payment request and return success when transaction is SUCCESS', async () => {
        recordTransactionUseCase.execute.mockResolvedValue(makeTransaction({ status: 'SUCCESS' }) as any)
        paymentRequestRepository.update.mockResolvedValue(makePaymentRequest({ status: 'PAID' }) as any)

        const result = await useCase.execute(paymentUuid, reference)

        expect(recordTransactionUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            reference: reference,
            paymentRequestId: 100,
          }),
        )
        expect(paymentRequestRepository.update).toHaveBeenCalledWith(100, {
          status: 'PAID',
          paidAt: expect.any(Date),
          reference: reference,
        })
        expect(result).toMatchObject({
          success: true,
          status: 'PAID',
          transactionUuid: 'tx-uuid-001',
        })
      })

    })
  })
})
