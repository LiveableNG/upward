import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAllianceReferralUseCase } from '@application/alliance/use-cases/create-alliance-referral.use-case';
import { ListPmAllianceReferralsUseCase } from '@application/alliance/use-cases/list-pm-alliance-referrals.use-case';
import { GetAllianceReferralDetailUseCase } from '@application/alliance/use-cases/get-alliance-referral-detail.use-case';
import { UpdateAllianceLeadStageUseCase } from '@application/alliance/use-cases/update-alliance-lead-stage.use-case';
import { CloseAllianceReferralUseCase } from '@application/alliance/use-cases/close-alliance-referral.use-case';
import {
  IAllianceListingRepository,
  IAllianceProfileRepository,
  IAllianceReferralRepository,
} from '@domains/alliance/alliance.repository.interface';
import { UserRepository } from '@domains/users/user.repository';
import { PmActorContext } from '@domains/pm/types/pm-actor-context';
import {
  AllianceListingEntity,
  AlliancePmProfileEntity,
  AllianceReferralEntity,
} from '@domains/alliance/alliance.entity';
import { NotificationService } from '@shared/infrastructure/common/notification.service';
import { EmailService } from '@shared/infrastructure/email/email.service';
import { ActivityLogService } from '@shared/application/activity-log.service';

describe('Alliance Referral & Lead Use Cases (Stage 2)', () => {
  let mockListingRepo: jest.Mocked<IAllianceListingRepository>;
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>;
  let mockReferralRepo: jest.Mocked<IAllianceReferralRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockActivityLogService: jest.Mocked<ActivityLogService>;

  let createReferralUseCase: CreateAllianceReferralUseCase;
  let listReferralsUseCase: ListPmAllianceReferralsUseCase;
  let getDetailUseCase: GetAllianceReferralDetailUseCase;
  let updateStageUseCase: UpdateAllianceLeadStageUseCase;
  let closeReferralUseCase: CloseAllianceReferralUseCase;

  const referringActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: false,
  };

  const employeeActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: true,
    employeeId: 101,
    accessLevel: 'FULL',
  };

  const otherPmActor: PmActorContext = {
    ownerPmId: 99,
    isEmployee: false,
  };

  const mockReferringProfile: AlliancePmProfileEntity = {
    id: 1,
    uuid: 'prof-uuid-1',
    pmId: 1,
    isEnabled: true,
    enabledAt: new Date(),
    disabledAt: null,
    pmTitle: 'Senior Broker',
    bio: 'Experienced PM',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOwnerProfile: AlliancePmProfileEntity = {
    id: 2,
    uuid: 'prof-uuid-2',
    pmId: 2,
    isEnabled: true,
    enabledAt: new Date(),
    disabledAt: null,
    pmTitle: 'Owner PM',
    bio: 'Listing Owner',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListingEntity: AllianceListingEntity = {
    id: 10,
    uuid: 'listing-uuid-10',
    pmId: 2,
    sourceType: 'INDEPENDENT',
    targetType: 'PROPERTY',
    intent: 'RENT',
    status: 'PUBLISHED',
    visibility: 'ALLIANCE',
    targetPropertyId: null,
    targetUnitId: null,
    isSourceDeleted: false,
    sourceDeletedAt: null,
    title: 'Luxury 3 Bed Apartment in Lekki',
    description: 'Fully serviced apartment with pool',
    currency: 'NGN',
    price: 5000000,
    address: 'Admiralty Way',
    city: 'Lekki',
    state: 'Lagos',
    country: 'Nigeria',
    propertyType: 'FLAT_APARTMENT',
    bedrooms: 3,
    bathrooms: 3,
    publishedAt: new Date(),
    unpublishedAt: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    media: [],
  };

  const mockReferralEntity: AllianceReferralEntity = {
    id: 100,
    uuid: 'ref-uuid-100',
    listingId: 10,
    referringPmId: 1,
    matchedUserId: 50,
    clientIdentityKey: 'usr:50',
    clientName: 'Jane Doe',
    clientEmail: 'jane.doe@example.com',
    clientPhone: '+2348012345678',
    clientNormalizedEmail: 'jane.doe@example.com',
    clientNormalizedPhone: '+2348012345678',
    shareToken: 'token-uuid-100',
    status: 'ACTIVE',
    stage: 'NEW',
    notes: 'Interested in annual lease',
    createdAt: new Date(),
    updatedAt: new Date(),
    convertedAt: null,
    closedAt: null,
    listing: mockListingEntity,
  };

  beforeEach(() => {
    mockListingRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findPublishedByTargetProperty: jest.fn(),
      findPublishedByTargetUnit: jest.fn(),
      update: jest.fn(),
      findPmListings: jest.fn(),
      deleteDraft: jest.fn(),
      findDiscoverableListings: jest.fn(),
      findDiscoverableByUuid: jest.fn(),
      findPublicMarketplaceListings: jest.fn(),
      findPublicByUuid: jest.fn(),
    };

    mockProfileRepo = {
      findByPmId: jest.fn(),
      findByPmUuid: jest.fn(),
      ensureProfile: jest.fn(),
      update: jest.fn(),
    };

    mockReferralRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByShareToken: jest.fn(),
      findActiveReferral: jest.fn(),
      update: jest.fn(),
      findPmReferrals: jest.fn(),
      countActiveByListingId: jest.fn(),
      findActiveReferralsByListingId: jest.fn(),
    };

    mockUserRepo = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByProviderId: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      updatePmTenantEmail: jest.fn(),
    };

    mockNotificationService = {
      notifyUser: jest.fn(),
      broadcastPush: jest.fn(),
      markAsRead: jest.fn(),
    } as any;

    mockEmailService = {
      sendEmailWithRetry: jest.fn(),
    } as any;

    mockActivityLogService = {
      log: jest.fn(),
      logPropertyAction: jest.fn(),
      logUnitAction: jest.fn(),
      getLogsForCollaborator: jest.fn(),
    } as any;

    createReferralUseCase = new CreateAllianceReferralUseCase(
      mockListingRepo,
      mockProfileRepo,
      mockReferralRepo,
      mockUserRepo,
      mockNotificationService,
      mockEmailService,
      mockActivityLogService,
    );

    listReferralsUseCase = new ListPmAllianceReferralsUseCase(
      mockProfileRepo,
      mockReferralRepo,
    );

    getDetailUseCase = new GetAllianceReferralDetailUseCase(
      mockProfileRepo,
      mockReferralRepo,
    );

    updateStageUseCase = new UpdateAllianceLeadStageUseCase(
      mockProfileRepo,
      mockReferralRepo,
      mockActivityLogService,
      mockNotificationService,
    );

    closeReferralUseCase = new CloseAllianceReferralUseCase(
      mockProfileRepo,
      mockReferralRepo,
      mockActivityLogService,
    );
  });

  describe('CreateAllianceReferralUseCase', () => {
    it('should throw ForbiddenException if referring PM is not enabled for Alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        ...mockReferringProfile,
        isEnabled: false,
      });

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Jane Doe', clientEmail: 'jane@example.com' },
          referringActor,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockReferralRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if neither email nor phone is provided', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Jane Doe' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if listing does not exist', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockListingRepo.findByUuid.mockResolvedValue(null);

      await expect(
        createReferralUseCase.execute(
          'non-existent-uuid',
          { clientName: 'Jane Doe', clientEmail: 'jane@example.com' },
          referringActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if PM attempts to refer their own listing', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockListingRepo.findByUuid.mockResolvedValue({
        ...mockListingEntity,
        pmId: 1, // Same as referringActor.ownerPmId
      });

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Jane Doe', clientEmail: 'jane@example.com' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if listing is not published', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockListingRepo.findByUuid.mockResolvedValue({
        ...mockListingEntity,
        status: 'DRAFT',
      });

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Jane Doe', clientEmail: 'jane@example.com' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if listing is private', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockListingRepo.findByUuid.mockResolvedValue({
        ...mockListingEntity,
        visibility: 'PRIVATE',
      });

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Jane Doe', clientEmail: 'jane@example.com' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if listing owner is disabled for Alliance', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockReferringProfile)
        .mockResolvedValueOnce({ ...mockOwnerProfile, isEnabled: false });
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Jane Doe', clientEmail: 'jane@example.com' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should match an existing Upward user by email and enforce exclusivity', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockReferringProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);

      mockUserRepo.findByEmail.mockResolvedValue({
        id: 50,
        uuid: 'user-uuid-50',
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        emailHash: 'hash',
        firstNameHash: 'hash',
        lastNameHash: 'hash',
        passwordHash: 'hash',
        isFromWaitlist: false,
        isFromInvite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // No existing active referral
      mockReferralRepo.findActiveReferral.mockResolvedValue(null);
      mockReferralRepo.create.mockResolvedValue(mockReferralEntity);

      const result = await createReferralUseCase.execute(
        'listing-uuid-10',
        { clientName: 'Jane Doe', clientEmail: ' Jane.Doe@Example.com ' },
        referringActor,
      );

      expect(result).toEqual(mockReferralEntity);
      expect(mockReferralRepo.findActiveReferral).toHaveBeenCalledWith(10, 'usr:50');
      expect(mockReferralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: 10,
          referringPmId: 1,
          matchedUserId: 50,
          clientIdentityKey: 'usr:50',
          clientNormalizedEmail: 'jane.doe@example.com',
        }),
      );
      expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
        50,
        expect.objectContaining({
          title: 'New Property Shared With You',
        }),
      );
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_ALLIANCE_REFERRAL',
          entityType: 'ALLIANCE_REFERRAL',
        }),
      );
    });

    it('should match an existing Upward user by normalized phone', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockReferringProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.findByPhone.mockResolvedValue({
        id: 77,
        uuid: 'user-uuid-77',
        email: 'chidi@example.com',
        phone: '+2348098765432',
        firstName: 'Chidi',
        lastName: 'Okeke',
        emailHash: 'hash',
        firstNameHash: 'hash',
        lastNameHash: 'hash',
        passwordHash: 'hash',
        isFromWaitlist: false,
        isFromInvite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockReferralRepo.findActiveReferral.mockResolvedValue(null);
      mockReferralRepo.create.mockResolvedValue({
        ...mockReferralEntity,
        matchedUserId: 77,
        clientIdentityKey: 'usr:77',
      });

      await createReferralUseCase.execute(
        'listing-uuid-10',
        { clientName: 'Chidi Okeke', clientPhone: '08098765432' },
        referringActor,
      );

      expect(mockUserRepo.findByPhone).toHaveBeenCalledWith('+2348098765432');
      expect(mockReferralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          matchedUserId: 77,
          clientIdentityKey: 'usr:77',
          clientNormalizedPhone: '+2348098765432',
        }),
      );
    });

    it('should support unmatched external prospect without creating fake user', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockReferringProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.findByPhone.mockResolvedValue(null);
      mockReferralRepo.findActiveReferral.mockResolvedValue(null);
      mockReferralRepo.create.mockResolvedValue({
        ...mockReferralEntity,
        matchedUserId: null,
        clientIdentityKey: 'email:external@gmail.com',
      });

      await createReferralUseCase.execute(
        'listing-uuid-10',
        { clientName: 'External Client', clientEmail: 'external@gmail.com' },
        referringActor,
      );

      expect(mockUserRepo.save).not.toHaveBeenCalled();
      expect(mockReferralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          matchedUserId: null,
          clientIdentityKey: 'email:external@gmail.com',
          clientNormalizedEmail: 'external@gmail.com',
        }),
      );
      expect(mockEmailService.sendEmailWithRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'external@gmail.com',
          subject: expect.stringContaining('Opportunity Shared:'),
        }),
      );
    });

    it('should throw BadRequestException when competing referral already active (Exclusivity)', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockReferringProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);
      mockUserRepo.findByEmail.mockResolvedValue(null);

      // Active referral already exists by PM 3
      mockReferralRepo.findActiveReferral.mockResolvedValue({
        ...mockReferralEntity,
        id: 999,
        referringPmId: 3,
      });

      await expect(
        createReferralUseCase.execute(
          'listing-uuid-10',
          { clientName: 'Competing Prospect', clientEmail: 'prospect@gmail.com' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockReferralRepo.create).not.toHaveBeenCalled();
    });

    it('should allow employee to create referral on behalf of owner PM', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockReferringProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockReferralRepo.findActiveReferral.mockResolvedValue(null);
      mockReferralRepo.create.mockResolvedValue(mockReferralEntity);

      await createReferralUseCase.execute(
        'listing-uuid-10',
        { clientName: 'Employee Client', clientEmail: 'client@example.com' },
        employeeActor,
      );

      expect(mockReferralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referringPmId: 1, // Owner PM ID
        }),
      );
    });
  });

  describe('ListPmAllianceReferralsUseCase', () => {
    it('should throw ForbiddenException if PM is not enabled for Alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        ...mockReferringProfile,
        isEnabled: false,
      });

      await expect(
        listReferralsUseCase.execute({ page: 1, limit: 20 }, referringActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated referrals for referring PM', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findPmReferrals.mockResolvedValue({
        items: [mockReferralEntity],
        total: 1,
      });

      const result = await listReferralsUseCase.execute(
        { page: 1, limit: 20, stage: 'NEW' },
        referringActor,
      );

      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockReferralRepo.findPmReferrals).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          stage: 'NEW',
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('GetAllianceReferralDetailUseCase', () => {
    it('should throw ForbiddenException if requesting PM does not own the referral', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...mockReferralEntity,
        referringPmId: 2, // Owned by PM 2, not PM 1
      });

      await expect(
        getDetailUseCase.execute('ref-uuid-100', referringActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if referral does not exist', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue(null);

      await expect(
        getDetailUseCase.execute('non-existent-uuid', referringActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return referral detail for authorized referring PM', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue(mockReferralEntity);

      const result = await getDetailUseCase.execute('ref-uuid-100', referringActor);

      expect(result).toEqual(mockReferralEntity);
    });
  });

  describe('UpdateAllianceLeadStageUseCase', () => {
    it('should throw ForbiddenException if non-owner attempts to update stage', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...mockReferralEntity,
        referringPmId: 2, // Owned by PM 2
      });

      await expect(
        updateStageUseCase.execute(
          'ref-uuid-100',
          { stage: 'VIEWING' },
          referringActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if attempting to update closed referral', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...mockReferralEntity,
        status: 'CLOSED',
      });

      await expect(
        updateStageUseCase.execute(
          'ref-uuid-100',
          { stage: 'VIEWING' },
          referringActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should be idempotent and not emit duplicate logs if stage is unchanged', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...mockReferralEntity,
        stage: 'VIEWING',
        notes: 'Client confirmed',
      });

      const result = await updateStageUseCase.execute(
        'ref-uuid-100',
        { stage: 'VIEWING', notes: 'Client confirmed' },
        referringActor,
      );

      expect(result.stage).toBe('VIEWING');
      expect(mockReferralRepo.update).not.toHaveBeenCalled();
      expect(mockActivityLogService.log).not.toHaveBeenCalled();
    });

    it('should successfully update stage to VIEWING and notify matched user', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue(mockReferralEntity);
      mockReferralRepo.update.mockResolvedValue({
        ...mockReferralEntity,
        stage: 'VIEWING',
      });

      const result = await updateStageUseCase.execute(
        'ref-uuid-100',
        { stage: 'VIEWING', notes: 'Scheduled for Saturday' },
        referringActor,
      );

      expect(result.stage).toBe('VIEWING');
      expect(mockReferralRepo.update).toHaveBeenCalledWith(100, {
        stage: 'VIEWING',
        status: 'ACTIVE',
        notes: 'Scheduled for Saturday',
        convertedAt: null,
        closedAt: null,
      });
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_ALLIANCE_LEAD_STAGE',
          entityType: 'ALLIANCE_REFERRAL',
        }),
      );
      expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
        50,
        expect.objectContaining({
          title: 'Referral Status Updated',
          message: expect.stringContaining('VIEWING'),
        }),
      );
    });

    it('should mark status CONVERTED when stage is CONVERTED', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue(mockReferralEntity);
      mockReferralRepo.update.mockResolvedValue({
        ...mockReferralEntity,
        stage: 'CONVERTED',
        status: 'CONVERTED',
        convertedAt: new Date(),
      });

      const result = await updateStageUseCase.execute(
        'ref-uuid-100',
        { stage: 'CONVERTED' },
        referringActor,
      );

      expect(result.status).toBe('CONVERTED');
      expect(mockReferralRepo.update).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          stage: 'CONVERTED',
          status: 'CONVERTED',
          convertedAt: expect.any(Date),
        }),
      );
    });

    it('should mark status LOST when stage is LOST', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue(mockReferralEntity);
      mockReferralRepo.update.mockResolvedValue({
        ...mockReferralEntity,
        stage: 'LOST',
        status: 'LOST',
        closedAt: new Date(),
      });

      const result = await updateStageUseCase.execute(
        'ref-uuid-100',
        { stage: 'LOST' },
        referringActor,
      );

      expect(result.status).toBe('LOST');
      expect(mockReferralRepo.update).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          stage: 'LOST',
          status: 'LOST',
          closedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('CloseAllianceReferralUseCase', () => {
    it('should throw ForbiddenException if non-owner attempts to close referral', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...mockReferralEntity,
        referringPmId: 2,
      });

      await expect(
        closeReferralUseCase.execute('ref-uuid-100', referringActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should be idempotent if referral is already closed', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...mockReferralEntity,
        status: 'CLOSED',
      });

      const result = await closeReferralUseCase.execute('ref-uuid-100', referringActor);

      expect(result.status).toBe('CLOSED');
      expect(mockReferralRepo.update).not.toHaveBeenCalled();
    });

    it('should successfully close an active referral', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockReferringProfile);
      mockReferralRepo.findByUuid.mockResolvedValue(mockReferralEntity);
      mockReferralRepo.update.mockResolvedValue({
        ...mockReferralEntity,
        status: 'CLOSED',
        closedAt: new Date(),
      });

      const result = await closeReferralUseCase.execute('ref-uuid-100', referringActor);

      expect(result.status).toBe('CLOSED');
      expect(mockReferralRepo.update).toHaveBeenCalledWith(100, {
        status: 'CLOSED',
        closedAt: expect.any(Date),
      });
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CLOSE_ALLIANCE_REFERRAL',
          entityType: 'ALLIANCE_REFERRAL',
        }),
      );
    });
  });
});
