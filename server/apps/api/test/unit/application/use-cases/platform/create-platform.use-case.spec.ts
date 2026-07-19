import { ConflictException } from '@nestjs/common'
import { CreatePlatformUseCase } from '@application/use-cases/platform/create-platform.use-case'
import { PlatformRepository } from '@domains/companies/company.repository'

describe('CreatePlatformUseCase', () => {
  let useCase: CreatePlatformUseCase
  let platformRepository: jest.Mocked<PlatformRepository>

  const mockPlatform = {
    id: 1,
    uuid: 'platform-uuid-001',
    apiKey: 'hashed-api-key',
    name: 'Acme Real Estate',
    email: 'admin@acme.com',
    address: '123 Lagos Street',
    webhookUrl: 'https://acme.com/webhook',
    nameHash: null,
    emailHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    platformRepository = {
      findById: jest.fn(),
      findByApiKey: jest.fn(),
      findByEmail: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    }

    useCase = new CreatePlatformUseCase(platformRepository)
  })

  describe('execute', () => {
    describe('happy path', () => {
      it('should create a new platform and return id, apiKey, name, email', async () => {
        platformRepository.findByName.mockResolvedValueOnce(null)
        platformRepository.findByEmail.mockResolvedValueOnce(null) // no duplicate
        platformRepository.save.mockResolvedValue(mockPlatform)
        platformRepository.findByName.mockResolvedValueOnce(mockPlatform)

        const result = await useCase.execute({
          name: 'Acme Real Estate',
          email: 'admin@acme.com',
          address: '123 Lagos Street',
          webhookUrl: 'https://acme.com/webhook',
        })

        expect(result).toMatchObject({
          id: mockPlatform.uuid,
          name: 'Acme Real Estate',
          email: 'admin@acme.com',
        })
        expect(result.apiKey).toMatch(/^up_sk_live_/)
        expect(platformRepository.save).toHaveBeenCalledTimes(1)
      })

      it('should generate a unique raw API key with "up_sk_live_" prefix', async () => {
        platformRepository.findByEmail.mockResolvedValueOnce(null)
        platformRepository.save.mockResolvedValue(mockPlatform)
        platformRepository.findByEmail.mockResolvedValueOnce(mockPlatform)

        const result = await useCase.execute({
          name: 'Test Platform',
          email: 'test@platform.com',
        })

        expect(result.apiKey).toMatch(/^up_sk_live_[a-f0-9]{24}$/)
      })

      it('should hash the API key before saving (saved key !== returned key)', async () => {
        platformRepository.findByName.mockResolvedValueOnce(null)
        platformRepository.findByEmail.mockResolvedValueOnce(null)
        let savedApiKey: string | undefined
        platformRepository.save.mockImplementation((p: any) => {
          savedApiKey = p.apiKey
          return Promise.resolve(mockPlatform)
        })
        platformRepository.findByName.mockResolvedValueOnce(mockPlatform)

        const result = await useCase.execute({
          name: 'Test Platform',
          email: 'test@hash.com',
        })

        // The raw key returned should NOT match the saved hash
        expect(savedApiKey).not.toBe(result.apiKey)
        // The saved key should be a SHA-256 hex (64 chars)
        expect(savedApiKey).toMatch(/^[a-f0-9]{64}$/)
      })

      it('should save platform with provided optional fields', async () => {
        platformRepository.findByEmail.mockResolvedValueOnce(null)
        platformRepository.save.mockResolvedValue(mockPlatform)
        platformRepository.findByEmail.mockResolvedValueOnce(mockPlatform)

        await useCase.execute({
          name: 'Full Platform',
          email: 'full@platform.com',
          address: '5 Ikoyi Road',
          webhookUrl: 'https://full.com/hook',
        })

        expect(platformRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Full Platform',
            email: 'full@platform.com',
            address: '5 Ikoyi Road',
            webhookUrl: 'https://full.com/hook',
          }),
        )
      })

      it('should work without optional address and webhookUrl', async () => {
        platformRepository.findByEmail.mockResolvedValueOnce(null)
        platformRepository.save.mockResolvedValue(mockPlatform)
        platformRepository.findByEmail.mockResolvedValueOnce(mockPlatform)

        const result = await useCase.execute({
          name: 'Minimal Platform',
          email: 'min@platform.com',
        })

        expect(result).toBeDefined()
        expect(result.name).toBe('Minimal Platform')
      })

      it('should persist createdAt and updatedAt timestamps', async () => {
        platformRepository.findByEmail.mockResolvedValueOnce(null)
        platformRepository.save.mockResolvedValue(mockPlatform)
        platformRepository.findByEmail.mockResolvedValueOnce(mockPlatform)

        await useCase.execute({ name: 'TS Platform', email: 'ts@platform.com' })

        expect(platformRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }),
        )
      })
    })

    describe('duplicate email', () => {
      it('should throw ConflictException when email already exists', async () => {
        platformRepository.findByEmail.mockResolvedValue(mockPlatform)

        await expect(
          useCase.execute({ name: 'Duplicate', email: 'admin@acme.com' }),
        ).rejects.toThrow(ConflictException)
      })

      it('should throw with the correct message on duplicate email', async () => {
        platformRepository.findByEmail.mockResolvedValue(mockPlatform)

        await expect(
          useCase.execute({ name: 'Dupe', email: 'admin@acme.com' }),
        ).rejects.toThrow('Platform with this email already exists')
      })

      it('should NOT call save when email already exists', async () => {
        platformRepository.findByEmail.mockResolvedValue(mockPlatform)

        await expect(
          useCase.execute({ name: 'Dupe', email: 'admin@acme.com' }),
        ).rejects.toThrow(ConflictException)

        expect(platformRepository.save).not.toHaveBeenCalled()
      })
    })

    describe('repository errors', () => {
      it('should propagate repository save errors', async () => {
        platformRepository.findByEmail.mockResolvedValueOnce(null)
        platformRepository.save.mockRejectedValue(new Error('DB connection failed'))

        await expect(
          useCase.execute({ name: 'Error Platform', email: 'err@platform.com' }),
        ).rejects.toThrow('DB connection failed')
      })
    })
  })
})
