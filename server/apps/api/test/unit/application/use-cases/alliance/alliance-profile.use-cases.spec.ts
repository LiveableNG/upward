import { NotFoundException } from '@nestjs/common';
import { TogglePmAllianceEnablementUseCase } from '@application/alliance/use-cases/toggle-pm-alliance-enablement.use-case';
import { GetPmAllianceProfileUseCase } from '@application/alliance/use-cases/get-pm-alliance-profile.use-case';
import { UpdatePmAllianceProfileUseCase } from '@application/alliance/use-cases/update-pm-alliance-profile.use-case';
import {
  IAllianceProfileRepository,
  IAlliancePmQualificationRepository,
} from '@domains/alliance/alliance.repository.interface';
import { ActivityLogService } from '@shared/application/activity-log.service';
import { AlliancePmProfileEntity } from '@domains/alliance/alliance.entity';

describe('Alliance Profile Use Cases (Stage 1A)', () => {
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>;
  let mockPmQualRepo: jest.Mocked<IAlliancePmQualificationRepository>;
  let mockPrisma: any;
  let mockActivityLogService: jest.Mocked<ActivityLogService>;

  beforeEach(() => {
    mockProfileRepo = {
      findByPmId: jest.fn(),
      findByPmUuid: jest.fn(),
      ensureProfile: jest.fn(),
      update: jest.fn(),
    };
    mockPmQualRepo = {
      assign: jest.fn(),
      remove: jest.fn(),
      findByPmId: jest.fn(),
      findByPmAndQualification: jest.fn(),
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

  describe('TogglePmAllianceEnablementUseCase', () => {
    let useCase: TogglePmAllianceEnablementUseCase;

    beforeEach(() => {
      useCase = new TogglePmAllianceEnablementUseCase(
        mockProfileRepo,
        mockPrisma,
        mockActivityLogService,
      );
    });

    it('should throw NotFoundException if PM does not exist', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent-pm-uuid', true, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enable Alliance when profile exists and is disabled', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 1,
        uuid: 'pm-uuid-1',
        businessName: 'Apex Living',
      });
      const initialProfile: AlliancePmProfileEntity = {
        id: 10,
        uuid: 'profile-uuid-1',
        pmId: 1,
        isEnabled: false,
        enabledAt: null,
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProfileRepo.ensureProfile.mockResolvedValue(initialProfile);
      mockProfileRepo.update.mockResolvedValue({
        ...initialProfile,
        isEnabled: true,
        enabledAt: new Date(),
      });

      const result = await useCase.execute('pm-uuid-1', true, 'admin-1');

      expect(result.isEnabled).toBe(true);
      expect(mockProfileRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isEnabled: true }),
      );
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ALLIANCE_ENABLED',
          entityType: 'ALLIANCE_PROFILE',
        }),
      );
    });

    it('should be idempotent when enabling an already enabled profile', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 1,
        uuid: 'pm-uuid-1',
        businessName: 'Apex Living',
      });
      const existingProfile: AlliancePmProfileEntity = {
        id: 10,
        uuid: 'profile-uuid-1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProfileRepo.ensureProfile.mockResolvedValue(existingProfile);

      const result = await useCase.execute('pm-uuid-1', true, 'admin-1');

      expect(result.isEnabled).toBe(true);
      expect(mockProfileRepo.update).not.toHaveBeenCalled();
      expect(mockActivityLogService.log).not.toHaveBeenCalled();
    });

    it('should disable Alliance and set disabledAt without destroying profile', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({
        id: 1,
        uuid: 'pm-uuid-1',
        businessName: 'Apex Living',
      });
      const existingProfile: AlliancePmProfileEntity = {
        id: 10,
        uuid: 'profile-uuid-1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: 'Senior Broker',
        bio: 'Premier Real Estate',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProfileRepo.ensureProfile.mockResolvedValue(existingProfile);
      mockProfileRepo.update.mockResolvedValue({
        ...existingProfile,
        isEnabled: false,
        disabledAt: new Date(),
      });

      const result = await useCase.execute('pm-uuid-1', false, 'admin-1');

      expect(result.isEnabled).toBe(false);
      expect(result.pmTitle).toBe('Senior Broker');
      expect(mockProfileRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isEnabled: false }),
      );
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ALLIANCE_DISABLED',
          entityType: 'ALLIANCE_PROFILE',
        }),
      );
    });
  });

  describe('GetPmAllianceProfileUseCase', () => {
    let useCase: GetPmAllianceProfileUseCase;

    beforeEach(() => {
      useCase = new GetPmAllianceProfileUseCase(
        mockProfileRepo,
        mockPmQualRepo,
        mockPrisma,
      );
    });

    it('should return default profile if PM exists', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 2, uuid: 'pm-uuid-2' });
      mockProfileRepo.ensureProfile.mockResolvedValue({
        id: 5,
        uuid: 'profile-uuid-5',
        pmId: 2,
        isEnabled: false,
        enabledAt: null,
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPmQualRepo.findByPmId.mockResolvedValue([]);

      const result = await useCase.execute(2);

      expect(result.pmId).toBe(2);
      expect(result.isEnabled).toBe(false);
      expect(result.pmTitle).toBeNull();
      expect(result.bio).toBeNull();
      expect(result.qualifications).toEqual([]);
    });

    it('should return existing profile with active qualifications', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 2, uuid: 'pm-uuid-2' });
      mockProfileRepo.ensureProfile.mockResolvedValue({
        id: 5,
        uuid: 'profile-uuid-5',
        pmId: 2,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: 'Lead Asset Manager',
        bio: 'Managing prime commercial & residential assets',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPmQualRepo.findByPmId.mockResolvedValue([
        {
          id: 1,
          uuid: 'pm-qual-1',
          pmId: 2,
          qualificationId: 10,
          assignedByAdminId: 'admin-1',
          assignedAt: new Date(),
          qualification: {
            id: 10,
            uuid: 'qual-10',
            slug: 'niesv-registered',
            name: 'NIESV Registered',
            description: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ]);

      const result = await useCase.execute(2);

      expect(result.isEnabled).toBe(true);
      expect(result.pmTitle).toBe('Lead Asset Manager');
      expect(result.bio).toBe('Managing prime commercial & residential assets');
      expect(result.qualifications).toHaveLength(1);
      expect(result.qualifications[0]?.slug).toBe('niesv-registered');
    });
  });

  describe('UpdatePmAllianceProfileUseCase', () => {
    let useCase: UpdatePmAllianceProfileUseCase;

    beforeEach(() => {
      useCase = new UpdatePmAllianceProfileUseCase(
        mockProfileRepo,
        mockPrisma,
      );
    });

    it('should allow PM to update their title and bio even when disabled', async () => {
      mockPrisma.upward_property_manager.findUnique.mockResolvedValue({ id: 3 });
      mockProfileRepo.ensureProfile.mockResolvedValue({
        id: 8,
        uuid: 'profile-uuid-8',
        pmId: 3,
        isEnabled: false,
        enabledAt: null,
        disabledAt: null,
        pmTitle: 'Old Title',
        bio: 'Old Bio',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockProfileRepo.update.mockResolvedValue({
        id: 8,
        uuid: 'profile-uuid-8',
        pmId: 3,
        isEnabled: false,
        enabledAt: null,
        disabledAt: null,
        pmTitle: 'Principal Partner',
        bio: 'Specializing in Ikoyi and Victoria Island listings',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await useCase.execute(3, {
        pmTitle: 'Principal Partner',
        bio: 'Specializing in Ikoyi and Victoria Island listings',
      });

      expect(result.pmTitle).toBe('Principal Partner');
      expect(result.bio).toBe('Specializing in Ikoyi and Victoria Island listings');
      expect(mockProfileRepo.update).toHaveBeenCalledWith(3, {
        pmTitle: 'Principal Partner',
        bio: 'Specializing in Ikoyi and Victoria Island listings',
      });
    });
  });
});
