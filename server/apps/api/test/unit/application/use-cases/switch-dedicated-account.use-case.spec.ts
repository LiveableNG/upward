import { SwitchDedicatedAccountUseCase } from '@application/use-cases/payments/switch-dedicated-account.use-case'
import { IDVAAccountRepository } from '@domains/payments/payment.repository'
import { ResolveDedicatedAccountUseCase } from '@application/use-cases/payments/resolve-dedicated-account.use-case'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'

describe('SwitchDedicatedAccountUseCase', () => {
  let useCase: SwitchDedicatedAccountUseCase
  let mockDvaRepo: jest.Mocked<IDVAAccountRepository>
  let mockResolveUseCase: jest.Mocked<ResolveDedicatedAccountUseCase>
  let mockPrisma: any
  let mockEncryption: jest.Mocked<EncryptionService>

  beforeEach(() => {
    mockDvaRepo = {
      create: jest.fn(),
      findByUserPropertyId: jest.fn(),
      findAllByUserPropertyId: jest.fn(),
      setDefault: jest.fn(),
      findByAccountNumber: jest.fn(),
    }
    mockResolveUseCase = {
      execute: jest.fn(),
    } as any
    mockPrisma = {
      upward_payment_request: {
        findUnique: jest.fn(),
      },
      upward_user_property: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    }
    mockEncryption = {
      isEncrypted: jest.fn(() => false),
      decrypt: jest.fn((val) => val),
    } as any

    useCase = new SwitchDedicatedAccountUseCase(
      mockDvaRepo,
      mockResolveUseCase,
      mockPrisma,
      mockEncryption,
    )
  })

  it('should switch from Wema to existing cached Titan account by activating it', async () => {
    mockPrisma.upward_user_property.findUnique.mockResolvedValue({
      id: 10,
      user: { email: 'tenant@upward.ng', firstName: 'John', lastName: 'Doe' },
    })

    const wemaAccount = {
      id: 1,
      accountNumber: '1111111111',
      bankName: 'Wema Bank',
      bankSlug: 'wema-bank',
      isDefault: true,
      userPropertyId: 10,
    } as any
    const titanAccount = {
      id: 2,
      accountNumber: '2222222222',
      bankName: 'Paystack-Titan',
      bankSlug: 'titan-paystack',
      isDefault: false,
      userPropertyId: 10,
    } as any

    mockDvaRepo.findAllByUserPropertyId.mockResolvedValue([wemaAccount, titanAccount])

    const result = await useCase.execute({ userPropertyId: 10 })

    expect(mockDvaRepo.setDefault).toHaveBeenCalledWith(2, 10)
    expect(result.accountNumber).toBe('2222222222')
    expect(result.isDefault).toBe(true)
    expect(mockResolveUseCase.execute).not.toHaveBeenCalled()
  })

  it('should request creation of new Titan account if no cached Titan account exists', async () => {
    mockPrisma.upward_user_property.findUnique.mockResolvedValue({
      id: 10,
      user: { email: 'tenant@upward.ng', firstName: 'John', lastName: 'Doe' },
    })

    const wemaAccount = {
      id: 1,
      accountNumber: '1111111111',
      bankName: 'Wema Bank',
      bankSlug: 'wema-bank',
      isDefault: true,
      userPropertyId: 10,
    } as any

    mockDvaRepo.findAllByUserPropertyId.mockResolvedValue([wemaAccount])
    mockResolveUseCase.execute.mockResolvedValue({
      id: 3,
      accountNumber: '3333333333',
      bankName: 'Paystack-Titan',
      bankSlug: 'titan-paystack',
      isDefault: true,
      userPropertyId: 10,
    } as any)

    const result = await useCase.execute({ userPropertyId: 10 })

    expect(mockResolveUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userPropertyId: 10,
        preferredBank: 'titan-paystack',
        forceReissue: true,
        disableFallback: true,
      }),
    )
    expect(result.accountNumber).toBe('3333333333')
  })

  it('should throw an error if alternate account generation returns the same bank account', async () => {
    mockPrisma.upward_user_property.findUnique.mockResolvedValue({
      id: 10,
      user: { email: 'tenant@upward.ng', firstName: 'John', lastName: 'Doe' },
    })

    const wemaAccount = {
      id: 1,
      accountNumber: '1111111111',
      bankName: 'Wema Bank',
      bankSlug: 'wema-bank',
      isDefault: true,
      userPropertyId: 10,
    } as any

    mockDvaRepo.findAllByUserPropertyId.mockResolvedValue([wemaAccount])
    mockResolveUseCase.execute.mockResolvedValue({
      id: 1,
      accountNumber: '1111111111',
      bankName: 'Wema Bank',
      bankSlug: 'wema-bank',
      isDefault: true,
      userPropertyId: 10,
    } as any)

    await expect(useCase.execute({ userPropertyId: 10 })).rejects.toThrow(
      /Unable to provision an alternate Paystack-Titan account/i,
    )
  })

  it('should switch from Titan to existing cached Wema account without overriding Titan as permanent default', async () => {
    mockPrisma.upward_user_property.findUnique.mockResolvedValue({
      id: 10,
      user: { email: 'tenant@upward.ng', firstName: 'John', lastName: 'Doe' },
    })

    const titanAccount = {
      id: 2,
      accountNumber: '2222222222',
      bankName: 'Paystack-Titan',
      bankSlug: 'titan-paystack',
      isDefault: true,
      userPropertyId: 10,
    } as any
    const wemaAccount = {
      id: 1,
      accountNumber: '1111111111',
      bankName: 'Wema Bank',
      bankSlug: 'wema-bank',
      isDefault: false,
      userPropertyId: 10,
    } as any

    mockDvaRepo.findAllByUserPropertyId.mockResolvedValue([titanAccount, wemaAccount])

    const result = await useCase.execute({ userPropertyId: 10, preferredBank: 'wema-bank' })

    expect(mockDvaRepo.setDefault).not.toHaveBeenCalled()
    expect(result.accountNumber).toBe('1111111111')
    expect(result.isDefault).toBe(false)
  })
})
