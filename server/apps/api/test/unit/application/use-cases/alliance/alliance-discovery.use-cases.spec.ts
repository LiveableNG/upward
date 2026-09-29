import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DiscoverAllianceListingsUseCase } from '@application/alliance/use-cases/discover-alliance-listings.use-case';
import { GetDiscoveredAllianceListingDetailUseCase } from '@application/alliance/use-cases/get-discovered-alliance-listing-detail.use-case';
import {
  IAllianceListingRepository,
  IAllianceProfileRepository,
  IAllianceRatingRepository,
} from '@domains/alliance/alliance.repository.interface';
import { PmActorContext } from '@domains/pm/types/pm-actor-context';
import {
  AllianceListingEntity,
  AlliancePmProfileEntity,
} from '@domains/alliance/alliance.entity';

describe('Alliance Discovery Use Cases (Stage 1E)', () => {
  let mockListingRepo: jest.Mocked<IAllianceListingRepository>;
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>;
  let mockRatingRepo: jest.Mocked<IAllianceRatingRepository>;
  let mockS3Service: any;

  let discoverUseCase: DiscoverAllianceListingsUseCase;
  let getDetailUseCase: GetDiscoveredAllianceListingDetailUseCase;

  const enabledActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: false,
  };

  const employeeActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: true,
    employeeId: 101,
    accessLevel: 'FULL',
  };

  const mockEnabledProfile: AlliancePmProfileEntity = {
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
    title: 'Luxury 3 Bed Apartment',
    description: 'Fully serviced apartment with amenities',
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
    media: [
      {
        id: 1,
        uuid: 'media-1',
        listingId: 10,
        storageKey: 'uploads/photo1.jpg',
        publicUrl: 'https://cdn.example.com/photo1.jpg',
        mimeType: 'image/jpeg',
        fileSize: 102400,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    pm: {
      id: 2,
      uuid: 'pm-uuid-2',
      name: 'Apex Manager',
      companyName: 'Apex Real Estate',
      allianceProfile: {
        pmTitle: 'Certified Broker',
        bio: 'Top rated in Lagos',
        isEnabled: true,
      },
      qualifications: [
        {
          qualification: {
            id: 1,
            uuid: 'qual-1',
            name: 'Verified Agent',
            slug: 'verified-agent',
            isActive: true,
          },
        },
      ],
    },
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

    mockRatingRepo = {
      create: jest.fn(),
      findByReferralAndAuthor: jest.fn(),
      getRatingSummaryForSubject: jest.fn().mockResolvedValue({
        averageScore: 5.0,
        totalRatings: 1,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
      }),
      listRatingsForSubject: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    mockS3Service = {
      getDownloadUrl: jest.fn().mockImplementation((url: string) => Promise.resolve(url)),
      getUploadUrl: jest.fn().mockResolvedValue('https://s3.signed-upload-url.com'),
      uploadBuffer: jest.fn().mockResolvedValue('https://s3.signed-upload-url.com'),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    discoverUseCase = new DiscoverAllianceListingsUseCase(mockListingRepo, mockProfileRepo, mockRatingRepo, mockS3Service);
    getDetailUseCase = new GetDiscoveredAllianceListingDetailUseCase(mockListingRepo, mockProfileRepo, mockRatingRepo, mockS3Service);
  });

  describe('DiscoverAllianceListingsUseCase', () => {
    it('should throw ForbiddenException if requesting PM is not enabled for Alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        ...mockEnabledProfile,
        isEnabled: false,
      });

      await expect(
        discoverUseCase.execute({ page: 1, limit: 20 }, enabledActor),
      ).rejects.toThrow(ForbiddenException);

      expect(mockListingRepo.findDiscoverableListings).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if requesting PM has no alliance profile', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(null);

      await expect(
        discoverUseCase.execute({ page: 1, limit: 20 }, enabledActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated discovered listings for enabled PM', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findDiscoverableListings.mockResolvedValue({
        items: [mockListingEntity],
        total: 1,
      });

      const result = await discoverUseCase.execute(
        { page: 1, limit: 20, search: 'Lekki', intent: 'RENT' },
        enabledActor,
      );

      expect(result.items).toEqual([mockListingEntity]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockListingRepo.findDiscoverableListings).toHaveBeenCalledWith(1, {
        search: 'Lekki',
        intent: 'RENT',
        targetType: undefined,
        propertyType: undefined,
        state: undefined,
        city: undefined,
        sortBy: undefined,
        skip: 0,
        take: 20,
      });
    });

    it('should support employee inheriting owner PM alliance access', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findDiscoverableListings.mockResolvedValue({
        items: [mockListingEntity],
        total: 1,
      });

      const result = await discoverUseCase.execute({ page: 2, limit: 10 }, employeeActor);

      expect(result.items).toHaveLength(1);
      expect(result.meta.page).toBe(2);
      expect(mockListingRepo.findDiscoverableListings).toHaveBeenCalledWith(1, expect.objectContaining({
        skip: 10,
        take: 10,
      }));
    });
  });

  describe('GetDiscoveredAllianceListingDetailUseCase', () => {
    it('should throw ForbiddenException if requesting PM is not enabled for Alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        ...mockEnabledProfile,
        isEnabled: false,
      });

      await expect(
        getDetailUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(ForbiddenException);

      expect(mockListingRepo.findDiscoverableByUuid).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if listing does not exist or is not discoverable', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findDiscoverableByUuid.mockResolvedValue(null);

      await expect(
        getDetailUseCase.execute('non-existent-uuid', enabledActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return discovered listing detail for valid discoverable listing', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findDiscoverableByUuid.mockResolvedValue(mockListingEntity);

      const result = await getDetailUseCase.execute('listing-uuid-10', enabledActor);

      expect(result).toEqual(mockListingEntity);
      expect(mockListingRepo.findDiscoverableByUuid).toHaveBeenCalledWith('listing-uuid-10', 1);
    });
  });
});
