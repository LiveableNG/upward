import { RecordTransactionUseCase } from '@application/use-cases/payments/payment.use-cases';
import { ITransactionRepository, IPaymentRequestRepository, IOverpaymentRepository } from '@domains/payments/payment.repository';
import { EventBus } from '@application/events/domain-event';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { VerifyGatewayTransactionUseCase } from '@application/use-cases/payments/verify-transaction.use-case';
import { DistributePaymentAllocationsUseCase } from '@application/use-cases/payments/distribute-allocations.use-case';
import { ActivateBenefitsSubscriptionUseCase } from '@application/use-cases/payments/benefits-subscription.use-cases';
import { SyncPmPaymentStatusUseCase } from '@application/use-cases/payments/sync-pm-status.use-case';
import { SettlePropertyBalanceUseCase } from '@application/use-cases/payments/settle-property.use-case';
import { HandlePaymentOverpaymentUseCase } from '@application/use-cases/payments/handle-overpayment.use-case';
import { PaymentConfigurationService } from '@shared/infrastructure/common/payment-config.service';
import { UnauthorizedException } from '@nestjs/common';

describe('RecordTransactionUseCase', () => {
  let useCase: RecordTransactionUseCase;
  let txRepo: jest.Mocked<ITransactionRepository>;
  let paymentRequestRepo: jest.Mocked<IPaymentRequestRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let prisma: jest.Mocked<PrismaService>;
  let verifyTransaction: jest.Mocked<VerifyGatewayTransactionUseCase>;
  let distributeAllocations: jest.Mocked<DistributePaymentAllocationsUseCase>;
  let activateBenefits: jest.Mocked<ActivateBenefitsSubscriptionUseCase>;
  let syncPmStatus: jest.Mocked<SyncPmPaymentStatusUseCase>;
  let settleProperty: jest.Mocked<SettlePropertyBalanceUseCase>;
  let handleOverpayment: jest.Mocked<HandlePaymentOverpaymentUseCase>;
  let overpaymentRepo: jest.Mocked<IOverpaymentRepository>;
  let paymentConfig: jest.Mocked<PaymentConfigurationService>;

  beforeEach(() => {
    txRepo = {
      create: jest.fn(),
      update: jest.fn(),
    } as any;

    paymentRequestRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as any;

    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
      upward_user_property: {
        findUnique: jest.fn(),
      },
      upward_payment_line_item: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      upward_refund_log: {
        create: jest.fn(),
      },
    } as any;

    verifyTransaction = {
      execute: jest.fn(),
    } as any;

    distributeAllocations = {
      execute: jest.fn(),
    } as any;

    activateBenefits = {
      execute: jest.fn(),
    } as any;

    syncPmStatus = {
      execute: jest.fn(),
      executeForProperty: jest.fn(),
    } as any;

    settleProperty = {
      execute: jest.fn(),
    } as any;

    handleOverpayment = {
      execute: jest.fn(),
    } as any;

    overpaymentRepo = {
      create: jest.fn(),
    } as any;

    paymentConfig = {
      getDynamicProcessingRates: jest.fn(),
    } as any;

    useCase = new RecordTransactionUseCase(
      txRepo,
      paymentRequestRepo,
      eventBus,
      prisma,
      verifyTransaction,
      distributeAllocations,
      activateBenefits,
      syncPmStatus,
      settleProperty,
      handleOverpayment,
      overpaymentRepo,
      paymentConfig
    );
  });

  describe('execute', () => {
    it('should return existing transaction if already recorded', async () => {
      const mockTx = { id: 1, reference: 'tx-ref-111', status: 'SUCCESS' };
      verifyTransaction.execute.mockResolvedValue({
        isVerified: true,
        isNew: false,
        existing: mockTx as any,
        user: { id: 1 } as any,
      });

      const result = await useCase.execute({
        userId: 'user-uuid',
        reference: 'tx-ref-111',
        amount: 50000,
        currency: 'NGN',
        status: 'SUCCESS',
        type: 'PAYMENT',
      });

      expect(result).toBe(mockTx);
      expect(txRepo.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if transaction is verified but user context is missing', async () => {
      verifyTransaction.execute.mockResolvedValue({
        isVerified: true,
        isNew: true,
        user: null as any,
      });

      await expect(
        useCase.execute({
          userId: 'user-uuid',
          reference: 'tx-ref-111',
          amount: 50000,
          currency: 'NGN',
          status: 'SUCCESS',
          type: 'PAYMENT',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should flag transaction for refund if payment is less than expectedTotal and allowPartial is false', async () => {
      verifyTransaction.execute.mockResolvedValue({
        isVerified: true,
        isNew: true,
        user: { id: 1 } as any,
      });

      paymentRequestRepo.findById.mockResolvedValue({
        id: 10,
        userId: 1,
        userPropertyId: 2,
        amount: 100000,
        allowPartial: false,
      } as any);

      paymentConfig.getDynamicProcessingRates.mockResolvedValue({
        transactionFee: 450,
        benefitsFee: 0,
        rentValue: 100000,
      } as any);

      txRepo.create.mockImplementation(async (data: any) => ({
        id: 99,
        ...data,
      }));

      distributeAllocations.execute.mockResolvedValue({
        rentPortion: 0,
        allocatedItems: [],
      } as any);

      const result = await useCase.execute({
        userId: 'user-uuid',
        reference: 'tx-ref-111',
        amount: 90000, // Underpaid
        currency: 'NGN',
        paymentRequestId: 10,
        status: 'SUCCESS',
        type: 'PAYMENT',
      });

      expect(result.settlementStatus).toBe('PENDING_REFUND');
      expect(prisma.upward_refund_log.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionId: 99,
            reason: 'UNDERPAYMENT_VIOLATION',
            status: 'FLAGGED',
          }),
        })
      );
    });
  });
});
