import { ConflictException, NotFoundException } from '@nestjs/common'
import { CreateAllianceQualificationUseCase } from '@application/alliance/use-cases/create-alliance-qualification.use-case'
import { ListAllianceQualificationsUseCase } from '@application/alliance/use-cases/list-alliance-qualifications.use-case'
import { UpdateAllianceQualificationUseCase } from '@application/alliance/use-cases/update-alliance-qualification.use-case'
import { DeactivateAllianceQualificationUseCase } from '@application/alliance/use-cases/deactivate-alliance-qualification.use-case'
import { AssignPmQualificationUseCase } from '@application/alliance/use-cases/assign-pm-qualification.use-case'
import { RemovePmQualificationUseCase } from '@application/alliance/use-cases/remove-pm-qualification.use-case'
import { GetPmAssignedQualificationsUseCase } from '@application/alliance/use-cases/get-pm-assigned-qualifications.use-case'
import {
  IAllianceQualificationRepository,
  IAlliancePmQualificationRepository,
} from '@domains/alliance/alliance.repository.interface'
import { ActivityLogService } from '@shared/infrastructure/activity-log/activity-log.service'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import {
  AllianceQualificationEntity,
  AlliancePmQualificationEntity,
} from '@domains/alliance/alliance.entity'

describe('Alliance Qualification Use Cases (Stage 1A)', () => {
  let mockQualRepo: jest.Mocked<IAllianceQualificationRepository>
  let mockPmQualRepo: jest.Mocked<IAlliancePmQualificationRepository>
  let mockPrisma: any
  let mockActivityLogService: jest.Mocked<ActivityLogService>

  beforeEach(() => {
    mockQualRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
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

  describe('CreateAllianceQualificationUseCase', () => {
    let useCase: CreateAllianceQualificationUseCase

    beforeEach(() => {
      useCase = new CreateAllianceQualificationUseCase(
        mockQualRepo,
        mockActivityLogService,
      )
    })

    it('should create a qualification definition with generated slug and log activity', async () => {
      mockQualRepo.findBySlug.mockResolvedValue(null)
      mockQualRepo.create.mockResolvedValue(
        new AllianceQualificationEntity({
          id: 1,
          slug: 'niesv-registered',
          name: 'NIESV Registered',
          description: 'Nigerian Institution of Estate Surveyors and Valuers',
          isActive: true,
        }),
      )

      const result = await useCase.execute({
        name: 'NIESV Registered',
        description: 'Nigerian Institution of Estate Surveyors and Valuers',
        adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
      })

      expect(result.slug).toBe('niesv-registered')
      expect(result.name).toBe('NIESV Registered')
      expect(mockQualRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'niesv-registered',
          name: 'NIESV Registered',
        }),
      )
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_ALLIANCE_QUALIFICATION',
          entityType: 'ALLIANCE_QUALIFICATION',
        }),
      )
    })

    it('should throw ConflictException if slug already exists', async () => {
      mockQualRepo.findBySlug.mockResolvedValue(
        new AllianceQualificationEntity({
          id: 1,
          slug: 'niesv-registered',
          name: 'NIESV Registered',
        }),
      )

      await expect(
        useCase.execute({
          name: 'NIESV Registered',
          adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('ListAllianceQualificationsUseCase', () => {
    let useCase: ListAllianceQualificationsUseCase

    beforeEach(() => {
      useCase = new ListAllianceQualificationsUseCase(mockQualRepo)
    })

    it('should list all qualifications when includeInactive is true', async () => {
      mockQualRepo.findAll.mockResolvedValue([
        new AllianceQualificationEntity({ id: 1, slug: 'q1', name: 'Q1', isActive: true }),
        new AllianceQualificationEntity({ id: 2, slug: 'q2', name: 'Q2', isActive: false }),
      ])

      const result = await useCase.execute({ includeInactive: true })
      expect(result).toHaveLength(2)
      expect(mockQualRepo.findAll).toHaveBeenCalled()
    })

    it('should list only active qualifications by default', async () => {
      mockQualRepo.findActive.mockResolvedValue([
        new AllianceQualificationEntity({ id: 1, slug: 'q1', name: 'Q1', isActive: true }),
      ])

      const result = await useCase.execute({ includeInactive: false })
      expect(result).toHaveLength(1)
      expect(mockQualRepo.findActive).toHaveBeenCalled()
    })
  })

  describe('UpdateAllianceQualificationUseCase & DeactivateAllianceQualificationUseCase', () => {
    let updateUseCase: UpdateAllianceQualificationUseCase
    let deactivateUseCase: DeactivateAllianceQualificationUseCase

    beforeEach(() => {
      updateUseCase = new UpdateAllianceQualificationUseCase(
        mockQualRepo,
        mockActivityLogService,
      )
      deactivateUseCase = new DeactivateAllianceQualificationUseCase(
        mockQualRepo,
        mockActivityLogService,
      )
    })

    it('should update qualification name/description and log activity', async () => {
      const existing = new AllianceQualificationEntity({ id: 1, slug: 'q1', name: 'Old', isActive: true })
      mockQualRepo.findById.mockResolvedValue(existing)
      mockQualRepo.update.mockResolvedValue({ ...existing, name: 'New' } as any)

      const result = await updateUseCase.execute(1, {
        name: 'New',
        adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
      })

      expect(result.name).toBe('New')
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_ALLIANCE_QUALIFICATION' }),
      )
    })

    it('should soft deactivate qualification without deleting record', async () => {
      const existing = new AllianceQualificationEntity({ id: 1, slug: 'q1', name: 'Q1', isActive: true })
      mockQualRepo.findById.mockResolvedValue(existing)
      mockQualRepo.deactivate.mockResolvedValue({ ...existing, isActive: false } as any)

      const result = await deactivateUseCase.execute(1, { id: 'admin-1', email: 'admin@upward.ng' })

      expect(result.isActive).toBe(false)
      expect(mockQualRepo.deactivate).toHaveBeenCalledWith(1)
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEACTIVATE_ALLIANCE_QUALIFICATION' }),
      )
    })
  })

  describe('AssignPmQualificationUseCase & RemovePmQualificationUseCase', () => {
    let assignUseCase: AssignPmQualificationUseCase
    let removeUseCase: RemovePmQualificationUseCase

    beforeEach(() => {
      assignUseCase = new AssignPmQualificationUseCase(
        mockPmQualRepo,
        mockQualRepo,
        mockPrisma,
        mockActivityLogService,
      )
      removeUseCase = new RemovePmQualificationUseCase(
        mockPmQualRepo,
        mockPrisma,
        mockActivityLogService,
      )
    })

    it('should assign qualification to PM and record assignedByAdminId', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 10, name: 'Apex PM' })
      mockQualRepo.findById.mockResolvedValue(
        new AllianceQualificationEntity({ id: 1, slug: 'niesv', name: 'NIESV', isActive: true }),
      )
      mockPmQualRepo.findByPmAndQualification.mockResolvedValue(null)
      mockPmQualRepo.assign.mockResolvedValue(
        new AlliancePmQualificationEntity({
          id: 100,
          pmId: 10,
          qualificationId: 1,
          assignedByAdminId: 'admin-1',
          assignedAt: new Date(),
        }),
      )

      const result = await assignUseCase.execute({
        pmId: 10,
        qualificationId: 1,
        adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
      })

      expect(result.pmId).toBe(10)
      expect(result.qualificationId).toBe(1)
      expect(result.assignedByAdminId).toBe('admin-1')
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ASSIGN_ALLIANCE_QUALIFICATION' }),
      )
    })

    it('should reject assigning inactive qualification', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 10, name: 'Apex PM' })
      mockQualRepo.findById.mockResolvedValue(
        new AllianceQualificationEntity({ id: 1, slug: 'niesv', name: 'NIESV', isActive: false }),
      )

      await expect(
        assignUseCase.execute({
          pmId: 10,
          qualificationId: 1,
          adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('should reject duplicate qualification assignment', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 10, name: 'Apex PM' })
      mockQualRepo.findById.mockResolvedValue(
        new AllianceQualificationEntity({ id: 1, slug: 'niesv', name: 'NIESV', isActive: true }),
      )
      mockPmQualRepo.findByPmAndQualification.mockResolvedValue(
        new AlliancePmQualificationEntity({
          id: 100,
          pmId: 10,
          qualificationId: 1,
        }),
      )

      await expect(
        assignUseCase.execute({
          pmId: 10,
          qualificationId: 1,
          adminActor: { id: 'admin-1', email: 'admin@upward.ng' },
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('should remove qualification from PM without deleting the qualification definition', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 10, name: 'Apex PM' })
      mockPmQualRepo.findByPmAndQualification.mockResolvedValue(
        new AlliancePmQualificationEntity({
          id: 100,
          pmId: 10,
          qualificationId: 1,
        }),
      )
      mockPmQualRepo.remove.mockResolvedValue(undefined)

      await removeUseCase.execute(10, 1, { id: 'admin-1', email: 'admin@upward.ng' })

      expect(mockPmQualRepo.remove).toHaveBeenCalledWith(10, 1)
      expect(mockQualRepo.deactivate).not.toHaveBeenCalled()
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REMOVE_ALLIANCE_QUALIFICATION' }),
      )
    })
  })
})
