import { ProcessPaystackSavingsWebhookUseCase } from '@application/use-cases/rent-savings/process-paystack-savings-webhook.use-case'
import { IRentVaultRepository } from '@domains/rent-savings/rent-vault.repository'
import { AssetManagementProviderRegistry } from '../../../../../src/infrastructure/providers/asset-management/asset-management-provider.registry'
import { IAssetManagementProvider } from '@domains/rent-savings/asset-management.provider'

describe('ProcessPaystackSavingsWebhookUseCase', () => {
  let useCase: ProcessPaystackSavingsWebhookUseCase
  let rentVaultRepo: jest.Mocked<IRentVaultRepository>
  let providerRegistry: jest.Mocked<AssetManagementProviderRegistry>
  let mockArmProvider: jest.Mocked<IAssetManagementProvider>
  let configService: any

  const mockVault = {
    id: 1,
    uuid: 'vault-uuid-001',
    userId: 10,
    targetAmountKobo: 240000000n,
    currentPrincipalKobo: 0n,
    accruedYieldKobo: 0n,
    cadence: 'MONTHLY' as const,
    contractualDueDate: new Date(),
    unlockDate: new Date(),
    lockStatus: 'LOCKED' as const,
    preferredFundingMethod: 'DVA' as const,
    dvaAccountNumber: '9012345678',
    dvaAssignmentStatus: 'ACTIVE',
    autoBypassPmApproval: true,
    investmentProvider: 'ARM',
    providerMembershipId: 'ARM-MEM-555',
    providerAccountNumber: 'ARM-CRM-444',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    rentVaultRepo = {
      findTransactionByReference: jest.fn().mockResolvedValue(null),
      findByUuid: jest.fn().mockResolvedValue(mockVault),
      findByDvaAccountNumber: jest.fn().mockResolvedValue(mockVault),
      createTransaction: jest.fn().mockResolvedValue({} as any),
      incrementBalances: jest.fn().mockResolvedValue({} as any),
      update: jest.fn().mockResolvedValue({} as any),
      findSavingsScoreByVaultId: jest.fn().mockResolvedValue(null),
      upsertSavingsScore: jest.fn().mockResolvedValue({} as any),
    } as any

    mockArmProvider = {
      providerName: 'ARM',
      getYieldMetrics: jest.fn(),
      subscribe: jest.fn().mockResolvedValue({
        success: true,
        purchaseId: 'ARM-PURCH-111',
      }),
      redeem: jest.fn(),
      getPortfolio: jest.fn(),
    }

    providerRegistry = {
      getProvider: jest.fn().mockReturnValue(mockArmProvider),
    } as any

    configService = {
      get: jest.fn().mockReturnValue('sk_test_paystack_secret'),
    }

    useCase = new ProcessPaystackSavingsWebhookUseCase(
      configService,
      rentVaultRepo,
      providerRegistry,
    )
  })

  it('should ignore non-charge.success events', async () => {
    const result = await useCase.execute({
      event: 'subscription.create',
      data: {
        reference: 'ref_123',
        amount: 5000000,
        currency: 'NGN',
      },
    })

    expect(result.status).toBe('ignored')
  })

  it('should process DVA deposit, credit principal balance, and trigger ARM sweep', async () => {
    const result = await useCase.execute({
      event: 'charge.success',
      data: {
        reference: 'dva_tx_999',
        amount: 20000000, // ₦200,000 in kobo
        currency: 'NGN',
        channel: 'dedicated_nuban',
        metadata: {
          vault_id: 'vault-uuid-001',
        },
      },
    })

    expect(result.status).toBe('success')
    expect(result.amount_kobo).toBe(20000000)

    // Ledger transaction created
    expect(rentVaultRepo.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        vaultId: 1,
        type: 'DEPOSIT',
        amountKobo: 20000000n,
        principalDeltaKobo: 20000000n,
      }),
    )

    // Balances incremented
    expect(rentVaultRepo.incrementBalances).toHaveBeenCalledWith(1, 20000000n, 0n)

    // ARM bulk investment purchase dispatched
    expect(mockArmProvider.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: 'ARM-MEM-555',
        productCode: 'ARMMMF',
        amountKobo: 20000000n,
        reference: 'ARM_dva_tx_999',
      }),
    )

    // Purchase ID persisted to vault record
    expect(rentVaultRepo.update).toHaveBeenCalledWith(1, {
      armPurchaseId: 'ARM-PURCH-111',
    })
  })

  it('should prevent double processing if reference already processed (idempotency)', async () => {
    rentVaultRepo.findTransactionByReference.mockResolvedValueOnce({
      id: 88,
      reference: 'dva_tx_999',
    } as any)

    const result = await useCase.execute({
      event: 'charge.success',
      data: {
        reference: 'dva_tx_999',
        amount: 20000000,
        currency: 'NGN',
      },
    })

    expect(result.status).toBe('already_processed')
    expect(rentVaultRepo.incrementBalances).not.toHaveBeenCalled()
  })
})
