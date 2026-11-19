import { TriggerAutomatedRewardUseCase } from '../../../../../src/application/rewards/use-cases/trigger-automated-reward.use-case'
import { AdminAwardVoucherUseCase } from '../../../../../src/application/rewards/use-cases/admin-award-voucher.use-case'
import { AdminUpdateRewardRuleUseCase } from '../../../../../src/application/rewards/use-cases/admin-update-reward-rule.use-case'
import { GetUserRewardsSummaryUseCase } from '../../../../../src/application/rewards/use-cases/get-user-rewards-summary.use-case'
import { RewardsRepository } from '../../../../../src/domains/rewards/rewards.repository'
import { UserRepository } from '../../../../../src/domains/users/user.repository'

describe('Upward Rewards & Promotional Voucher Use Cases', () => {
  let mockRewardsRepo: jest.Mocked<RewardsRepository>
  let mockUserRepo: jest.Mocked<UserRepository>

  beforeEach(() => {
    mockRewardsRepo = {
      ensureDefaultRulesAndPool: jest.fn(),
      findAllRules: jest.fn(),
      findRuleByTriggerKey: jest.fn(),
      upsertRule: jest.fn(),
      getCashbackPool: jest.fn(),
      topUpCashbackPool: jest.fn(),
      createVoucher: jest.fn(),
      findVoucherByIdempotencyKey: jest.fn(),
      countUserVouchersByTriggerKey: jest.fn(),
      getUserVoucherSummary: jest.fn(),
      getAvailableVoucherBalanceKobo: jest.fn(),
      applyUserVouchersToOrder: jest.fn(),
      attachOrderToAppliedRedemptions: jest.fn(),
      confirmOrderVoucherRedemptions: jest.fn(),
      releaseOrderVoucherRedemptions: jest.fn(),
      releaseUnboundAppliedRedemptionsForUser: jest.fn(),
      awardCashbackToSavingsWallet: jest.fn(),
      findCashbackByIdempotencyKey: jest.fn(),
      countUserCashbackByTriggerKey: jest.fn(),
      getAdminOverview: jest.fn(),
      searchUsersForRewards: jest.fn(),
      listRecentVouchers: jest.fn(),
      listRecentCashbackRewards: jest.fn(),
    }

    mockUserRepo = {
      findByEmail: jest.fn(),
      findByProviderId: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findBySlug: jest.fn(),
      findByPhone: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      updatePmTenantEmail: jest.fn(),
    }
  })

  it('awards a ₦1,000 promotional voucher automatically when a user completes the income information form', async () => {
    const useCase = new TriggerAutomatedRewardUseCase(mockRewardsRepo, mockUserRepo)

    mockRewardsRepo.findRuleByTriggerKey.mockResolvedValue({
      id: 1,
      uuid: 'rule-1',
      triggerKey: 'FORM_INCOME_INFO',
      name: 'Income Information Form',
      description: 'Awarded when user provides income info',
      rewardCategory: 'VOUCHER',
      rewardAmountKobo: 100000n,
      minQualifyingAmountKobo: 0n,
      maxPerUser: 1,
      expiryDays: null,
      campaignTag: null,
      isActive: true,
      updatedByAdminId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockRewardsRepo.countUserVouchersByTriggerKey.mockResolvedValue(0)
    mockRewardsRepo.createVoucher.mockResolvedValue({
      id: 10,
      uuid: 'vch-10',
      code: 'UPW-VCH-202611-A1B2C3',
      userId: 42,
      amountKobo: 100000n,
      redeemedAmountKobo: 0n,
      remainingAmountKobo: 100000n,
      currency: 'NGN',
      status: 'ACTIVE',
      sourceType: 'FORM_COMPLETION',
      triggerKey: 'FORM_INCOME_INFO',
      campaignTag: null,
      reason: 'Income Information Form',
      notes: null,
      awardedByAdminId: null,
      awardedByAdminEmail: null,
      idempotencyKey: 'VCH_42_FORM_INCOME_INFO',
      expiresAt: null,
      redeemedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await useCase.execute({
      userId: 42,
      triggerKey: 'FORM_INCOME_INFO',
    })

    expect(res.awarded).toBe(true)
    expect(res.rewardCategory).toBe('VOUCHER')
    expect(res.voucher?.amountNaira).toBe(1000)
    expect(mockRewardsRepo.createVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        amountKobo: 100000n,
        sourceType: 'FORM_COMPLETION',
        triggerKey: 'FORM_INCOME_INFO',
      }),
    )
  })

  it('prevents duplicate automatic voucher award when maxPerUser is reached', async () => {
    const useCase = new TriggerAutomatedRewardUseCase(mockRewardsRepo, mockUserRepo)

    mockRewardsRepo.findRuleByTriggerKey.mockResolvedValue({
      id: 1,
      uuid: 'rule-1',
      triggerKey: 'FORM_INCOME_INFO',
      name: 'Income Information Form',
      description: null,
      rewardCategory: 'VOUCHER',
      rewardAmountKobo: 100000n,
      minQualifyingAmountKobo: 0n,
      maxPerUser: 1,
      expiryDays: null,
      campaignTag: null,
      isActive: true,
      updatedByAdminId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockRewardsRepo.countUserVouchersByTriggerKey.mockResolvedValue(1)

    const res = await useCase.execute({
      userId: 42,
      triggerKey: 'FORM_INCOME_INFO',
    })

    expect(res.awarded).toBe(false)
    expect(mockRewardsRepo.createVoucher).not.toHaveBeenCalled()
  })

  it('credits real monetary cashback to Savings Wallet when a user saves a qualifying amount (>= ₦2,000)', async () => {
    const useCase = new TriggerAutomatedRewardUseCase(mockRewardsRepo, mockUserRepo)

    mockRewardsRepo.findRuleByTriggerKey.mockResolvedValue({
      id: 7,
      uuid: 'rule-7',
      triggerKey: 'SAVINGS_DEPOSIT_QUALIFYING',
      name: 'Qualifying Savings Deposit Cashback',
      description: null,
      rewardCategory: 'CASHBACK',
      rewardAmountKobo: 50000n, // ₦500 cashback
      minQualifyingAmountKobo: 200000n, // ₦2,000 minimum deposit
      maxPerUser: 5,
      expiryDays: null,
      campaignTag: null,
      isActive: true,
      updatedByAdminId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockRewardsRepo.countUserCashbackByTriggerKey.mockResolvedValue(0)
    mockRewardsRepo.awardCashbackToSavingsWallet.mockResolvedValue({
      id: 1,
      uuid: 'cb-1',
      userId: 42,
      vaultId: 7,
      amountKobo: 50000n,
      currency: 'NGN',
      triggerKey: 'SAVINGS_DEPOSIT_QUALIFYING',
      qualifyingActivityAmountKobo: 300000n, // ₦3,000 saved
      reason: 'Cashback for saving ₦3,000',
      status: 'CREDITED_TO_VAULT',
      awardedByAdminId: null,
      awardedByAdminEmail: null,
      idempotencyKey: 'CB_42_SAVINGS_DEPOSIT_QUALIFYING_tx_1',
      reference: 'UPW_CB_123',
      createdAt: new Date(),
    })

    const res = await useCase.execute({
      userId: 42,
      triggerKey: 'SAVINGS_DEPOSIT_QUALIFYING',
      qualifyingAmountKobo: 300000n, // ₦3,000 saved
      uniqueOccurrenceKey: 'tx_1',
      customReason: 'Cashback for saving ₦3,000',
    })

    expect(res.awarded).toBe(true)
    expect(res.rewardCategory).toBe('CASHBACK')
    expect(res.cashback?.amountNaira).toBe(500)
    expect(mockRewardsRepo.awardCashbackToSavingsWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        amountKobo: 50000n,
        qualifyingActivityAmountKobo: 300000n,
      }),
    )
  })

  it('adds a manual admin voucher award to existing cumulative balance without overwriting previous vouchers', async () => {
    const adminAwardUseCase = new AdminAwardVoucherUseCase(mockRewardsRepo, mockUserRepo)

    mockUserRepo.findByUuid.mockResolvedValue({
      id: 42,
      uuid: 'user-uuid-42',
      email: 'tenant@goodtenants.io',
      emailHash: 'hash',
      firstName: 'Ada',
      firstNameHash: 'fhash',
      lastName: 'Okafor',
      lastNameHash: 'lhash',
      passwordHash: 'phash',
      isFromWaitlist: false,
      isFromInvite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockRewardsRepo.createVoucher.mockResolvedValue({
      id: 12,
      uuid: 'vch-12',
      code: 'UPW-VCH-202611-GAME01',
      userId: 42,
      amountKobo: 100000n,
      redeemedAmountKobo: 0n,
      remainingAmountKobo: 100000n,
      currency: 'NGN',
      status: 'ACTIVE',
      sourceType: 'GAME_WINNER',
      triggerKey: 'EXTERNAL_GAME_WIN',
      campaignTag: 'ig-game',
      reason: 'Game Winner',
      notes: 'Won Friday trivia game',
      awardedByAdminId: 'admin-1',
      awardedByAdminEmail: 'admin@goodtenants.io',
      idempotencyKey: null,
      expiresAt: null,
      redeemedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // User already had two ₦1,000 vouchers (form + signup campaign) and now has ₦3,000 total
    mockRewardsRepo.getUserVoucherSummary.mockResolvedValue({
      userId: 42,
      totalEarnedKobo: 300000n,
      totalRedeemedKobo: 0n,
      totalExpiredKobo: 0n,
      availableBalanceKobo: 300000n,
      activeVouchersCount: 3,
      vouchers: [],
      redemptions: [],
      cashbackRewards: [],
      totalCashbackKobo: 0n,
    })

    const result = await adminAwardUseCase.execute({
      dto: {
        userUuid: 'user-uuid-42',
        amountNaira: 1000,
        sourceType: 'GAME_WINNER',
        reason: 'Game Winner',
        notes: 'Won Friday trivia game',
        campaignTag: 'ig-game',
      },
      adminId: 'admin-1',
      adminEmail: 'admin@goodtenants.io',
    })

    expect(result.voucher.amountNaira).toBe(1000)
    expect(result.summary.availableBalanceNaira).toBe(3000)
    expect(result.summary.activeVouchersCount).toBe(3)
  })

  it('allows admin to configure reward trigger amounts dynamically without code changes', async () => {
    const updateRuleUseCase = new AdminUpdateRewardRuleUseCase(mockRewardsRepo)

    mockRewardsRepo.upsertRule.mockResolvedValue({
      id: 5,
      uuid: 'rule-5',
      triggerKey: 'CAMPAIGN_SIGNUP_VOUCHER',
      name: 'Promotional Sign-Up Page (/signup/voucher)',
      description: 'Updated campaign reward',
      rewardCategory: 'VOUCHER',
      rewardAmountKobo: 250000n, // Updated to ₦2,500
      minQualifyingAmountKobo: 0n,
      maxPerUser: 1,
      expiryDays: 30,
      campaignTag: 'holiday-voucher',
      isActive: true,
      updatedByAdminId: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const updated = await updateRuleUseCase.execute({
      triggerKey: 'CAMPAIGN_SIGNUP_VOUCHER',
      dto: {
        rewardAmountNaira: 2500,
        campaignTag: 'holiday-voucher',
        expiryDays: 30,
        isActive: true,
      },
      adminId: 'admin-1',
    })

    expect(updated.rewardAmountNaira).toBe(2500)
    expect(updated.campaignTag).toBe('holiday-voucher')
  })

  it('returns user cumulative voucher summary and available reward activities', async () => {
    const summaryUseCase = new GetUserRewardsSummaryUseCase(mockRewardsRepo, mockUserRepo)

    mockRewardsRepo.getUserVoucherSummary.mockResolvedValue({
      userId: 42,
      totalEarnedKobo: 300000n,
      totalRedeemedKobo: 100000n,
      totalExpiredKobo: 0n,
      availableBalanceKobo: 200000n,
      activeVouchersCount: 2,
      vouchers: [],
      redemptions: [],
      cashbackRewards: [],
      totalCashbackKobo: 50000n,
    })
    mockRewardsRepo.findAllRules.mockResolvedValue([])

    const res = await summaryUseCase.execute(42)
    expect(res.availableBalanceNaira).toBe(2000)
    expect(res.totalEarnedNaira).toBe(3000)
    expect(res.totalRedeemedNaira).toBe(1000)
    expect(res.totalCashbackNaira).toBe(500)
  })
})
