import {
  GetSettlementStatsUseCase,
  GetFlaggedSettlementsUseCase,
  GetSettlementBatchesUseCase,
  GetSettlementTransactionsUseCase,
  ResolveFlaggedSettlementUseCase,
} from '../../../../../src/application/use-cases/admin/admin-settlements.use-cases';

describe('Admin Settlements Use Cases', () => {
  let mockPrisma: any;
  let mockEncryption: any;

  beforeEach(() => {
    mockPrisma = {
      upward_transaction: {
        aggregate: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      upward_settlement_batch: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      upward_manual_account: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      upward_payment_request: {
        update: jest.fn(),
      },
    };

    mockEncryption = {
      decrypt: jest.fn((val: string) => val.replace('enc:', '')),
      encrypt: jest.fn((val: string) => `enc:${val}`),
    };
  });

  describe('GetSettlementStatsUseCase', () => {
    it('should calculate stats accurately including flagged unrouted transactions', async () => {
      mockPrisma.upward_transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000000 } }) // settled
        .mockResolvedValueOnce({ _sum: { amount: 200000 } }); // verified

      mockPrisma.upward_transaction.count.mockResolvedValueOnce(45);
      mockPrisma.upward_settlement_batch.count.mockResolvedValueOnce(12);
      mockPrisma.upward_settlement_batch.findFirst.mockResolvedValueOnce({
        id: 12,
        uuid: 'batch-uuid-12',
        totalAmount: 200,
        status: 'COMPLETED',
        transferReference: 'TRF_123',
        createdAt: new Date(),
      });

      // 2 verified txs: 1 with valid destination, 1 with none (flagged)
      mockPrisma.upward_transaction.findMany.mockResolvedValueOnce([
        {
          id: 1,
          paymentRequest: {
            manualAccount: {
              accountNumber: '8124618329',
              bankCode: '999991',
            },
          },
        },
        {
          id: 2,
          paymentRequest: {
            manualAccount: null,
            subaccount: null,
          },
        },
      ]);

      const useCase = new GetSettlementStatsUseCase(mockPrisma);
      const result = await useCase.execute();

      expect(result.totalSettledVolume).toBe(5000000);
      expect(result.pendingSettlementVolume).toBe(200000);
      expect(result.settledTransactionsCount).toBe(45);
      expect(result.flaggedCount).toBe(1);
      expect(result.totalBatches).toBe(12);
      expect(result.lastBatch?.transferReference).toBe('TRF_123');
    });
  });

  describe('GetFlaggedSettlementsUseCase', () => {
    it('should return transactions that lack a valid destination', async () => {
      mockPrisma.upward_transaction.findMany.mockResolvedValueOnce([
        {
          id: 99,
          uuid: 'tx-uuid-99',
          reference: 'TX_REF_99',
          amount: 150000,
          settlementStatus: 'VERIFIED',
          status: 'SUCCESS',
          createdAt: new Date(),
          propertyAddress: '123 Test Street',
          user: {
            id: 10,
            firstName: 'enc:John',
            lastName: 'enc:Doe',
            email: 'enc:john@example.com',
            phone: 'enc:08012345678',
          },
          paymentRequest: {
            id: 42,
            manualAccount: null,
            subaccount: null,
            userProperty: {
              manualAccount: {
                id: 5,
                accountName: 'enc:Landlord Acct',
                accountNumber: 'enc:1234567890',
                bankName: 'Access Bank',
                bankCode: '044',
              },
            },
          },
        },
      ]);

      mockPrisma.upward_manual_account.findMany.mockResolvedValueOnce([
        {
          id: 5,
          accountName: 'enc:Landlord Acct',
          accountNumber: 'enc:1234567890',
          bankName: 'Access Bank',
          bankCode: '044',
          pm: { firstName: 'enc:Agent', lastName: 'enc:Smith' },
        },
      ]);

      const useCase = new GetFlaggedSettlementsUseCase(mockPrisma, mockEncryption);
      const result = await useCase.execute();

      expect(result.count).toBe(1);
      expect(result.flagged[0].reference).toBe('TX_REF_99');
      expect(result.flagged[0].tenant.firstName).toBe('John');
      expect(result.flagged[0].availableAccounts.length).toBe(1);
      expect(result.flagged[0].availableAccounts[0].accountNumber).toBe('1234567890');
    });
  });

  describe('ResolveFlaggedSettlementUseCase', () => {
    it('should bind manual account to payment request when BIND_MANUAL_ACCOUNT is requested', async () => {
      mockPrisma.upward_manual_account.findUnique.mockResolvedValueOnce({
        id: 7,
        accountNumber: '8124618329',
        bankCode: '999991',
      });
      mockPrisma.upward_transaction.findUnique.mockResolvedValueOnce({
        id: 101,
        paymentRequestId: 55,
      });
      mockPrisma.upward_payment_request.update.mockResolvedValueOnce({
        id: 55,
        manualAccountId: 7,
      });

      const useCase = new ResolveFlaggedSettlementUseCase(mockPrisma);
      const result = await useCase.execute({
        transactionId: 101,
        manualAccountId: 7,
        action: 'BIND_MANUAL_ACCOUNT',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.upward_payment_request.update).toHaveBeenCalledWith({
        where: { id: 55 },
        data: { manualAccountId: 7 },
      });
    });

    it('should mark transaction as manually settled with narration note', async () => {
      mockPrisma.upward_transaction.findUnique.mockResolvedValueOnce({
        id: 202,
        reference: 'TX_REF_MANUAL',
        narration: 'Rent payment',
      });
      mockPrisma.upward_transaction.update.mockResolvedValueOnce({
        id: 202,
        settlementStatus: 'SETTLED',
      });

      const useCase = new ResolveFlaggedSettlementUseCase(mockPrisma);
      const result = await useCase.execute({
        transactionId: 202,
        action: 'MARK_MANUALLY_SETTLED',
        note: 'Paid via direct bank transfer by PM request',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.upward_transaction.update).toHaveBeenCalledWith({
        where: { id: 202 },
        data: {
          settlementStatus: 'SETTLED',
          narration: 'Rent payment [MANUAL_SETTLED: Paid via direct bank transfer by PM request]',
        },
      });
    });
  });
});
