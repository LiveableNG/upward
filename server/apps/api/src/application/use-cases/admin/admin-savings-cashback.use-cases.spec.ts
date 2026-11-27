import { BadRequestException, ConflictException } from '@nestjs/common'
import { CreditSavingsCashbackUseCase } from './admin-savings-cashback.use-cases'

describe('CreditSavingsCashbackUseCase', () => {
  const makeUseCase = (overrides?: {
    existingGrant?: any
    totalDisbursedKobo?: bigint
    budgetCapKobo?: bigint
  }) => {
    const campaign = {
      id: 1,
      uuid: 'camp-1',
      code: 'ACTIVATION_DEC_2026',
      name: 'Activation Cashback',
      rewardAmountKobo: 300_000n, // NGN 3,000
      budgetCapKobo: overrides?.budgetCapKobo ?? 5_000_000n, // NGN 50,000
      totalDisbursedKobo: overrides?.totalDisbursedKobo ?? 0n,
      isActive: true,
    }

    const txMock: any = {
      upward_savings_cashback_campaign: {
        findUnique: jest.fn().mockResolvedValue(campaign),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_savings_cashback_grant: {
        findUnique: jest.fn().mockResolvedValue(overrides?.existingGrant ?? null),
        create: jest.fn().mockImplementation(async (args) => ({
          uuid: 'grant-1',
          ...args.data,
        })),
      },
      upward_rent_vault: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 99,
          currentPrincipalKobo: 1_000_000n,
          accruedYieldKobo: 50_000n,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      upward_rent_vault_transaction: {
        create: jest.fn().mockResolvedValue({ id: 555 }),
      },
    }

    const prisma: any = {
      upward_user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          uuid: 'user-7',
          firstName: 'Ada',
          lastName: 'Okafor',
        }),
      },
      upward_rent_vault: {
        findFirst: jest.fn().mockResolvedValue({
          id: 99,
          userId: 7,
          lockStatus: 'LOCKED',
        }),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => fn(txMock)),
    }

    return { useCase: new CreditSavingsCashbackUseCase(prisma), txMock }
  }

  it('credits NGN 3,000 activation cashback into the rent vault and updates campaign disbursed total', async () => {
    const { useCase, txMock } = makeUseCase()
    const res = await useCase.execute({ userUuid: 'user-7' }, 'admin-1')

    expect(res.success).toBe(true)
    expect(res.data.amountNgn).toBe(3000)
    expect(res.data.newVaultBalanceNgn).toBe(13500)
    expect(txMock.upward_rent_vault_transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'CASHBACK',
          amountKobo: 300_000n,
          principalDeltaKobo: 300_000n,
        }),
      }),
    )
    expect(txMock.upward_savings_cashback_campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalDisbursedKobo: { increment: 300_000n } },
      }),
    )
  })

  it('blocks duplicate cashback grants for the same user in the same campaign', async () => {
    const { useCase } = makeUseCase({ existingGrant: { id: 1 } })
    await expect(useCase.execute({ userUuid: 'user-7' }, 'admin-1')).rejects.toThrow(
      ConflictException,
    )
  })

  it('enforces the NGN 50,000 campaign budget cap', async () => {
    const { useCase } = makeUseCase({
      budgetCapKobo: 5_000_000n,
      totalDisbursedKobo: 4_800_000n, // only NGN 2,000 left
    })
    await expect(useCase.execute({ userUuid: 'user-7' }, 'admin-1')).rejects.toThrow(
      BadRequestException,
    )
  })
})
