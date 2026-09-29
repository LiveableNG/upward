import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TrackAllianceListingUseCase } from '@application/alliance/use-cases/track-alliance-listing.use-case';
import { UntrackAllianceListingUseCase } from '@application/alliance/use-cases/untrack-alliance-listing.use-case';
import {
  IAllianceListingRepository,
  IAllianceProfileRepository,
  IAllianceListingTrackerRepository,
} from '@domains/alliance/alliance.repository.interface';
import { PmActorContext } from '@domains/pm/types/pm-actor-context';
import {
  AllianceListingEntity,
  AlliancePmProfileEntity,
} from '@domains/alliance/alliance.entity';

describe('Alliance Tracker Use Cases (Stage 1F)', () => {
  let mockListingRepo: jest.Mocked<IAllianceListingRepository>;
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>;
  let mockTrackerRepo: jest.Mocked<IAllianceListingTrackerRepository>;

  let trackUseCase: TrackAllianceListingUseCase;
  let untrackUseCase: UntrackAllianceListingUseCase;

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

  const mockOwnerProfile: AlliancePmProfileEntity = {
    id: 2,
    uuid: 'prof-uuid-2',
    pmId: 2,
    isEnabled: true,
    enabledAt: new Date(),
    disabledAt: null,
    pmTitle: 'Apex Owner',
    bio: 'Apex PM',
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
    media: [],
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
    };

    mockProfileRepo = {
      findByPmId: jest.fn(),
      findByPmUuid: jest.fn(),
      ensureProfile: jest.fn(),
      update: jest.fn(),
    };

    mockTrackerRepo = {
      track: jest.fn(),
      untrack: jest.fn(),
      isTracked: jest.fn(),
      countByListingId: jest.fn(),
      countByListingIds: jest.fn(),
      findTrackedListingIdsByPm: jest.fn(),
      findByListingAndPm: jest.fn(),
    };

    trackUseCase = new TrackAllianceListingUseCase(mockListingRepo, mockProfileRepo, mockTrackerRepo);
    untrackUseCase = new UntrackAllianceListingUseCase(mockListingRepo, mockProfileRepo, mockTrackerRepo);
  });

  describe('TrackAllianceListingUseCase', () => {
    it('should throw ForbiddenException if requesting PM is not enabled for Alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        ...mockEnabledProfile,
        isEnabled: false,
      });

      await expect(
        trackUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(ForbiddenException);

      expect(mockTrackerRepo.track).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if listing does not exist', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findByUuid.mockResolvedValue(null);

      await expect(
        trackUseCase.execute('non-existent-uuid', enabledActor),
      ).rejects.toThrow(NotFoundException);

      expect(mockTrackerRepo.track).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if PM attempts to track their own listing', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findByUuid.mockResolvedValue({
        ...mockListingEntity,
        pmId: 1, // Same as actor.ownerPmId
      });

      await expect(
        trackUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(BadRequestException);

      expect(mockTrackerRepo.track).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if listing is not published or not visible to alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findByUuid.mockResolvedValue({
        ...mockListingEntity,
        status: 'DRAFT',
      });

      await expect(
        trackUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(BadRequestException);

      expect(mockTrackerRepo.track).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if listing source is deleted', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findByUuid.mockResolvedValue({
        ...mockListingEntity,
        isSourceDeleted: true,
      });

      await expect(
        trackUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(BadRequestException);

      expect(mockTrackerRepo.track).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if listing owner is disabled for Alliance', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockEnabledProfile) // actor check
        .mockResolvedValueOnce({ ...mockOwnerProfile, isEnabled: false }); // owner check
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);

      await expect(
        trackUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(BadRequestException);

      expect(mockTrackerRepo.track).not.toHaveBeenCalled();
    });

    it('should successfully track an eligible listing', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockEnabledProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);
      mockTrackerRepo.track.mockResolvedValue({
        id: 1,
        uuid: 'tracker-uuid-1',
        listingId: 10,
        trackerPmId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await trackUseCase.execute('listing-uuid-10', enabledActor);

      expect(result).toEqual({ success: true, isTracked: true });
      expect(mockTrackerRepo.track).toHaveBeenCalledWith(10, 1);
    });

    it('should allow employee to track listing on behalf of owner PM', async () => {
      mockProfileRepo.findByPmId
        .mockResolvedValueOnce(mockEnabledProfile)
        .mockResolvedValueOnce(mockOwnerProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);

      const result = await trackUseCase.execute('listing-uuid-10', employeeActor);

      expect(result).toEqual({ success: true, isTracked: true });
      expect(mockTrackerRepo.track).toHaveBeenCalledWith(10, 1);
    });
  });

  describe('UntrackAllianceListingUseCase', () => {
    it('should throw ForbiddenException if requesting PM is not enabled for Alliance', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue({
        ...mockEnabledProfile,
        isEnabled: false,
      });

      await expect(
        untrackUseCase.execute('listing-uuid-10', enabledActor),
      ).rejects.toThrow(ForbiddenException);

      expect(mockTrackerRepo.untrack).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if listing does not exist', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findByUuid.mockResolvedValue(null);

      await expect(
        untrackUseCase.execute('non-existent-uuid', enabledActor),
      ).rejects.toThrow(NotFoundException);

      expect(mockTrackerRepo.untrack).not.toHaveBeenCalled();
    });

    it('should successfully untrack a listing', async () => {
      mockProfileRepo.findByPmId.mockResolvedValue(mockEnabledProfile);
      mockListingRepo.findByUuid.mockResolvedValue(mockListingEntity);
      mockTrackerRepo.untrack.mockResolvedValue(true);

      const result = await untrackUseCase.execute('listing-uuid-10', enabledActor);

      expect(result).toEqual({ success: true, isTracked: false });
      expect(mockTrackerRepo.untrack).toHaveBeenCalledWith(10, 1);
    });
  });
});
