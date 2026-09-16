import { ProcessHourlySettlementsUseCase } from '@application/use-cases/payments/settlement-cron.use-case';
import { IPaymentGateway } from '@domains/payments/payment.repository';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentConfigurationService } from '@shared/infrastructure/common/payment-config.service';
import { EncryptionService } from '@shared/infrastructure/common/encryption.service';

describe('ProcessHourlySettlementsUseCase', () => {
  let useCase: ProcessHourlySettlementsUseCase;
  let prisma: jest.Mocked<PrismaService>;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let configService: jest.Mocked<ConfigService>;
  let paymentConfig: jest.Mocked<PaymentConfigurationService>;
  let encryption: EncryptionService;

  beforeEach(() => {
    encryption = new EncryptionService();

    prisma = {
      upward_transaction: {
        findMany: jest.fn().mockImplementation(async (args) => {
          if (args?.where?.settlementStatus === 'FLAGGED_REFUND') {
            return [];
          }
          return [];
        }),
        updateMany: jest.fn().mockImplementation(async (args) => {
          const ids = args?.where?.id?.in || [args?.where?.id];
          return { count: ids ? ids.length : 1 };
        }),
      },
      upward_settlement_batch: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 100,
          uuid: 'batch-uuid-100',
          ...data,
        })),
        update: jest.fn().mockResolvedValue({ id: 100, status: 'COMPLETED' }),
      },
      upward_refund_log: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    paymentGateway = {
      initiateTransfer: jest.fn().mockResolvedValue({ status: true, data: { transfer_code: 'TRF_123' } }),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue(''),
    } as any;

    paymentConfig = {
      getProcessingFee: jest.fn().mockReturnValue(0),
    } as any;

    useCase = new ProcessHourlySettlementsUseCase(
      prisma,
      paymentGateway,
      configService,
      paymentConfig,
      encryption,
    );
  });

  describe('resolveSettlementDestination', () => {
    it('resolves primary manualAccount bound to payment request', () => {
      const tx = {
        id: 1,
        reference: 'TX_REF_1',
        paymentRequest: {
          id: 10,
          manualAccount: {
            id: 14,
            accountNumber: '8124618329',
            bankCode: '999991',
            accountName: 'Abdulsalam Ayeleru',
          },
        },
      };

      const result = useCase.resolveSettlementDestination(tx);
      expect(result).toEqual({
        key: '999991:8124618329',
        accountNumber: '8124618329',
        bankCode: '999991',
        accountName: 'Abdulsalam Ayeleru',
        sourceType: 'MANUAL_ACCOUNT',
        sourceId: 14,
      });
    });

    it('resolves legacy subaccount bound to payment request when manualAccount is absent', () => {
      const tx = {
        id: 2,
        reference: 'TX_REF_2',
        paymentRequest: {
          id: 20,
          subaccount: {
            id: 5,
            accountNumber: '1007284389',
            bankCode: '082',
            subaccountCode: 'ACCT_legacy123',
            businessName: 'Osunsina Desiree',
          },
        },
      };

      const result = useCase.resolveSettlementDestination(tx);
      expect(result).toEqual({
        key: '082:1007284389',
        accountNumber: '1007284389',
        bankCode: '082',
        accountName: 'Osunsina Desiree',
        sourceType: 'SUBACCOUNT',
        sourceId: 5,
      });
    });

    it('prefers manualAccount over legacy subaccount when both are present', () => {
      const tx = {
        id: 3,
        reference: 'TX_REF_3',
        paymentRequest: {
          id: 30,
          manualAccount: {
            id: 14,
            accountNumber: '8124618329',
            bankCode: '999991',
            accountName: 'Canonical Account',
          },
          subaccount: {
            id: 5,
            accountNumber: '9999999999',
            bankCode: '058',
            subaccountCode: 'ACCT_legacy',
            businessName: 'Old Subaccount',
          },
        },
      };

      const result = useCase.resolveSettlementDestination(tx);
      expect(result?.sourceType).toBe('MANUAL_ACCOUNT');
      expect(result?.accountNumber).toBe('8124618329');
      expect(result?.bankCode).toBe('999991');
    });

    it('returns null and does not guess current property account when destination is missing', () => {
      const tx = {
        id: 4,
        reference: 'TX_REF_4',
        paymentRequest: {
          id: 40,
          manualAccount: null,
          subaccount: null,
          userProperty: {
            manualAccountId: 999,
            manualAccount: {
              accountNumber: '9999999999',
              bankCode: '044',
            },
          },
        },
      };

      const result = useCase.resolveSettlementDestination(tx);
      expect(result).toBeNull();
    });
  });

  describe('execute (Settlement Processing)', () => {
    it('Scenario 1: Payment created under Account A settles to Account A even if property later changed to Account B', async () => {
      // Payment Request was created under Account A (082:1111111111)
      const txA = {
        id: 101,
        reference: 'TX_BOUND_A',
        amount: 50000,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 1,
        lineItems: [{ name: 'Rent', amount: 50000 }],
        paymentRequest: {
          id: 1,
          manualAccount: {
            id: 1,
            accountNumber: '1111111111',
            bankCode: '082',
            accountName: 'Landlord Account A',
          },
          userProperty: {
            // Property has now been reassigned to Account B!
            manualAccountId: 2,
            pmUnit: { unitName: 'Unit 1A' },
          },
        },
        user: { firstName: 'John', lastName: 'Doe' },
      };

      (prisma.upward_transaction.findMany as jest.Mock).mockImplementation(async (args) => {
        if (args?.where?.settlementStatus === 'VERIFIED') return [txA];
        return [];
      });

      await useCase.execute();

      expect(paymentGateway.initiateTransfer).toHaveBeenCalledTimes(1);
      expect(paymentGateway.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          accountNumber: '1111111111',
          bankCode: '082',
          amount: 50000,
        }),
      );
    });

    it('Scenario 2: Payment created after property changed to Account B settles to Account B', async () => {
      // Payment Request was created after property change and bound to Account B (044:2222222222)
      const txB = {
        id: 102,
        reference: 'TX_BOUND_B',
        amount: 75000,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 2,
        lineItems: [{ name: 'Rent', amount: 75000 }],
        paymentRequest: {
          id: 2,
          manualAccount: {
            id: 2,
            accountNumber: '2222222222',
            bankCode: '044',
            accountName: 'Landlord Account B',
          },
          userProperty: {
            manualAccountId: 2,
            pmUnit: { unitName: 'Unit 1A' },
          },
        },
        user: { firstName: 'Jane', lastName: 'Smith' },
      };

      (prisma.upward_transaction.findMany as jest.Mock).mockImplementation(async (args) => {
        if (args?.where?.settlementStatus === 'VERIFIED') return [txB];
        return [];
      });

      await useCase.execute();

      expect(paymentGateway.initiateTransfer).toHaveBeenCalledTimes(1);
      expect(paymentGateway.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          accountNumber: '2222222222',
          bankCode: '044',
          amount: 75000,
        }),
      );
    });

    it('Scenario 3: Legacy Paystack subaccount settlement still works seamlessly', async () => {
      const txLegacy = {
        id: 103,
        reference: 'TX_LEGACY',
        amount: 100000,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 3,
        lineItems: [{ name: 'Rent', amount: 100000 }],
        paymentRequest: {
          id: 3,
          subaccount: {
            id: 10,
            accountNumber: '3333333333',
            bankCode: '058',
            subaccountCode: 'ACCT_legacy_sub',
            businessName: 'Legacy Landlord',
          },
          userProperty: { pmUnit: null },
        },
        user: { firstName: 'Sam', lastName: 'Legacy' },
      };

      (prisma.upward_transaction.findMany as jest.Mock).mockImplementation(async (args) => {
        if (args?.where?.settlementStatus === 'VERIFIED') return [txLegacy];
        return [];
      });

      await useCase.execute();

      expect(paymentGateway.initiateTransfer).toHaveBeenCalledTimes(1);
      expect(paymentGateway.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          accountNumber: '3333333333',
          bankCode: '058',
          amount: 100000,
        }),
      );
    });

    it('Scenario 4: Verified payment with valid settlement destination is NEVER skipped merely because subaccountId is null', async () => {
      const txManualOnly = {
        id: 104,
        reference: 'TX_MANUAL_NO_SUB',
        amount: 200,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 96,
        lineItems: [{ name: 'Rent', amount: 200 }],
        paymentRequest: {
          id: 96,
          subaccountId: null,
          subaccount: null,
          manualAccount: {
            id: 14,
            accountNumber: '8124618329',
            bankCode: '999991',
            accountName: 'Abdulsalam Ayeleru',
          },
          userProperty: null,
        },
        user: { firstName: 'Abdulsalam', lastName: 'Ayeleru' },
      };

      (prisma.upward_transaction.findMany as jest.Mock).mockImplementation(async (args) => {
        if (args?.where?.settlementStatus === 'VERIFIED') return [txManualOnly];
        return [];
      });

      await useCase.execute();

      expect(paymentGateway.initiateTransfer).toHaveBeenCalledTimes(1);
      expect(paymentGateway.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          accountNumber: '8124618329',
          bankCode: '999991',
          amount: 200,
        }),
      );
    });

    it('Scenario 5: Genuinely missing settlement destination is explicitly flagged rather than silently skipped', async () => {
      const txMissing = {
        id: 105,
        reference: 'TX_GENUINELY_MISSING',
        amount: 500,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 50,
        paymentRequest: {
          id: 50,
          manualAccount: null,
          subaccount: null,
        },
        user: { firstName: 'Orphan', lastName: 'User' },
      };

      (prisma.upward_transaction.findMany as jest.Mock).mockImplementation(async (args) => {
        if (args?.where?.settlementStatus === 'VERIFIED') return [txMissing];
        return [];
      });

      await useCase.execute();

      // Ensure no transfer was initiated for this unroutable transaction
      expect(paymentGateway.initiateTransfer).not.toHaveBeenCalled();
      // Ensure transactions were NOT modified to SETTLED
      expect(prisma.upward_transaction.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [105] } },
          data: { settlementStatus: 'SETTLED' },
        }),
      );
    });

    it('Scenario 6: Bundling multiple payments by destination key (bankCode:accountNumber)', async () => {
      const tx1 = {
        id: 201,
        reference: 'TX_BUNDLE_1',
        amount: 10000,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 10,
        lineItems: [{ name: 'Rent', amount: 10000 }],
        paymentRequest: {
          id: 10,
          manualAccount: {
            id: 14,
            accountNumber: '8124618329',
            bankCode: '999991',
          },
        },
      };

      const tx2 = {
        id: 202,
        reference: 'TX_BUNDLE_2',
        amount: 15000,
        status: 'SUCCESS',
        settlementStatus: 'VERIFIED',
        paymentRequestId: 11,
        lineItems: [{ name: 'Rent', amount: 15000 }],
        paymentRequest: {
          id: 11,
          manualAccount: {
            id: 14,
            accountNumber: '8124618329',
            bankCode: '999991',
          },
        },
      };

      (prisma.upward_transaction.findMany as jest.Mock).mockImplementation(async (args) => {
        if (args?.where?.settlementStatus === 'VERIFIED') return [tx1, tx2];
        return [];
      });

      await useCase.execute();

      // Should bundle both transactions into 1 transfer of 25,000 to 8124618329
      expect(paymentGateway.initiateTransfer).toHaveBeenCalledTimes(1);
      expect(paymentGateway.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          accountNumber: '8124618329',
          bankCode: '999991',
          amount: 25000,
        }),
      );
    });
  });
});
