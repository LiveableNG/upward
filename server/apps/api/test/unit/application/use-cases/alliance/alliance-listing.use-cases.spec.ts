import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateAllianceListingUseCase } from '@application/alliance/use-cases/create-alliance-listing.use-case';
import { GetAllianceListingUseCase } from '@application/alliance/use-cases/get-alliance-listing.use-case';
import { UpdateAllianceListingUseCase } from '@application/alliance/use-cases/update-alliance-listing.use-case';
import { PublishAllianceListingUseCase } from '@application/alliance/use-cases/publish-alliance-listing.use-case';
import { UnpublishAllianceListingUseCase } from '@application/alliance/use-cases/unpublish-alliance-listing.use-case';
import { ArchiveAllianceListingUseCase } from '@application/alliance/use-cases/archive-alliance-listing.use-case';
import { ListPmAllianceListingsUseCase } from '@application/alliance/use-cases/list-pm-alliance-listings.use-case';
import {
  IAllianceListingRepository,
  IAllianceProfileRepository,
} from '@domains/alliance/alliance.repository.interface';
import { ActivityLogService } from '@shared/application/activity-log.service';
import { AllianceListingEntity } from '@domains/alliance/alliance.entity';
import { PmActorContext } from '@domains/pm/types/pm-actor-context';

