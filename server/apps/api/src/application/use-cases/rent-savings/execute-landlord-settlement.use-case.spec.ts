import { ExecuteLandlordSettlementUseCase } from './execute-landlord-settlement.use-case'

describe('ExecuteLandlordSettlementUseCase — Partial Balance & Excess Handling', () => {
  const buildDeps = (vaultOverrides: Record<string, any> = {}) => {
    const createdPaymentRequests: any[] = []
    const createdLineItems: any[] = []
    const createdNotifications: any[] = []
    const createdSettlements: any[] = []
    const createdTransactions: any[] = []
    const updatedVaults: any[] = []

    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const unlockDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const vault = {
      id: 99,
      uuid: 'vault-partial-99',
      userId: 55,
      targetAmountKobo: 600_000_000n, // NGN 6,000,000
      currentPrincipalKobo: 150_000_000n, // NGN 1,500,000
      accruedYieldKobo: 0n,
      productOption: 'SAVE_AND_EARN',
      lockMode: 'FLEXIBLE',
      lockStatus: 'SETTLEMENT_READY',
      contractualDueDate: dueDate,
      unlockDate,
      autoBypassPmApproval: true,
      investmentProvider: null,
      ...vaultOverrides,
    }

    const txClient: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: vault.id }]),
      upward_rent_vault: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(vault),
      },
      upward_user_property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 12,
          address: '10 Admiralty Way, Lekki',
          subaccountId: 4,
          manualAccountId: null,
        }),
      },
      upward_payment_request: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (args) => {
          const rec = { id: 701, uuid: 'pr-bal-701', ...args.data }
          createdPaymentRequests.push(rec)
          return rec
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_payment_line_item: {
        create: jest.fn().mockImplementation(async (args) => {
          createdLineItems.push(args.data)
          return { id: 801, ...args.data }
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_notification: {
        create: jest.fn().mockImplementation(async (args) => {
          createdNotifications.push(args.data)
          return { id: 901, ...args.data }
        }),
      },
      upward_arm_job: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          uuid: 'arm-job-1',
          idempotencyKey: 'k',
          jobType: 'REDEEM',
        }),
      },
    }

    const prisma: any = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(txClient)),
    }

    const armJobQueue: any = {
      enqueueJob: jest.fn().mockResolvedValue(undefined),
    }

    const rentVaultRepo: any = {
      findByUuid: jest.fn().mockResolvedValue(vault),
      createTransaction: jest.fn().mockImplementation(async (tx) => {
        const rec = { id: createdTransactions.length + 1, ...tx }
        createdTransactions.push(rec)
        return rec
      }),
      update: jest.fn().mockImplementation(async (id, data) => {
        updatedVaults.push({ id, ...data })
        return { ...vault, ...data }
      }),
      findSavingsScoreByVaultId: jest.fn().mockResolvedValue({ totalScore: 40, historyLog: [] }),
      upsertSavingsScore: jest.fn().mockResolvedValue({}),
    }

    const rentAdvanceRepo: any = {
      findActiveByVaultId: jest.fn().mockResolvedValue(null),
    }

    const rentSettlementRepo: any = {
      create: jest.fn().mockImplementation(async (data) => {
        createdSettlements.push(data)
        return { id: 1, ...data }
      }),
    }

    const providerRegistry: any = {
      getProvider: jest.fn(),
    }

    const useCase = new ExecuteLandlordSettlementUseCase(
      rentVaultRepo,
      rentAdvanceRepo,
      rentSettlementRepo,
      providerRegistry,
      prisma,
      armJobQueue,
    )

    return {
      useCase,
      createdPaymentRequests,
      createdLineItems,
      createdNotifications,
      createdSettlements,
      createdTransactions,
      updatedVaults,
    }
  }

  it('creates a PARTIAL balance payment request and notification when savings (₦1.5M) do not cover full rent (₦6M)', async () => {
    const {
      useCase,
      createdPaymentRequests,
      createdLineItems,
      createdNotifications,
      createdSettlements,
    } = buildDeps({
      targetAmountKobo: 600_000_000n,
      currentPrincipalKobo: 150_000_000n,
      accruedYieldKobo: 0n,
    })

    const res = await useCase.execute(55, 'vault-partial-99', {
      landlord_name: 'Chief Adewale',
      landlord_bank_code: '058',
      landlord_account_number: '0123456789',
      property_address: '10 Admiralty Way, Lekki',
    })

    expect(res.data.is_partial_settlement).toBe(true)
    expect(res.data.amount_paid_to_landlord_kobo).toBe(150_000_000)
    expect(res.data.target_rent_kobo).toBe(600_000_000)
    expect(res.data.remaining_balance_kobo).toBe(450_000_000)
    expect(res.data.cashback_credited_kobo).toBe(0)
    expect(res.data.balance_payment_request_uuid).toBe('pr-bal-701')

    expect(createdSettlements).toHaveLength(1)
    expect(createdSettlements[0].amountPaidToLandlordKobo).toBe(150_000_000n)

    expect(createdPaymentRequests).toHaveLength(1)
    expect(createdPaymentRequests[0].amount).toBe(6_000_000)
    expect(createdPaymentRequests[0].amountPaid).toBe(1_500_000)
    expect(createdPaymentRequests[0].status).toBe('PARTIAL')
    expect(createdPaymentRequests[0].allowPartial).toBe(true)

    expect(createdLineItems).toHaveLength(1)
    expect(createdLineItems[0]).toMatchObject({
      name: 'Rent',
      totalAmount: 6_000_000,
      amountPaid: 1_500_000,
      status: 'PARTIAL',
    })

    expect(createdNotifications).toHaveLength(1)
    expect(createdNotifications[0].url).toBe('/dashboard/pay-rent?paymentUuid=pr-bal-701')
  })

  it('caps landlord payout at target rent and reports surplus_to_wallet_kobo when savings exceed target', async () => {
    const { useCase, createdPaymentRequests, createdSettlements } = buildDeps({
      targetAmountKobo: 600_000_000n,
      currentPrincipalKobo: 600_000_000n,
      accruedYieldKobo: 25_000_000n, // NGN 250,000 surplus
    })

    const res = await useCase.execute(55, 'vault-partial-99', {
      landlord_name: 'Chief Adewale',
      landlord_bank_code: '058',
      landlord_account_number: '0123456789',
      property_address: '10 Admiralty Way, Lekki',
    })

    expect(res.data.is_partial_settlement).toBe(false)
    expect(res.data.amount_paid_to_landlord_kobo).toBe(600_000_000)
    expect(res.data.remaining_balance_kobo).toBe(0)
    expect(res.data.surplus_to_wallet_kobo).toBe(25_000_000)
    expect(res.data.cashback_credited_kobo).toBeGreaterThan(0)
    expect(res.data.balance_payment_request_uuid).toBeNull()
    expect(createdSettlements[0].amountPaidToLandlordKobo).toBe(600_000_000n)
    expect(createdPaymentRequests).toHaveLength(0)
  })
})
