import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetPublicAllianceListingsUseCase } from '@application/alliance/use-cases/get-public-alliance-listings.use-case';
import { GetPublicAllianceListingDetailUseCase } from '@application/alliance/use-cases/get-public-alliance-listing-detail.use-case';
import { ResolvePublicAllianceReferralUseCase } from '@application/alliance/use-cases/resolve-public-alliance-referral.use-case';
import { SubmitAllianceInquiryUseCase } from '@application/alliance/use-cases/submit-alliance-inquiry.use-case';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_REFERRAL_REPOSITORY,
  ALLIANCE_RATING_REPOSITORY,
} from '@domains/alliance/alliance.repository.interface';
import { ActivityLogService } from '@shared/application/activity-log.service';
import { NotificationService } from '@shared/infrastructure/common/notification.service';

describe('Alliance Public Marketplace & Client Integration Use Cases (Stage 4)', () => {
  let getPublicListingsUc: GetPublicAllianceListingsUseCase;
  let getPublicListingDetailUc: GetPublicAllianceListingDetailUseCase;
  let resolveReferralUc: ResolvePublicAllianceReferralUseCase;
  let submitInquiryUc: SubmitAllianceInquiryUseCase;

  const mockListingRepo = {
    findPublicMarketplaceListings: jest.fn(),
    findPublicByUuid: jest.fn(),
  };

  const mockReferralRepo = {
    findByShareToken: jest.fn(),
    update: jest.fn(),
  };

  const mockRatingRepo = {
    getRatingSummaryForSubject: jest.fn(),
  };

  const mockActivityLogService = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockNotificationService = {
    notifyUser: jest.fn().mockResolvedValue({}),
  };

  const mockSampleListing: any = {
    id: 10,
    uuid: 'listing-uuid-1',
    pmId: 100,
    title: 'Luxury 3-Bedroom Apartment',
    description: 'Beautiful spacious apartment in Ikoyi',
    intent: 'RENT',
    targetType: 'PROPERTY',
    price: 3500000,
    currency: 'NGN',
    propertyType: 'Flat / Apartment',
    bedrooms: 3,
    bathrooms: 3,
    address: '10 Queens Drive',
    city: 'Ikoyi',
    state: 'Lagos',
    country: 'Nigeria',
    status: 'PUBLISHED',
    visibility: 'ALLIANCE',
    isSourceDeleted: false,
    publishedAt: new Date('2026-09-01'),
    media: [
      {
        id: 1,
        uuid: 'media-uuid-1',
        publicUrl: 'https://s3.example.com/photo1.jpg',
        mimeType: 'image/jpeg',
        sortOrder: 0,
      },
      {
        id: 2,
        uuid: 'media-uuid-2',
        publicUrl: 'https://s3.example.com/photo2.jpg',
        mimeType: 'image/jpeg',
        sortOrder: 1,
      },
    ],
    pm: {
      id: 100,
      uuid: 'pm-uuid-100',
      name: 'Prime PM Ltd',
      companyName: 'Prime Property Managers',
      allianceProfile: {
        pmTitle: 'Senior Partner',
        bio: 'Over 10 years of property management experience in Lagos.',
        isEnabled: true,
      },
      qualifications: [
        {
          qualification: {
            slug: 'rics-certified',
            name: 'RICS Certified',
            description: 'Chartered Valuation & Property Management',
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPublicAllianceListingsUseCase,
        GetPublicAllianceListingDetailUseCase,
        ResolvePublicAllianceReferralUseCase,
        SubmitAllianceInquiryUseCase,
        { provide: ALLIANCE_LISTING_REPOSITORY, useValue: mockListingRepo },
        { provide: ALLIANCE_REFERRAL_REPOSITORY, useValue: mockReferralRepo },
        { provide: ALLIANCE_RATING_REPOSITORY, useValue: mockRatingRepo },
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    getPublicListingsUc = module.get<GetPublicAllianceListingsUseCase>(GetPublicAllianceListingsUseCase);
    getPublicListingDetailUc = module.get<GetPublicAllianceListingDetailUseCase>(GetPublicAllianceListingDetailUseCase);
    resolveReferralUc = module.get<ResolvePublicAllianceReferralUseCase>(ResolvePublicAllianceReferralUseCase);
    submitInquiryUc = module.get<SubmitAllianceInquiryUseCase>(SubmitAllianceInquiryUseCase);
  });

  describe('GetPublicAllianceListingsUseCase', () => {
    it('should return paginated public listing cards with public-safe fields', async () => {
      mockListingRepo.findPublicMarketplaceListings.mockResolvedValue({
        items: [mockSampleListing],
        total: 1,
      });
      mockRatingRepo.getRatingSummaryForSubject.mockResolvedValue({
        averageScore: 4.8,
        totalRatings: 12,
      });

      const result = await getPublicListingsUc.execute({
        intent: 'RENT',
        city: 'Ikoyi',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      const card = result.items[0]!;
      expect(card.uuid).toBe('listing-uuid-1');
      expect(card.title).toBe('Luxury 3-Bedroom Apartment');
      expect(card.price).toBe(3500000);
      expect(card.primaryMedia?.publicUrl).toBe('https://s3.example.com/photo1.jpg');
      expect(card.pm.displayName).toBe('Prime Property Managers');
      expect(card.pm.qualifications[0]?.code).toBe('rics-certified');
      expect(card.ratingSummary?.averageScore).toBe(4.8);
      // Verify internal IDs are not leaked
      expect((card as any).id).toBeUndefined();
      expect((card as any).pmId).toBeUndefined();
    });
  });

  describe('GetPublicAllianceListingDetailUseCase', () => {
    it('should return full public listing detail with gallery and PM info', async () => {
      mockListingRepo.findPublicByUuid.mockResolvedValue(mockSampleListing);
      mockRatingRepo.getRatingSummaryForSubject.mockResolvedValue({
        averageScore: 4.8,
        totalRatings: 12,
      });

      const result = await getPublicListingDetailUc.execute('listing-uuid-1');
      expect(result.uuid).toBe('listing-uuid-1');
      expect(result.media).toHaveLength(2);
      expect(result.pm.uuid).toBe('pm-uuid-100');
    });

    it('should throw NotFoundException if listing not found or not published', async () => {
      mockListingRepo.findPublicByUuid.mockResolvedValue(null);
      await expect(getPublicListingDetailUc.execute('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ResolvePublicAllianceReferralUseCase', () => {
    it('should resolve referral context by shareToken with referring PM and listing detail', async () => {
      mockReferralRepo.findByShareToken.mockResolvedValue({
        id: 50,
        uuid: 'ref-uuid-50',
        shareToken: 'tok_abc123',
        status: 'ACTIVE',
        clientName: 'Jane Doe',
        referringPmId: 200,
        listing: mockSampleListing,
        referringPm: {
          id: 200,
          uuid: 'pm-uuid-200',
          name: 'Referring Agent',
          companyName: 'Acme Realty',
          allianceProfile: { pmTitle: 'Lead Broker', isEnabled: true },
          qualifications: [],
        },
      });
      mockRatingRepo.getRatingSummaryForSubject.mockResolvedValue({
        averageScore: 5.0,
        totalRatings: 3,
      });

      const result = await resolveReferralUc.execute('tok_abc123');
      expect(result.referralUuid).toBe('ref-uuid-50');
      expect(result.clientName).toBe('Jane Doe');
      expect(result.referringPm.displayName).toBe('Acme Realty');
      expect(result.listing.title).toBe('Luxury 3-Bedroom Apartment');
    });

    it('should throw BadRequestException for empty token', async () => {
      await expect(resolveReferralUc.execute('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockReferralRepo.findByShareToken.mockResolvedValue(null);
      await expect(resolveReferralUc.execute('invalid_token')).rejects.toThrow(NotFoundException);
    });
  });

  describe('SubmitAllianceInquiryUseCase', () => {
    it('should submit client inquiry and advance referral stage to CONTACTED if NEW', async () => {
      mockListingRepo.findPublicByUuid.mockResolvedValue(mockSampleListing);
      mockReferralRepo.findByShareToken.mockResolvedValue({
        id: 50,
        uuid: 'ref-uuid-50',
        shareToken: 'tok_abc123',
        listingId: 10,
        referringPmId: 200,
        status: 'ACTIVE',
        stage: 'NEW',
      });

      const result = await submitInquiryUc.execute(
        'listing-uuid-1',
        {
          clientName: 'Jane Doe',
          clientEmail: 'jane@example.com',
          clientPhone: '+2348012345678',
          message: 'I would like to schedule a physical viewing this Saturday.',
          referralToken: 'tok_abc123',
        },
        999, // user ID
      );

      expect(result.success).toBe(true);
      expect(result.referralUuid).toBe('ref-uuid-50');
      expect(mockReferralRepo.update).toHaveBeenCalledWith(50, {
        stage: 'CONTACTED',
        matchedUserId: 999,
      });
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should reject inquiry with missing client name', async () => {
      mockListingRepo.findPublicByUuid.mockResolvedValue(mockSampleListing);
      await expect(
        submitInquiryUc.execute('listing-uuid-1', {
          clientName: '',
          clientEmail: 'jane@example.com',
          message: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject inquiry with missing email and phone', async () => {
      mockListingRepo.findPublicByUuid.mockResolvedValue(mockSampleListing);
      await expect(
        submitInquiryUc.execute('listing-uuid-1', {
          clientName: 'Jane',
          message: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
