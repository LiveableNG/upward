import { DistributePaymentAllocationsUseCase } from '@application/use-cases/payments/distribute-allocations.use-case';
import { IPaymentLineItemRepository, ITransactionRepository } from '@domains/payments/payment.repository';
import { PaymentConfigurationService } from '@shared/infrastructure/common/payment-config.service';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';

describe('DistributePaymentAllocationsUseCase', () => {
  let useCase: DistributePaymentAllocationsUseCase;
  let lineItemRepo: jest.Mocked<IPaymentLineItemRepository>;
  let txRepo: jest.Mocked<ITransactionRepository>;
  let paymentConfig: jest.Mocked<PaymentConfigurationService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    lineItemRepo = {
      findByPaymentRequestId: jest.fn(),
      update: jest.fn(),
    } as any;

    txRepo = {
      update: jest.fn(),
    } as any;

    paymentConfig = {
      getDynamicProcessingRates: jest.fn(),
    } as any;

    prisma = {
      upward_payment_request: {
        findUnique: jest.fn(),
      },
    } as any;

    useCase = new DistributePaymentAllocationsUseCase(
      lineItemRepo,
      txRepo,
      paymentConfig,
      prisma
    );
  });

  describe('execute', () => {
    it('should deduct transaction fee first and allocate remaining to unpaid items proportionally', async () => {
      const mockLineItems = [
        { id: 1, name: 'Rent', totalAmount: 100000, amountPaid: 0, sortOrder: 1 },
        { id: 2, name: 'Service Charge', totalAmount: 20000, amountPaid: 0, sortOrder: 2 },
      ];

      lineItemRepo.findByPaymentRequestId.mockResolvedValue(mockLineItems as any);
      (prisma.upward_payment_request.findUnique as jest.Mock).mockResolvedValue({ id: 10, userId: 1, userPropertyId: 2 } as any);
      paymentConfig.getDynamicProcessingRates.mockResolvedValue({
        transactionFee: 450,
        benefitsFee: 0,
        rentValue: 100000,
      } as any);

      const result = await useCase.execute({
        transactionId: 100,
        paymentRequestId: 10,
        amount: 60450, // 450 fee + 60,000 to be split proportionally
        upwardFeeAmount: 450,
      });

      // 450 goes to fee first, remaining 60,000 split proportionally:
      // Rent needs 100,000 (gets 50,000)
      // Service Charge needs 20,000 (gets 10,000)
      expect(lineItemRepo.update).toHaveBeenCalledWith(1, { amountPaid: 50000, status: 'PARTIAL' }, undefined);
      expect(lineItemRepo.update).toHaveBeenCalledWith(2, { amountPaid: 10000, status: 'PARTIAL' }, undefined);

      expect(result.rentPortion).toBe(50000);
      expect(result.allocatedItems).toContainEqual({
        name: 'Transaction Fee',
        label: 'Transaction Fee',
        amount: 450,
        category: 'Fee',
      });
      expect(result.allocatedItems).toContainEqual({
        name: 'Rent',
        label: 'Rent',
        amount: 50000,
        category: 'Package',
      });
      expect(result.allocatedItems).toContainEqual({
        name: 'Service Charge',
        label: 'Service Charge',
        amount: 10000,
        category: 'Package',
      });
    });

    it('should allocate using sequential fill when sequentialFill flag is true', async () => {
      const mockLineItems = [
        { id: 1, name: 'Rent', totalAmount: 100000, amountPaid: 0, sortOrder: 1 },
        { id: 2, name: 'Service Charge', totalAmount: 20000, amountPaid: 0, sortOrder: 2 },
      ];

      lineItemRepo.findByPaymentRequestId.mockResolvedValue(mockLineItems as any);

      const result = await useCase.execute({
        transactionId: 100,
        paymentRequestId: 10,
        amount: 50000,
        upwardFeeAmount: 0,
        sequentialFill: true,
      });

      // Sequential fill pays items in sortOrder one at a time:
      // Rent gets full 50,000. Service Charge gets 0.
      expect(lineItemRepo.update).toHaveBeenCalledWith(1, { amountPaid: 50000, status: 'PARTIAL' }, undefined);
      expect(lineItemRepo.update).not.toHaveBeenCalledWith(2, expect.any(Object), undefined);

      expect(result.rentPortion).toBe(50000);
      expect(result.allocatedItems).toContainEqual({
        name: 'Rent',
        label: 'Rent',
        amount: 50000,
        category: 'Package',
      });
    });

    it('should assign remaining balance as Excess / Future Credit when there is an overpayment', async () => {
      const mockLineItems = [
        { id: 1, name: 'Rent', totalAmount: 50000, amountPaid: 0, sortOrder: 1 },
      ];

      lineItemRepo.findByPaymentRequestId.mockResolvedValue(mockLineItems as any);

      const result = await useCase.execute({
        transactionId: 100,
        paymentRequestId: 10,
        amount: 65000,
        upwardFeeAmount: 0,
      });

      // Rent gets 50,000 (fully paid). Remaining 15,000 goes to Excess / Future Credit.
      expect(lineItemRepo.update).toHaveBeenCalledWith(1, { amountPaid: 50000, status: 'PAID' }, undefined);
      expect(result.allocatedItems).toContainEqual({
        name: 'Rent',
        label: 'Rent',
        amount: 50000,
        category: 'Package',
      });
      expect(result.allocatedItems).toContainEqual({
        name: 'Excess / Future Credit',
        label: 'Excess / Future Credit',
        amount: 15000,
        category: 'Overpayment',
      });
    });
  });
});
