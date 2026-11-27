import { ForbiddenException } from '@nestjs/common'
import { GetSavingsInterestStatusUseCase } from './get-savings-interest-status.use-case'
import { IndicateSavingsInterestUseCase } from './indicate-savings-interest.use-case'
import { ApplyReservedSavingsCashbackUseCase } from './apply-reserved-savings-cashback.use-case'
import { CreateRentVaultUseCase } from './create-rent-vault.use-case'

describe('Savings Interest & Instant Cashback Allocation', () => {
  const makeCampaign = (overrides?: Partial<any>) => ({
    id: 1,
    uuid: 'camp-1',
    code: 'ACTIVATION_DEC_2026',
    name: 'Rent Savings Activation Cashback (Dec 2026)',
    rewardAmountKobo: 300_000n, // NGN 3,000
    budgetCapKobo: 5_000_000n, // NGN 50,000
    totalDisbursedKobo: 0n,
    isActive: true,
    ...overrides,
  })

  describe('IndicateSavingsInterestUseCase', () => {
    it('allocates NGN 3,000 RESERVED cashback on first-time confirmation and creates a notification', async () => {
      const campaign = makeCampaign()
      const txMock: any = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
        upward_savings_cashback_campaign: {
          findUnique: jest.fn().mockResolvedValue(campaign),
          update: jest.fn().mockResolvedValue({
            ...campaign,
            totalDisbursedKobo: 300_000n,
          }),
        },
        upward_savings_cashback_grant: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async (args) => ({
            id: 10,
            uuid: 'grant-10',
            createdAt: new Date('2026-11-27T15:00:00Z'),
            ...args.data,
          })),
        },
      }

      const prisma: any = {
        $transaction: jest.fn().mockImplementation(async (fn) => fn(txMock)),
        upward_notification: {
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      }

      const useCase = new IndicateSavingsInterestUseCase(prisma)
      const res = await useCase.execute(42, { source: 'home_hero' })

      expect(res.status).toBe('success')
      expect(res.data.already_claimed).toBe(false)
      expect(res.data.won_cashback).toBe(true)
      expect(res.data.grant_status).toBe('RESERVED')
      expect(res.data.allocated_amount_ngn).toBe(3000)
      expect(txMock.upward_savings_cashback_campaign.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { totalDisbursedKobo: { increment: 300_000n } },
      })
      expect(txMock.upward_savings_cashback_grant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 42,
            vaultId: null,
            amountKobo: 300_000n,
            status: 'RESERVED',
            fundingSource: 'SELF_CLAIM_INTEREST',
          }),
        }),
      )
      expect(prisma.upward_notification.create).toHaveBeenCalledTimes(1)
    })

    it('is idempotent on repeat click and does not double-decrement budget', async () => {
      const campaign = makeCampaign({ totalDisbursedKobo: 300_000n })
      const existingGrant = {
        id: 10,
        uuid: 'grant-10',
        userId: 42,
        amountKobo: 300_000n,
        status: 'RESERVED',
        reference: 'INT_CBK_ACTIVATION_DEC_2026_42_123',
        createdAt: new Date('2026-11-27T15:00:00Z'),
      }

      const txMock: any = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
        upward_savings_cashback_campaign: {
          findUnique: jest.fn().mockResolvedValue(campaign),
          update: jest.fn(),
        },
        upward_savings_cashback_grant: {
          findUnique: jest.fn().mockResolvedValue(existingGrant),
          create: jest.fn(),
        },
      }

      const prisma: any = {
        $transaction: jest.fn().mockImplementation(async (fn) => fn(txMock)),
        upward_notification: { create: jest.fn() },
      }

      const useCase = new IndicateSavingsInterestUseCase(prisma)
      const res = await useCase.execute(42)

      expect(res.data.already_claimed).toBe(true)
      expect(res.data.won_cashback).toBe(true)
      expect(res.data.allocated_amount_ngn).toBe(3000)
      expect(txMock.upward_savings_cashback_campaign.update).not.toHaveBeenCalled()
      expect(txMock.upward_savings_cashback_grant.create).not.toHaveBeenCalled()
      expect(prisma.upward_notification.create).not.toHaveBeenCalled()
    })

    it('records WAITLISTED with ₦0 when campaign budget cap is exhausted', async () => {
      const campaign = makeCampaign({
        budgetCapKobo: 5_000_000n,
        totalDisbursedKobo: 4_800_000n, // only NGN 2,000 left (< 3,000 reward)
      })

      const txMock: any = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
        upward_savings_cashback_campaign: {
          findUnique: jest.fn().mockResolvedValue(campaign),
          update: jest.fn(),
        },
        upward_savings_cashback_grant: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async (args) => ({
            id: 11,
            uuid: 'grant-11',
            createdAt: new Date('2026-11-27T15:05:00Z'),
            ...args.data,
          })),
        },
      }

      const prisma: any = {
        $transaction: jest.fn().mockImplementation(async (fn) => fn(txMock)),
        upward_notification: { create: jest.fn().mockResolvedValue({ id: 2 }) },
      }

      const useCase = new IndicateSavingsInterestUseCase(prisma)
      const res = await useCase.execute(99)

      expect(res.data.already_claimed).toBe(false)
      expect(res.data.won_cashback).toBe(false)
      expect(res.data.grant_status).toBe('WAITLISTED')
      expect(res.data.allocated_amount_ngn).toBe(0)
      expect(txMock.upward_savings_cashback_campaign.update).not.toHaveBeenCalled()
    })
  })

  describe('GetSavingsInterestStatusUseCase', () => {
    it('reports available campaign slots before a user claims', async () => {
      const campaign = makeCampaign({ totalDisbursedKobo: 600_000n })
      const prisma: any = {
        upward_savings_cashback_campaign: {
          findUnique: jest.fn().mockResolvedValue(campaign),
        },
        upward_savings_cashback_grant: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }

      const useCase = new GetSavingsInterestStatusUseCase(prisma)
      const res = await useCase.execute(42)

      expect(res.data.has_indicated_interest).toBe(false)
      expect(res.data.campaign.can_win_cashback).toBe(true)
      expect(res.data.campaign.reward_amount_ngn).toBe(3000)
      expect(res.data.campaign.slots_remaining).toBe(14)
    })
  })

  describe('ApplyReservedSavingsCashbackUseCase', () => {
    it('credits RESERVED cashback into a newly created vault and transitions status to CREDITED', async () => {
      const reservedGrant = {
        id: 10,
        uuid: 'grant-10',
        userId: 42,
        vaultId: null,
        amountKobo: 300_000n,
        status: 'RESERVED',
        fundingSource: 'SELF_CLAIM_INTEREST',
        reference: 'INT_CBK_ACTIVATION_DEC_2026_42_123',
        campaign: { code: 'ACTIVATION_DEC_2026', name: 'Activation Campaign' },
      }

      const txMock: any = {
        upward_savings_cashback_grant: {
          findUnique: jest.fn().mockResolvedValue(reservedGrant),
          update: jest.fn().mockResolvedValue({}),
        },
        upward_rent_vault: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 77,
            currentPrincipalKobo: 0n,
            accruedYieldKobo: 0n,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        upward_rent_vault_transaction: {
          create: jest.fn().mockResolvedValue({ id: 501 }),
        },
      }

      const prisma: any = {
        upward_savings_cashback_grant: {
          findMany: jest.fn().mockResolvedValue([reservedGrant]),
        },
        $transaction: jest.fn().mockImplementation(async (fn) => fn(txMock)),
      }

      const useCase = new ApplyReservedSavingsCashbackUseCase(prisma)
      const res = await useCase.execute(42, 77)

      expect(res.credited).toBe(true)
      expect(res.amountKobo).toBe(300_000n)
      expect(txMock.upward_rent_vault.update).toHaveBeenCalledWith({
        where: { id: 77 },
        data: { currentPrincipalKobo: { increment: 300_000n } },
      })
      expect(txMock.upward_savings_cashback_grant.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { vaultId: 77, transactionId: 501, status: 'CREDITED' },
      })
    })
  })

  describe('CreateRentVaultUseCase COMING_SOON guard', () => {
    it('blocks vault creation with ForbiddenException when savingsMode is COMING_SOON', async () => {
      const useCase = new CreateRentVaultUseCase(
        { findActiveByUserId: jest.fn() } as any,
        { findById: jest.fn() } as any,
        {} as any,
        { getRates: jest.fn().mockResolvedValue({ savingsMode: 'COMING_SOON' }) } as any,
      )

      await expect(
        useCase.execute(42, {
          target_amount_kobo: 200_000_000,
          contractual_due_date: '2027-10-01',
          cadence: 'MONTHLY',
          preferred_funding_method: 'DVA',
        }),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
