import { BadRequestException } from '@nestjs/common'
import { ExecuteLandlordSettlementUseCase } from '@application/use-cases/rent-savings/execute-landlord-settlement.use-case'
import { IRentVaultRepository } from '@domains/rent-savings/rent-vault.repository'
import { IRentAdvanceRepository } from '@domains/rent-savings/rent-advance.repository'
import { IRentSettlementRepository } from '@domains/rent-savings/rent-settlement.repository'
import { AssetManagementProviderRegistry } from '../../../../../src/infrastructure/providers/asset-management/asset-management-provider.registry'
import { IAssetManagementProvider } from '@domains/rent-savings/asset-management.provider'

describe('ExecuteLandlordSettlementUseCase', () => {
  let useCase: ExecuteLandlordSettlementUseCase
  let rentVaultRepo: jest.Mocked<IRentVaultRepository>
  let rentAdvanceRepo: jest.Mocked<IRentAdvanceRepository>
  let rentSettlementRepo: jest.Mocked<IRentSettlementRepository>
  let providerRegistry: jest.Mocked<AssetManagementProviderRegistry>
  let mockArmProvider: jest.Mocked<IAssetManagementProvider>

  // Vault mature within 30 days
  const now = new Date()
  const matureDueDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days ahead (within T-30)

  const mockVault = {
    id: 1,
    uuid: 'vault-uuid-001',
    userId: 10,
    targetAmountKobo: 240000000n,
    currentPrincipalKobo: 240000000n,
    accruedYieldKobo: 12000000n, // ₦120,000 yield
    cadence: 'MONTHLY' as const,
    contractualDueDate: matureDueDate,
    unlockDate: new Date(matureDueDate.getTime() - 30 * 24 * 60 * 60 * 1000),
    lockStatus: 'LOCKED' as const,
    preferredFundingMethod: 'DVA' as const,
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
      findByUuid: jest.fn().mockResolvedValue(mockVault),
      createTransaction: jest.fn().mockResolvedValue({} as any),
      update: jest.fn().mockResolvedValue({} as any),
      findSavingsScoreByVaultId: jest.fn().mockResolvedValue({ totalScore: 85 } as any),
      upsertSavingsScore: jest.fn().mockResolvedValue({} as any),
    } as any

    rentAdvanceRepo = {
      findActiveByVaultId: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({} as any),
    } as any

    rentSettlementRepo = {
      create: jest.fn().mockResolvedValue({
        id: 1,
        uuid: 'settlement-uuid',
      } as any),
    } as any

    mockArmProvider = {
      providerName: 'ARM',
      getYieldMetrics: jest.fn(),
      subscribe: jest.fn(),
      redeem: jest.fn().mockResolvedValue({
        success: true,
        withdrawalId: 'ARM-WITHDRAWAL-777',
      }),
      getPortfolio: jest.fn(),
    }

    providerRegistry = {
      getProvider: jest.fn().mockReturnValue(mockArmProvider),
    } as any

    useCase = new ExecuteLandlordSettlementUseCase(
      rentVaultRepo,
      rentAdvanceRepo,
      rentSettlementRepo,
      providerRegistry,
    )
  })

  it('should reject settlement if vault is still locked outside T-30 days window', async () => {
    // Due date 60 days in future (outside 30-day window)
    const farFutureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    rentVaultRepo.findByUuid.mockResolvedValueOnce({
      ...mockVault,
      contractualDueDate: farFutureDate,
      unlockDate: new Date(farFutureDate.getTime() - 30 * 24 * 60 * 60 * 1000),
    })

    await expect(
      useCase.execute(10, 'vault-uuid-001', {
        landlord_bank_code: '058',
        landlord_account_number: '0123456789',
        landlord_name: 'Chief Adebayo',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should redeem from ARM, disburse payout, credit cashback, and mark vault settled', async () => {
    const result = await useCase.execute(10, 'vault-uuid-001', {
      landlord_bank_code: '058',
      landlord_account_number: '0123456789',
      landlord_name: 'Chief Adebayo',
      property_address: '15 Admiralty Way, Lekki Phase 1',
    })

    expect(result.status).toBe('success')
    expect(result.data.amount_paid_to_landlord_kobo).toBe(252000000) // 2.4M principal + 120k yield
    expect(result.data.settlement_status).toBe('PAID')

    // ARM redemption called for total accumulated balance
    expect(mockArmProvider.redeem).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: 'ARM-MEM-555',
        productAccountNumber: 'ARM-CRM-444',
        amountKobo: 252000000n,
      }),
    )

    // Settlement created
    expect(rentSettlementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        landlordName: 'Chief Adebayo',
        amountPaidToLandlordKobo: 252000000n,
        settlementStatus: 'PAID',
      }),
    )

    // Vault updated with zero balances and armWithdrawalId
    expect(rentVaultRepo.update).toHaveBeenCalledWith(1, {
      lockStatus: 'SETTLED',
      currentPrincipalKobo: 0n,
      accruedYieldKobo: 0n,
      armWithdrawalId: 'ARM-WITHDRAWAL-777',
    })
  })
})
