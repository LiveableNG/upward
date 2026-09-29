import { NotFoundException } from '@nestjs/common'
import { TogglePmAllianceEnablementUseCase } from '@application/alliance/use-cases/toggle-pm-alliance-enablement.use-case'
import { GetPmAllianceProfileUseCase } from '@application/alliance/use-cases/get-pm-alliance-profile.use-case'
import { UpdatePmAllianceProfileUseCase } from '@application/alliance/use-cases/update-pm-alliance-profile.use-case'
import { IAllianceProfileRepository, IAlliancePmQualificationRepository } from '@domains/alliance/alliance.repository.interface'
import { ActivityLogService } from '@shared/infrastructure/activity-log/activity-log.service'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { AlliancePmProfileEntity } from '@domains/alliance/alliance.entity'

describe('Alliance Profile Use Cases (Stage 1A)', () => {
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>
  let mockPmQualRepo: jest.Mocked<IAlliancePmQualificationRepository>
  let mockPrisma: any
  let mockActivityLogService: jest.Mocked<ActivityLogService>

  beforeEach(() => {
    mockProfileRepo = {
      findByPmId: jest.fn(),
      findByUuid: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    }
    mockPmQualRepo = {
      assign: jest.fn(),
      remove: jest.fn(),
      findByPmAndQualification: jest.fn(),
      findActiveByPmId: jest.fn(),
      findAllByPmId: jest.fn(),
    }
    mockPrisma = {
      upward_property_manager: {
        findUnique: jest.fn(),
      },
    }
    mockActivityLogService = {
      log: jest.fn(),
    } as any
  })

  describe('TogglePmAllianceEnablementUseCase', () => {
    let useCase: TogglePmAllianceEnablementUseCase

    beforeEach(() => {
      useCase = new TogglePmAllianceEnablementUseCase(
        mockProfileRepo,
        mockPrisma,
        mockActivityLogService,
      )
    })

    it('should throw NotFoundException if PM does not exist', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue(null)

      await expect(
        useCase.execute({
          pmId: 999,
          isEnabled: true,
          adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
        }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should enable Alliance when profile exists and is disabled', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 1, name: 'Apex Living' })
      const existingProfile = new AlliancePmProfileEntity({
        id: 10,
        uuid: 'profile-uuid-1',
        pmId: 1,
        isEnabled: false,
      })
      mockProfileRepo.findByPmId.mockResolvedValue(existingProfile)
      mockProfileRepo.update.mockImplementation(async (pmId, data) => ({
        ...existingProfile,
        ...data,
      } as any))

      const result = await useCase.execute({
        pmId: 1,
        isEnabled: true,
        adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
      })

      expect(result.isEnabled).toBe(true)
      expect(result.enabledAt).toBeDefined()
      expect(mockProfileRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isEnabled: true }),
      )
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ALLIANCE_ENABLED',
          entityType: 'PROPERTY_MANAGER',
          entityId: 1,
        }),
      )
    })

    it('should be idempotent when enabling an already enabled profile', async () => {
      const now = new Date()
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 1, name: 'Apex Living' })
      const existingProfile = new AlliancePmProfileEntity({
        id: 10,
        uuid: 'profile-uuid-1',
        pmId: 1,
        isEnabled: true,
        enabledAt: now,
      })
      mockProfileRepo.findByPmId.mockResolvedValue(existingProfile)

      const result = await useCase.execute({
        pmId: 1,
        isEnabled: true,
        adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
      })

      expect(result.isEnabled).toBe(true)
      expect(mockProfileRepo.update).not.toHaveBeenCalled()
      expect(mockActivityLogService.log).not.toHaveBeenCalled()
    })

    it('should disable Alliance and set disabledAt without destroying profile', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 1, name: 'Apex Living' })
      const existingProfile = new AlliancePmProfileEntity({
        id: 10,
        uuid: 'profile-uuid-1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        pmTitle: 'Senior Broker',
      })
      mockProfileRepo.findByPmId.mockResolvedValue(existingProfile)
      mockProfileRepo.update.mockImplementation(async (pmId, data) => ({
        ...existingProfile,
        ...data,
      } as any))

      const result = await useCase.execute({
        pmId: 1,
        isEnabled: false,
        adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
      })

      expect(result.isEnabled).toBe(false)
      expect(result.disabledAt).toBeDefined()
      expect(result.pmTitle).toBe('Senior Broker')
      expect(mockProfileRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isEnabled: false }),
      )
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ALLIANCE_DISABLED',
          entityType: 'PROPERTY_MANAGER',
          entityId: 1,
        }),
      )
    })
  })

  describe('GetPmAllianceProfileUseCase', () => {
    let useCase: GetPmAllianceProfileUseCase

    beforeEach(() => {
      useCase = new GetPmAllianceProfileUseCase(
        mockProfileRepo,
        mockPmQualRepo,
        mockPrisma,
      )
    })

    it('should return default disabled profile if none exists yet in DB', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 2, name: 'Prime PM' })
      mockProfileRepo.findByPmId.mockResolvedValue(null)
      mockPmQualRepo.findActiveByPmId.mockResolvedValue([])

      const result = await useCase.execute(2)

      expect(result.pmId).toBe(2)
      expect(result.isEnabled).toBe(false)
      expect(result.pmTitle).toBeNull()
      expect(result.bio).toBeNull()
      expect(result.qualifications).toEqual([])
    })

    it('should return existing profile with active qualifications', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 2, name: 'Prime PM' })
      const existingProfile = new AlliancePmProfileEntity({
        id: 5,
        uuid: 'prof-2',
        pmId: 2,
        isEnabled: true,
        pmTitle: 'Lead Asset Manager',
        bio: 'Managing prime commercial & residential assets',
      })
      mockProfileRepo.findByPmId.mockResolvedValue(existingProfile)
      mockPmQualRepo.findActiveByPmId.mockResolvedValue([
        {
          id: 1,
          slug: 'niesv-registered',
          name: 'NIESV Registered',
          description: null,
          assignedAt: new Date(),
        } as any,
      ])

      const result = await useCase.execute(2)

      expect(result.isEnabled).toBe(true)
      expect(result.pmTitle).toBe('Lead Asset Manager')
      expect(result.bio).toBe('Managing prime commercial & residential assets')
      expect(result.qualifications).toHaveLength(1)
      expect(result.qualifications[0].slug).toBe('niesv-registered')
    })
  })

  describe('UpdatePmAllianceProfileUseCase', () => {
    let useCase: UpdatePmAllianceProfileUseCase

    beforeEach(() => {
      useCase = new UpdatePmAllianceProfileUseCase(
        mockProfileRepo,
        mockPrisma,
      )
    })

    it('should allow PM to update their title and bio even when disabled', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 3, name: 'Star Realty' })
      mockProfileRepo.findByPmId.mockResolvedValue(
        new AlliancePmProfileEntity({
          id: 8,
          uuid: 'prof-8',
          pmId: 3,
          isEnabled: false,
          pmTitle: 'Old Title',
          bio: 'Old Bio',
        }),
      )
      mockProfileRepo.update.mockResolvedValue(
        new AlliancePmProfileEntity({
          id: 8,
          uuid: 'prof-8',
          pmId: 3,
          isEnabled: false,
          pmTitle: 'Principal Partner',
          bio: 'Specializing in Ikoyi and Victoria Island listings',
        }),
      )

      const result = await useCase.execute(3, {
        pmTitle: 'Principal Partner',
        bio: 'Specializing in Ikoyi and Victoria Island listings',
      })

      expect(result.pmTitle).toBe('Principal Partner')
      expect(result.bio).toBe('Specializing in Ikoyi and Victoria Island listings')
      expect(mockProfileRepo.update).toHaveBeenCalledWith(3, {
        pmTitle: 'Principal Partner',
        bio: 'Specializing in Ikoyi and Victoria Island listings',
      })
    })

    it('should create a profile if updating for the first time', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 4, name: 'New PM' })
      mockProfileRepo.findByPmId.mockResolvedValue(null)
      mockProfileRepo.create.mockResolvedValue(
        new AlliancePmProfileEntity({
          id: 9,
          uuid: 'prof-9',
          pmId: 4,
          isEnabled: false,
          pmTitle: 'Managing Director',
        }),
      )

      const result = await useCase.execute(4, {
        pmTitle: 'Managing Director',
      })

      expect(result.pmTitle).toBe('Managing Director')
      expect(mockProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pmId: 4,
          pmTitle: 'Managing Director',
          isEnabled: false,
        }),
      )
    })
  })
})
