import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAllianceQualificationUseCase } from '@application/alliance/use-cases/create-alliance-qualification.use-case';
import { ListAllianceQualificationsUseCase } from '@application/alliance/use-cases/list-alliance-qualifications.use-case';
import { UpdateAllianceQualificationUseCase } from '@application/alliance/use-cases/update-alliance-qualification.use-case';
import { DeactivateAllianceQualificationUseCase } from '@application/alliance/use-cases/deactivate-alliance-qualification.use-case';
import { AssignPmQualificationUseCase } from '@application/alliance/use-cases/assign-pm-qualification.use-case';
import { RemovePmQualificationUseCase } from '@application/alliance/use-cases/remove-pm-qualification.use-case';
import { GetPmAssignedQualificationsUseCase } from '@application/alliance/use-cases/get-pm-assigned-qualifications.use-case';
import {
  IAllianceQualificationRepository,
  IAlliancePmQualificationRepository,
} from '@domains/alliance/alliance.repository.interface';
import { ActivityLogService } from '@shared/application/activity-log.service';
import { AllianceQualificationEntity, AlliancePmQualificationEntity } from '@domains/alliance/alliance.entity';

describe('Alliance Qualification Use Cases (Stage 1A)', () => {
  let mockQualRepo: jest.Mocked<IAllianceQualificationRepository>;
  let mockPmQualRepo: jest.Mocked<IAlliancePmQualificationRepository>;
  let mockPrisma: any;
  let mockActivityLogService: jest.Mocked<ActivityLogService>;

  beforeEach(() => {
    mockQualRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockPmQualRepo = {
      assign: jest.fn(),
      remove: jest.fn(),
      findByPmAndQualification: jest.fn(),
      findByPmId: jest.fn(),
    };
    mockPrisma = {
      upward_property_manager: {
        findUnique: jest.fn(),
      },
    };
    mockActivityLogService = {
      log: jest.fn(),
    } as any;
  });

  describe('CreateAllianceQualificationUseCase', () => {
    let useCase: CreateAllianceQualificationUseCase;

    beforeEach(() => {
      useCase = new CreateAllianceQualificationUseCase(mockQualRepo);
    });

    it('should create a qualification definition', async () => {
      mockQualRepo.findBySlug.mockResolvedValue(null);
      const createdEntity: AllianceQualificationEntity = {
        id: 1,
        uuid: 'qual-uuid-1',
        slug: 'niesv-registered',
        name: 'NIESV Registered',
        description: 'Nigerian Institution of Estate Surveyors and Valuers',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQualRepo.create.mockResolvedValue(createdEntity);

      const result = await useCase.execute({
        slug: 'niesv-registered',
        name: 'NIESV Registered',
        description: 'Nigerian Institution of Estate Surveyors and Valuers',
      });

      expect(result.slug).toBe('niesv-registered');
      expect(result.name).toBe('NIESV Registered');
      expect(mockQualRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'niesv-registered',
          name: 'NIESV Registered',
        }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockQualRepo.findBySlug.mockResolvedValue({
        id: 1,
        uuid: 'qual-uuid-1',
        slug: 'niesv-registered',
        name: 'NIESV Registered',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        useCase.execute({
          slug: 'niesv-registered',
          name: 'NIESV Registered',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ListAllianceQualificationsUseCase', () => {
    let useCase: ListAllianceQualificationsUseCase;

    beforeEach(() => {
      useCase = new ListAllianceQualificationsUseCase(mockQualRepo);
    });

    it('should list all qualifications when includeInactive is true', async () => {
      mockQualRepo.findAll.mockResolvedValue([
        { id: 1, uuid: 'q1', slug: 'q1', name: 'Q1', description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, uuid: 'q2', slug: 'q2', name: 'Q2', description: null, isActive: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await useCase.execute({ includeInactive: true });
      expect(result).toHaveLength(2);
      expect(mockQualRepo.findAll).toHaveBeenCalledWith({ includeInactive: true });
    });

    it('should list only active qualifications by default', async () => {
      mockQualRepo.findAll.mockResolvedValue([
        { id: 1, uuid: 'q1', slug: 'q1', name: 'Q1', description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await useCase.execute({ includeInactive: false });
      expect(result).toHaveLength(1);
      expect(mockQualRepo.findAll).toHaveBeenCalledWith({ includeInactive: false });
    });
  });

  describe('UpdateAllianceQualificationUseCase & DeactivateAllianceQualificationUseCase', () => {
    let updateUseCase: UpdateAllianceQualificationUseCase;
    let deactivateUseCase: DeactivateAllianceQualificationUseCase;

    beforeEach(() => {
      updateUseCase = new UpdateAllianceQualificationUseCase(mockQualRepo);
      deactivateUseCase = new DeactivateAllianceQualificationUseCase(mockQualRepo);
    });

    it('should update qualification name and description', async () => {
      const existing: AllianceQualificationEntity = {
        id: 1,
        uuid: 'q1',
        slug: 'q1',
        name: 'Old',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQualRepo.findById.mockResolvedValue(existing);
      mockQualRepo.update.mockResolvedValue({ ...existing, name: 'New' });

      const result = await updateUseCase.execute(1, {
        name: 'New',
      });

      expect(result.name).toBe('New');
      expect(mockQualRepo.update).toHaveBeenCalledWith(1, { name: 'New' });
    });

    it('should soft deactivate qualification without deleting record', async () => {
      const existing: AllianceQualificationEntity = {
        id: 1,
        uuid: 'q1',
        slug: 'q1',
        name: 'Q1',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQualRepo.findById.mockResolvedValue(existing);
      mockQualRepo.update.mockResolvedValue({ ...existing, isActive: false });

      const result = await deactivateUseCase.execute(1);

      expect(result.isActive).toBe(false);
      expect(mockQualRepo.update).toHaveBeenCalledWith(1, { isActive: false });
    });
  });

  describe('AssignPmQualificationUseCase & RemovePmQualificationUseCase', () => {
    let assignUseCase: AssignPmQualificationUseCase;
    let removeUseCase: RemovePmQualificationUseCase;

    beforeEach(() => {
      assignUseCase = new AssignPmQualificationUseCase(
        mockPmQualRepo,
        mockQualRepo,
        mockPrisma,
        mockActivityLogService,
      );
      removeUseCase = new RemovePmQualificationUseCase(
        mockPmQualRepo,
        mockQualRepo,
        mockPrisma,
        mockActivityLogService,
      );
    });

    it('should assign qualification to PM and record assignedByAdminId', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 10,
        uuid: 'pm-uuid-10',
        businessName: 'Apex PM',
      });
      mockQualRepo.findById.mockResolvedValue({
        id: 1,
        uuid: 'qual-uuid-1',
        slug: 'niesv',
        name: 'NIESV',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPmQualRepo.findByPmAndQualification.mockResolvedValue(null);
      mockPmQualRepo.assign.mockResolvedValue({
        id: 100,
        uuid: 'assign-uuid-100',
        pmId: 10,
        qualificationId: 1,
        assignedByAdminId: 'admin-1',
        assignedAt: new Date(),
      });

      const result = await assignUseCase.execute('pm-uuid-10', 1, 'admin-1');

      expect(result.pmId).toBe(10);
      expect(result.qualificationId).toBe(1);
      expect(result.assignedByAdminId).toBe('admin-1');
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ASSIGN_ALLIANCE_QUALIFICATION' }),
      );
    });

    it('should reject assigning inactive qualification', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 10,
        uuid: 'pm-uuid-10',
        businessName: 'Apex PM',
      });
      mockQualRepo.findById.mockResolvedValue({
        id: 1,
        uuid: 'qual-uuid-1',
        slug: 'niesv',
        name: 'NIESV',
        description: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        assignUseCase.execute('pm-uuid-10', 1, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate qualification assignment', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 10,
        uuid: 'pm-uuid-10',
        businessName: 'Apex PM',
      });
      mockQualRepo.findById.mockResolvedValue({
        id: 1,
        uuid: 'qual-uuid-1',
        slug: 'niesv',
        name: 'NIESV',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPmQualRepo.findByPmAndQualification.mockResolvedValue({
        id: 100,
        uuid: 'assign-uuid-100',
        pmId: 10,
        qualificationId: 1,
        assignedByAdminId: 'admin-1',
        assignedAt: new Date(),
      });

      await expect(
        assignUseCase.execute('pm-uuid-10', 1, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should remove qualification from PM without deleting the qualification definition', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 10,
        uuid: 'pm-uuid-10',
        businessName: 'Apex PM',
      });
      mockQualRepo.findById.mockResolvedValue({
        id: 1,
        uuid: 'qual-uuid-1',
        slug: 'niesv',
        name: 'NIESV',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPmQualRepo.remove.mockResolvedValue(true);

      const result = await removeUseCase.execute('pm-uuid-10', 1, 'admin-1');

      expect(result).toEqual({ success: true });
      expect(mockPmQualRepo.remove).toHaveBeenCalledWith(10, 1);
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REMOVE_ALLIANCE_QUALIFICATION' }),
      );
    });
  });

  describe('GetPmAssignedQualificationsUseCase', () => {
    let useCase: GetPmAssignedQualificationsUseCase;

    beforeEach(() => {
      useCase = new GetPmAssignedQualificationsUseCase(mockPmQualRepo, mockPrisma);
    });

    it('should return list of PM qualifications', async () => {
      mockPmQualRepo.findByPmId.mockResolvedValue([
        {
          id: 100,
          uuid: 'assign-uuid-100',
          pmId: 10,
          qualificationId: 1,
          assignedByAdminId: 'admin-1',
          assignedAt: new Date(),
        },
      ]);

      const result = await useCase.execute(10);
      expect(result).toHaveLength(1);
      expect(mockPmQualRepo.findByPmId).toHaveBeenCalledWith(10);
    });
  });
});