describe('Alliance Listing Use Cases (Stage 1B)', () => {
  let mockListingRepo: jest.Mocked<IAllianceListingRepository>;
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>;
  let mockPrisma: any;
  let mockActivityLogService: jest.Mocked<ActivityLogService>;

  const defaultActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: false,
  };

  const employeeActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: true,
    employeeId: 101,
    accessLevel: 'CUSTOM',
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
    };
    mockProfileRepo = {
      findByPmId: jest.fn(),
      findByPmUuid: jest.fn(),
      ensureProfile: jest.fn(),
      update: jest.fn(),
    };
    mockPrisma = {
      upward_pm_property: {
        findUnique: jest.fn(),
      },
      upward_pm_unit: {
        findUnique: jest.fn(),
      },
      upward_pm_employee_property: {
        findFirst: jest.fn(),
      },
    };
    mockActivityLogService = {
      log: jest.fn(),
    } as any;
  });

  describe('CreateAllianceListingUseCase', () => {
    let useCase: CreateAllianceListingUseCase;

    beforeEach(() => {
      useCase = new CreateAllianceListingUseCase(
        mockListingRepo,
        mockProfileRepo,
        mockPrisma,
        mockActivityLogService,
      );
    });

    it('should throw ForbiddenException if PM is not Alliance-enabled', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: false,
        enabledAt: null,
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        useCase.execute(
          {
            sourceType: 'INDEPENDENT',
            targetType: 'PROPERTY',
            title: 'Luxury Villa',
          },
          defaultActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully create an INDEPENDENT property listing in DRAFT status', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdListing: AllianceListingEntity = {
        id: 10,
        uuid: 'listing-uuid-10',
        pmId: 1,
        sourceType: 'INDEPENDENT',
        targetType: 'PROPERTY',
        intent: 'SALE',
        status: 'DRAFT',
        targetPropertyId: null,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Luxury Villa Banana Island',
        description: 'Prime mansion',
        currency: 'NGN',
        price: 850000000,
        address: '10 Banana Island Road',
        city: 'Ikoyi',
        state: 'Lagos',
        country: 'Nigeria',
        propertyType: 'Detached Duplex',
        bedrooms: 5,
        bathrooms: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: null,
      };
      mockListingRepo.create.mockResolvedValue(createdListing);

      const result = await useCase.execute(
        {
          sourceType: 'INDEPENDENT',
          targetType: 'PROPERTY',
          intent: 'SALE',
          title: 'Luxury Villa Banana Island',
          description: 'Prime mansion',
          price: 850000000,
          address: '10 Banana Island Road',
          city: 'Ikoyi',
          state: 'Lagos',
          propertyType: 'Detached Duplex',
          bedrooms: 5,
          bathrooms: 6,
        },
        defaultActor,
      );

      expect(result.status).toBe('DRAFT');
      expect(result.sourceType).toBe('INDEPENDENT');
      expect(result.targetType).toBe('PROPERTY');
      expect(mockListingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pmId: 1,
          targetPropertyId: null,
          targetUnitId: null,
          title: 'Luxury Villa Banana Island',
        }),
      );
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_ALLIANCE_LISTING',
          entityType: 'ALLIANCE_LISTING',
        }),
      );
    });

    it('should reject INDEPENDENT listing if canonical references are provided', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        useCase.execute(
          {
            sourceType: 'INDEPENDENT',
            targetType: 'PROPERTY',
            title: 'Invalid',
            targetPropertyUuid: 'prop-uuid',
          },
          defaultActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create a LINKED_INVENTORY property listing', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.upward_pm_property.findUnique.mockResolvedValue({
        id: 50,
        pmId: 1,
        name: 'Apex Heights',
        address: '15 Victoria Island',
      });

      mockListingRepo.create.mockResolvedValue({
        id: 11,
        uuid: 'listing-uuid-11',
        pmId: 1,
        sourceType: 'LINKED_INVENTORY',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'DRAFT',
        targetPropertyId: 50,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Apex Heights Tower',
        description: null,
        currency: 'NGN',
        price: 25000000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: null,
      });

      const result = await useCase.execute(
        {
          sourceType: 'LINKED_INVENTORY',
          targetType: 'PROPERTY',
          targetPropertyUuid: 'prop-uuid-50',
          title: 'Apex Heights Tower',
          price: 25000000,
        },
        defaultActor,
      );

      expect(result.sourceType).toBe('LINKED_INVENTORY');
      expect(result.targetPropertyId).toBe(50);
      expect(mockListingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetPropertyId: 50,
          targetUnitId: null,
        }),
      );
    });

    it('should reject LINKED_INVENTORY if property does not belong to PM', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.upward_pm_property.findUnique.mockResolvedValue({
        id: 50,
        pmId: 99, // Another PM
        name: 'Other PM Property',
      });

      await expect(
        useCase.execute(
          {
            sourceType: 'LINKED_INVENTORY',
            targetType: 'PROPERTY',
            targetPropertyUuid: 'prop-uuid-50',
            title: 'Attempted Hijack',
          },
          defaultActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject employee if not assigned to property (CUSTOM access)', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.upward_pm_property.findUnique.mockResolvedValue({
        id: 50,
        pmId: 1,
        name: 'Apex Heights',
      });

      mockPrisma.upward_pm_employee_property.findFirst.mockResolvedValue(null);

      await expect(
        useCase.execute(
          {
            sourceType: 'LINKED_INVENTORY',
            targetType: 'PROPERTY',
            targetPropertyUuid: 'prop-uuid-50',
            title: 'Apex Heights Tower',
          },
          employeeActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PublishAllianceListingUseCase', () => {
    let useCase: PublishAllianceListingUseCase;

    beforeEach(() => {
      useCase = new PublishAllianceListingUseCase(
        mockListingRepo,
        mockProfileRepo,
        mockPrisma,
        mockActivityLogService,
      );
    });

    it('should publish a valid DRAFT listing and transition to PUBLISHED', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const draftListing: AllianceListingEntity = {
        id: 20,
        uuid: 'listing-20',
        pmId: 1,
        sourceType: 'LINKED_INVENTORY',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'DRAFT',
        targetPropertyId: 50,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Verified Penthouse',
        description: 'Prime views',
        currency: 'NGN',
        price: 15000000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: null,
      };
      mockListingRepo.findByUuid.mockResolvedValue(draftListing);
      mockPrisma.upward_pm_property.findUnique.mockResolvedValue({ id: 50, pmId: 1 });
      mockListingRepo.findPublishedByTargetProperty.mockResolvedValue(null);
      mockListingRepo.update.mockResolvedValue({
        ...draftListing,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });

      const result = await useCase.execute('listing-20', defaultActor);

      expect(result.status).toBe('PUBLISHED');
      expect(mockListingRepo.update).toHaveBeenCalledWith(
        20,
        expect.objectContaining({
          status: 'PUBLISHED',
        }),
      );
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PUBLISH_ALLIANCE_LISTING',
        }),
      );
    });

    it('should reject publishing if another published listing exists for the canonical property', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const draftListing: AllianceListingEntity = {
        id: 21,
        uuid: 'listing-21',
        pmId: 1,
        sourceType: 'LINKED_INVENTORY',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'DRAFT',
        targetPropertyId: 50,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Second Listing for same Property',
        description: null,
        currency: 'NGN',
        price: 15000000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: null,
      };
      mockListingRepo.findByUuid.mockResolvedValue(draftListing);
      mockPrisma.upward_pm_property.findUnique.mockResolvedValue({ id: 50, pmId: 1 });
      
      // Existing active published listing with ID 20
      mockListingRepo.findPublishedByTargetProperty.mockResolvedValue({
        id: 20,
        uuid: 'listing-20',
        pmId: 1,
        sourceType: 'LINKED_INVENTORY',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'PUBLISHED',
        targetPropertyId: 50,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'First Listing',
        description: null,
        currency: 'NGN',
        price: 15000000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        unpublishedAt: null,
        archivedAt: null,
      });

      await expect(
        useCase.execute('listing-21', defaultActor),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject publishing if canonical source was marked deleted', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockListingRepo.findByUuid.mockResolvedValue({
        id: 22,
        uuid: 'listing-22',
        pmId: 1,
        sourceType: 'LINKED_INVENTORY',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'DRAFT',
        targetPropertyId: 50,
        targetUnitId: null,
        isSourceDeleted: true,
        sourceDeletedAt: new Date(),
        title: 'Orphaned Listing',
        description: null,
        currency: 'NGN',
        price: 10000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: null,
      });

      await expect(
        useCase.execute('listing-22', defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject publishing ARCHIVED listings', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        id: 1,
        uuid: 'p1',
        pmId: 1,
        isEnabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        pmTitle: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockListingRepo.findByUuid.mockResolvedValue({
        id: 23,
        uuid: 'listing-23',
        pmId: 1,
        sourceType: 'INDEPENDENT',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'ARCHIVED',
        targetPropertyId: null,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Archived Listing',
        description: null,
        currency: 'NGN',
        price: 10000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: new Date(),
      });

      await expect(
        useCase.execute('listing-23', defaultActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UnpublishAllianceListingUseCase & ArchiveAllianceListingUseCase', () => {
    let unpublishUseCase: UnpublishAllianceListingUseCase;
    let archiveUseCase: ArchiveAllianceListingUseCase;

    beforeEach(() => {
      unpublishUseCase = new UnpublishAllianceListingUseCase(
        mockListingRepo,
        mockActivityLogService,
      );
      archiveUseCase = new ArchiveAllianceListingUseCase(
        mockListingRepo,
        mockActivityLogService,
      );
    });

    it('should unpublish a PUBLISHED listing', async () => {
      const publishedListing: AllianceListingEntity = {
        id: 30,
        uuid: 'listing-30',
        pmId: 1,
        sourceType: 'INDEPENDENT',
        targetType: 'UNIT',
        intent: 'RENT',
        status: 'PUBLISHED',
        targetPropertyId: null,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Studio Unit',
        description: null,
        currency: 'NGN',
        price: 1200000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        unpublishedAt: null,
        archivedAt: null,
      };
      mockListingRepo.findByUuid.mockResolvedValue(publishedListing);
      mockListingRepo.update.mockResolvedValue({
        ...publishedListing,
        status: 'UNPUBLISHED',
        unpublishedAt: new Date(),
      });

      const result = await unpublishUseCase.execute('listing-30', defaultActor);
      expect(result.status).toBe('UNPUBLISHED');
      expect(mockListingRepo.update).toHaveBeenCalledWith(
        30,
        expect.objectContaining({ status: 'UNPUBLISHED' }),
      );
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UNPUBLISH_ALLIANCE_LISTING' }),
      );
    });

    it('should archive a listing and set archivedAt', async () => {
      const listing: AllianceListingEntity = {
        id: 31,
        uuid: 'listing-31',
        pmId: 1,
        sourceType: 'INDEPENDENT',
        targetType: 'UNIT',
        intent: 'RENT',
        status: 'UNPUBLISHED',
        targetPropertyId: null,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Studio Unit',
        description: null,
        currency: 'NGN',
        price: 1200000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: new Date(),
        archivedAt: null,
      };
      mockListingRepo.findByUuid.mockResolvedValue(listing);
      mockListingRepo.update.mockResolvedValue({
        ...listing,
        status: 'ARCHIVED',
        archivedAt: new Date(),
      });

      const result = await archiveUseCase.execute('listing-31', defaultActor);
      expect(result.status).toBe('ARCHIVED');
      expect(mockListingRepo.update).toHaveBeenCalledWith(
        31,
        expect.objectContaining({ status: 'ARCHIVED' }),
      );
    });
  });

  describe('UpdateAllianceListingUseCase', () => {
    let useCase: UpdateAllianceListingUseCase;

    beforeEach(() => {
      useCase = new UpdateAllianceListingUseCase(
        mockListingRepo,
        mockActivityLogService,
      );
    });

    it('should update presentation fields without touching canonical inventory', async () => {
      const listing: AllianceListingEntity = {
        id: 40,
        uuid: 'listing-40',
        pmId: 1,
        sourceType: 'LINKED_INVENTORY',
        targetType: 'PROPERTY',
        intent: 'RENT',
        status: 'DRAFT',
        targetPropertyId: 50,
        targetUnitId: null,
        isSourceDeleted: false,
        sourceDeletedAt: null,
        title: 'Old Title',
        description: 'Old Desc',
        currency: 'NGN',
        price: 1000000,
        address: null,
        city: null,
        state: null,
        country: 'Nigeria',
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        unpublishedAt: null,
        archivedAt: null,
      };
      mockListingRepo.findByUuid.mockResolvedValue(listing);
      mockListingRepo.update.mockResolvedValue({
        ...listing,
        title: 'New Marketing Title',
        price: 1200000,
      });

      const result = await useCase.execute(
        'listing-40',
        {
          title: 'New Marketing Title',
          price: 1200000,
        },
        defaultActor,
      );

      expect(result.title).toBe('New Marketing Title');
      expect(result.price).toBe(1200000);
      expect(mockListingRepo.update).toHaveBeenCalledWith(
        40,
        expect.objectContaining({
          title: 'New Marketing Title',
          price: 1200000,
        }),
      );
    });
  });
});
