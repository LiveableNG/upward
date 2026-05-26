import { ResolveExternalPendingRefundUseCase, ExternalRefundResolutionAction } from '@application/use-cases/external/resolve-external-refund.use-case'
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common'

describe('ResolveExternalPendingRefundUseCase', () => {
  let useCase: ResolveExternalPendingRefundUseCase
  let prisma: any
  let paymentGateway: any
  let txRepo: any
  let paymentRequestRepo: any
  let paymentConfig: any
  let distributeAllocations: any
  let syncPmStatus: any
  let settleProperty: any
  let handleOverpayment: any

  beforeEach(() => {
    prisma = {
      upward_transaction: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      upward_refund_log: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
      upward_payment_line_item: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }

    paymentGateway = {
      initiateTransfer: jest.fn().mockResolvedValue({ status: true }),
    }

    txRepo = {}
    paymentRequestRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    }

    paymentConfig = {
      getGatewayFee: jest.fn().mockReturnValue(150),
    }

    distributeAllocations = {
      execute: jest.fn().mockResolvedValue({ rentPortion: 1000, allocatedItems: [] }),
    }

    syncPmStatus = {
      execute: jest.fn(),
    }

    settleProperty = {
      execute: jest.fn(),
    }

    handleOverpayment = {
      execute: jest.fn(),
    }

    useCase = new ResolveExternalPendingRefundUseCase(
      prisma,
      paymentGateway,
      txRepo,
      paymentRequestRepo,
      paymentConfig,
      distributeAllocations,
      syncPmStatus,
      settleProperty,
      handleOverpayment,
    )
  })

  it('should throw NotFoundException if transaction does not exist', async () => {
    prisma.upward_transaction.findUnique.mockResolvedValue(null)
    await expect(useCase.execute(77, 'invalid-uuid', ExternalRefundResolutionAction.ACCEPT)).rejects.toThrow(NotFoundException)
  })

  it('should throw UnauthorizedException if transaction does not belong to the platform', async () => {
    prisma.upward_transaction.findUnique.mockResolvedValue({
      uuid: 'tx-uuid-001',
      paymentRequest: { userProperty: { company: { platformId: 88 } } }, // Different platform ID
    })
    await expect(useCase.execute(77, 'tx-uuid-001', ExternalRefundResolutionAction.ACCEPT)).rejects.toThrow(UnauthorizedException)
  })

  it('should throw BadRequestException if transaction is not in PENDING_REFUND status', async () => {
    prisma.upward_transaction.findUnique.mockResolvedValue({
      uuid: 'tx-uuid-001',
      settlementStatus: 'VERIFIED',
      paymentRequest: { userProperty: { company: { platformId: 77 } } },
    })
    await expect(useCase.execute(77, 'tx-uuid-001', ExternalRefundResolutionAction.ACCEPT)).rejects.toThrow(BadRequestException)
  })

  it('should successfully reject/refund the transaction', async () => {
    prisma.upward_transaction.findUnique.mockResolvedValue({
      id: 1,
      uuid: 'tx-uuid-001',
      amount: 10000,
      reference: 'ref-001',
      settlementStatus: 'PENDING_REFUND',
      paymentRequest: { userProperty: { company: { platformId: 77 } } },
      user: {
        bankDetails: {
          accountNumber: '1234567890',
          bankCode: '011',
        },
      },
    })

    const result = await useCase.execute(77, 'tx-uuid-001', ExternalRefundResolutionAction.REJECT)
    expect(result.success).toBe(true)
    expect(paymentGateway.initiateTransfer).toHaveBeenCalled()
  })

  it('should successfully accept the transaction', async () => {
    prisma.upward_transaction.findUnique.mockResolvedValue({
      id: 1,
      uuid: 'tx-uuid-001',
      amount: 10000,
      reference: 'ref-001',
      settlementStatus: 'PENDING_REFUND',
      paymentRequest: { id: 100, userProperty: { company: { platformId: 77 } } },
      user: {
        bankDetails: {
          accountNumber: '1234567890',
          bankCode: '011',
        },
      },
    })

    paymentRequestRepo.findById.mockResolvedValue({
      id: 100,
      amount: 12000,
      status: 'PENDING',
      amountPaid: 0,
      userPropertyId: 2,
    })

    const result = await useCase.execute(77, 'tx-uuid-001', ExternalRefundResolutionAction.ACCEPT)
    expect(result.success).toBe(true)
    expect(prisma.upward_transaction.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { settlementStatus: 'VERIFIED' },
    })
  })
})
