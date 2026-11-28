import { WithdrawMaturedRentVaultUseCase } from './withdraw-matured-rent-vault.use-case'

describe('WithdrawMaturedRentVaultUseCase — Matured Tenant Self-Withdrawal (T-30)', () => {
  const buildDeps = (options?: {
    vaultOverrides?: Record<string, any>
    bankDetails?: Record<string, any> | null
    activeAdvance?: Record<string, any> | null
    unrecoveredPremiumKobo?: bigint
  }) => {
    const now = new Date()
    const dueIn15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
    const unlock15DaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

    const vault = {
      id: 99,
      uuid: 'vault-matured-99',
      userId: 12,
      targetAmountKobo: 200_000_000n, // NGN 2,000,000
      currentPrincipalKobo: 190_000_000n, // NGN 1,900,000
      accruedYieldKobo: 15_000_000n, // NGN 150,000
      productOption: 'SAVE_AND_EARN',
      lockMode: 'LOCKED',
      lockStatus: 'SETTLEMENT_READY',
      contractualDueDate: dueIn15Days,
      unlockDate: unlock15DaysAgo,
      investmentProvider: 'ARM',
      providerMembershipId: 'MEM-12',
      providerAccountNumber: 'ARM-ACC-12',
      createdAt: new Date(now.getTime() - 320 * 24 * 60 * 60 * 1000),
      ...options?.vaultOverrides,
    }

    const createdTxs: any[] = []
    const vaultUpdates: any[] = []
    const createdArmJobs: any[] = []
    const enqueuedArmJobs: any[] = []
    const treasuryLedgerEntries: any[] = []

    const rentVaultRepo: any = {
      findByUuid: jest.fn().mockResolvedValue(vault),
      createTransaction: jest.fn().mockImplementation(async (tx) => {
        const created = { id: createdTxs.length + 1, ...tx }
        createdTxs.push(created)
        return created
      }),
      update: jest.fn().mockImplementation(async (id, data) => {
        vaultUpdates.push({ id, data })
        return { ...vault, ...data }
      }),
    }

    const rentAdvanceRepo: any = {
      findActiveByVaultId: jest.fn().mockResolvedValue(options?.activeAdvance ?? null),
      update: jest.fn().mockResolvedValue({}),
    }

    const verifiedBank =
      options?.bankDetails === null
        ? null
        : {
            bankCode: '058',
            bankName: 'Guaranty Trust Bank',
            accountNumber: '0123456789',
            accountName: 'ADA LOVELACE',
            ...options?.bankDetails,
          }

    const prisma: any = {
      upward_user_bank_details: {
        findUnique: jest.fn().mockResolvedValue(verifiedBank),
      },
      upward_vault_treasury_summary: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            options?.unrecoveredPremiumKobo
              ? { unrecoveredPremiumKobo: options.unrecoveredPremiumKobo }
              : null,
          ),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_savings_internal_ledger: {
        create: jest.fn().mockImplementation(async (args) => {
          treasuryLedgerEntries.push(args.data)
          return args.data
        }),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([{ id: vault.id }]),
          upward_rent_vault: {
            findUniqueOrThrow: jest.fn().mockResolvedValue(vault),
          },
          upward_arm_job: {
            create: jest.fn().mockImplementation(async (args) => {
              const job = { id: 1, uuid: 'arm-job-uuid-1', ...args.data }
              createdArmJobs.push(job)
              return job
            }),
          },
        }
        return fn(tx)
      }),
    }

    const armJobQueue: any = {
      enqueueJob: jest.fn().mockImplementation(async (job) => {
        enqueuedArmJobs.push(job)
      }),
    }

    const useCase = new WithdrawMaturedRentVaultUseCase(
      rentVaultRepo,
      rentAdvanceRepo,
      undefined,
      prisma,
      armJobQueue,
    )

    return {
      useCase,
      createdTxs,
      vaultUpdates,
      createdArmJobs,
      enqueuedArmJobs,
      treasuryLedgerEntries,
    }
  }

  it('disburses 100% principal + 100% accrued yield with ₦0 fee to verified KYC bank and enqueues ARM REDEEM', async () => {
    const { useCase, createdTxs, vaultUpdates, createdArmJobs, enqueuedArmJobs } = buildDeps()

    const res = await useCase.execute(12, 'vault-matured-99')

    expect(res.status).toBe('success')
    expect(res.data.principal_kobo).toBe(190_000_000)
    expect(res.data.accrued_yield_kobo).toBe(15_000_000)
    expect(res.data.net_payout_kobo).toBe(205_000_000)
    expect(res.data.destination_bank_name).toBe('Guaranty Trust Bank')
    expect(res.data.destination_account_number).toBe('0123456789')
    expect(res.data.payout_status).toBe('DISBURSED')

    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].type).toBe('BREAKOUT_PAYOUT')
    expect(createdTxs[0].metadata.withdrawalKind).toBe('MATURED_SELF_WITHDRAWAL')

    expect(vaultUpdates[0].data.lockStatus).toBe('SETTLED')
    expect(vaultUpdates[0].data.currentPrincipalKobo).toBe(0n)
    expect(vaultUpdates[0].data.accruedYieldKobo).toBe(0n)

    expect(createdArmJobs).toHaveLength(1)
    expect(createdArmJobs[0].jobType).toBe('REDEEM')
    expect(createdArmJobs[0].amountKobo).toBe(205_000_000n)
    expect(enqueuedArmJobs).toHaveLength(1)
  })

  it('rejects matured withdrawal before T-30 unlock window', async () => {
    const dueIn90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    const unlockIn60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    const { useCase } = buildDeps({
      vaultOverrides: {
        lockStatus: 'LOCKED',
        contractualDueDate: dueIn90Days,
        unlockDate: unlockIn60Days,
      },
    })

    await expect(useCase.execute(12, 'vault-matured-99')).rejects.toThrow(
      'unlock 30 days before your rent due date',
    )
  })

  it('rejects matured withdrawal when tenant has no verified personal bank account', async () => {
    const { useCase } = buildDeps({ bankDetails: null })

    await expect(useCase.execute(12, 'vault-matured-99')).rejects.toThrow(
      'No verified personal bank account found',
    )
  })

  it('offsets active emergency advance and unrecovered Rent Protec premium on matured self-withdrawal', async () => {
    const { useCase, treasuryLedgerEntries } = buildDeps({
      vaultOverrides: {
        productOption: 'RENT_PROTEC',
      },
      activeAdvance: {
        id: 5,
        status: 'ACTIVE',
        totalRepayableKobo: 20_000_000n,
        amountRepaidKobo: 5_000_000n,
        latePenaltiesKobo: 1_000_000n, // 16M owed
      },
      unrecoveredPremiumKobo: 2_500_000n, // 25k NGN unrecovered premium
    })

    const res = await useCase.execute(12, 'vault-matured-99')

    expect(res.data.advance_deduction_kobo).toBe(16_000_000)
    expect(res.data.premium_recovery_deduction_kobo).toBe(2_500_000)
    expect(res.data.net_payout_kobo).toBe(205_000_000 - 16_000_000 - 2_500_000)
    expect(treasuryLedgerEntries).toHaveLength(1)
    expect(treasuryLedgerEntries[0].entryType).toBe('MATURITY_RECOVERY')
  })
})
