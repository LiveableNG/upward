import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConvertAllianceReferralUseCase } from '@application/alliance/use-cases/convert-alliance-referral.use-case';
import { ListPmAllianceCommissionsUseCase } from '@application/alliance/use-cases/list-pm-alliance-commissions.use-case';
import { GetAllianceCommissionDetailUseCase } from '@application/alliance/use-cases/get-alliance-commission-detail.use-case';
import { SubmitAllianceRatingUseCase } from '@application/alliance/use-cases/submit-alliance-rating.use-case';
import { GetSubjectRatingSummaryUseCase } from '@application/alliance/use-cases/get-subject-rating-summary.use-case';
import { ListSubjectRatingsUseCase } from '@application/alliance/use-cases/list-subject-ratings.use-case';
import { PmActorContext } from '@domains/pm/types/pm-actor-context';

describe('Alliance Stage 3: Commission, Conversion & Ratings Use Cases', () => {
  let convertReferralUseCase: ConvertAllianceReferralUseCase;
  let listCommissionsUseCase: ListPmAllianceCommissionsUseCase;
  let getCommissionDetailUseCase: GetAllianceCommissionDetailUseCase;
  let submitRatingUseCase: SubmitAllianceRatingUseCase;
  let getRatingSummaryUseCase: GetSubjectRatingSummaryUseCase;
  let listSubjectRatingsUseCase: ListSubjectRatingsUseCase;

  let mockProfileRepo: any;
  let mockReferralRepo: any;
  let mockCommissionRepo: any;
  let mockRatingRepo: any;
  let mockActivityLogService: any;
  let mockNotificationService: any;

  const referringPmActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: false,
  };

  const listingOwnerPmActor: PmActorContext = {
    ownerPmId: 2,
    isEmployee: false,
  };

  const unrelatedPmActor: PmActorContext = {
    ownerPmId: 3,
    isEmployee: false,
  };

  const sampleListing: any = {
    id: 100,
    uuid: 'listing-uuid-1',
    pmId: 2, // Owner is PM 2
    title: 'Luxury 3-Bed Apartment Lekki',
    price: 5000000,
    currency: 'NGN',
    status: 'PUBLISHED',
    visibility: 'ALLIANCE',
  };

  const sampleReferral: any = {
    id: 500,
    uuid: 'referral-uuid-1',
    listingId: 100,
    referringPmId: 1, // Referring PM is PM 1
    matchedUserId: 42,
    clientName: 'Alice Okon',
    clientEmail: 'alice@example.com',
    status: 'ACTIVE',
    stage: 'APPLICATION',
    listing: sampleListing,
  };

  beforeEach(() => {
    mockProfileRepo = {
      findByPmId: jest.fn().mockImplementation(async (pmId: number) => {
        return { pmId, isEnabled: true };
      }),
    };

    mockReferralRepo = {
      findByUuid: jest.fn().mockImplementation(async (uuid: string) => {
        if (uuid === sampleReferral.uuid) return { ...sampleReferral };
        return null;
      }),
      update: jest.fn().mockImplementation(async (id: number, data: any) => {
        return { ...sampleReferral, ...data };
      }),
    };

    const commissions: any[] = [];
    mockCommissionRepo = {
      findByUuid: jest.fn().mockImplementation(async (uuid: string) => {
        return commissions.find((c) => c.uuid === uuid) || null;
      }),
      findByReferralAndTxRef: jest.fn().mockImplementation(async (referralId: number, txRef: string) => {
        return commissions.find((c) => c.referralId === referralId && c.transactionReference === txRef) || null;
      }),
      create: jest.fn().mockImplementation(async (data: any) => {
        const item = {
          id: commissions.length + 1,
          uuid: `comm-uuid-${commissions.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        commissions.push(item);
        return item;
      }),
      listByReferringPm: jest.fn().mockImplementation(async (pmId: number) => {
        const items = commissions.filter((c) => c.referringPmId === pmId);
        return { items, total: items.length };
      }),
      getPmCommissionStats: jest.fn().mockImplementation(async (pmId: number) => {
        const items = commissions.filter((c) => c.referringPmId === pmId);
        const totalEarned = items.reduce((acc, i) => acc + i.commissionAmount, 0);
        return { totalEarned, totalPayable: 0, totalPaid: 0, totalPending: 0, count: items.length };
      }),
    };

    const ratings: any[] = [];
    mockRatingRepo = {
      create: jest.fn().mockImplementation(async (data: any) => {
        const item = {
          id: ratings.length + 1,
          uuid: `rating-uuid-${ratings.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        ratings.push(item);
        return item;
      }),
      findByReferralAndAuthor: jest.fn().mockImplementation(async (referralId: number, authorType: string, authorId: number) => {
        return (
          ratings.find(
            (r) =>
              r.referralId === referralId &&
              r.authorType === authorType &&
              (authorType === 'PM' ? r.authorPmId === authorId : r.authorUserId === authorId),
          ) || null
        );
      }),
      getRatingSummaryForSubject: jest.fn().mockImplementation(async (subjectType: string, subjectId: number) => {
        const matches = ratings.filter((r) => r.subjectType === subjectType && (subjectType === 'PM' ? r.subjectPmId === subjectId : r.subjectUserId === subjectId));
        const totalRatings = matches.length;
        const totalScore = matches.reduce((acc, m) => acc + m.score, 0);
        const averageScore = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;
        return {
          averageScore,
          totalRatings,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: totalRatings },
        };
      }),
      listRatingsForSubject: jest.fn().mockImplementation(async () => {
        return { items: ratings, total: ratings.length };
      }),
    };

    mockActivityLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
    };

    convertReferralUseCase = new ConvertAllianceReferralUseCase(
      mockProfileRepo,
      mockReferralRepo,
      mockCommissionRepo,
      mockActivityLogService,
      mockNotificationService,
    );

    listCommissionsUseCase = new ListPmAllianceCommissionsUseCase(
      mockProfileRepo,
      mockCommissionRepo,
    );

    getCommissionDetailUseCase = new GetAllianceCommissionDetailUseCase(
      mockProfileRepo,
      mockCommissionRepo,
    );

    submitRatingUseCase = new SubmitAllianceRatingUseCase(
      mockProfileRepo,
      mockReferralRepo,
      mockRatingRepo,
      mockActivityLogService,
      mockNotificationService,
    );

    getRatingSummaryUseCase = new GetSubjectRatingSummaryUseCase(mockRatingRepo);
    listSubjectRatingsUseCase = new ListSubjectRatingsUseCase(mockRatingRepo);
  });

  describe('Commission Attribution & Calculation', () => {
    it('should convert referral and attribute commission strictly to referring PM (PM 1)', async () => {
      const result = await convertReferralUseCase.execute(
        sampleReferral.uuid,
        {
          sourceAmount: 10000000,
          commissionRate: 5.0,
          transactionReference: 'TX_REF_001',
        },
        referringPmActor,
      );

      expect(result.isNew).toBe(true);
      expect(result.referral.status).toBe('CONVERTED');
      expect(result.commission.referringPmId).toBe(1); // STRICTLY Referring PM, NOT listing owner (PM 2)
      expect(result.commission.commissionAmount).toBe(500000); // 5% of 10,000,000
      expect(result.commission.status).toBe('EARNED');
      expect(mockReferralRepo.update).toHaveBeenCalledWith(
        sampleReferral.id,
        expect.objectContaining({ status: 'CONVERTED', stage: 'CONVERTED' }),
      );
    });

    it('should reject conversion attempt by unrelated PM (PM 3)', async () => {
      await expect(
        convertReferralUseCase.execute(
          sampleReferral.uuid,
          {
            sourceAmount: 5000000,
            transactionReference: 'TX_REF_002',
          },
          unrelatedPmActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should be idempotent and not create duplicate commission for repeated transaction reference', async () => {
      // 1. Initial conversion
      const first = await convertReferralUseCase.execute(
        sampleReferral.uuid,
        {
          sourceAmount: 10000000,
          commissionRate: 5.0,
          transactionReference: 'TX_REF_IDEMPOTENT',
        },
        referringPmActor,
      );
      expect(first.isNew).toBe(true);

      // 2. Duplicate conversion attempt
      const second = await convertReferralUseCase.execute(
        sampleReferral.uuid,
        {
          sourceAmount: 10000000,
          commissionRate: 5.0,
          transactionReference: 'TX_REF_IDEMPOTENT',
        },
        referringPmActor,
      );

      expect(second.isNew).toBe(false);
      expect(second.commission.uuid).toBe(first.commission.uuid);
    });
  });

  describe('Commission PM Listing & Privacy', () => {
    it('should return commissions list and statistics for referring PM', async () => {
      await convertReferralUseCase.execute(
        sampleReferral.uuid,
        {
          sourceAmount: 2000000,
          commissionRate: 5.0,
          transactionReference: 'TX_REF_PM1',
        },
        referringPmActor,
      );

      const res = await listCommissionsUseCase.execute({}, referringPmActor);
      expect(res.items.length).toBe(1);
      expect(res.items[0]?.commissionAmount).toBe(100000);
      expect(res.stats.totalEarned).toBe(100000);
    });

    it('should forbid PM from accessing another PM commission detail', async () => {
      const res = await convertReferralUseCase.execute(
        sampleReferral.uuid,
        {
          sourceAmount: 2000000,
          commissionRate: 5.0,
          transactionReference: 'TX_REF_PRIVACY',
        },
        referringPmActor,
      );
      const commission = res.commission;

      // Referring PM (PM 1) can view
      const detail = await getCommissionDetailUseCase.execute(commission!.uuid, referringPmActor);
      expect(detail.uuid).toBe(commission!.uuid);

      // Unrelated PM (PM 3) cannot view
      await expect(
        getCommissionDetailUseCase.execute(commission!.uuid, unrelatedPmActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Alliance Ratings & Reviews', () => {
    it('should allow referring PM to submit 1-5 rating for converted referral', async () => {
      // Mark referral as converted
      mockReferralRepo.findByUuid.mockResolvedValueOnce({
        ...sampleReferral,
        status: 'CONVERTED',
      });

      const rating = await submitRatingUseCase.execute(
        {
          referralUuid: sampleReferral.uuid,
          score: 5,
          review: 'Great seamless transaction!',
        },
        {
          type: 'PM',
          pmActor: referringPmActor,
        },
      );

      expect(rating.score).toBe(5);
      expect(rating.authorType).toBe('PM');
      expect(rating.authorPmId).toBe(1);
    });

    it('should reject rating submission if referral is not converted', async () => {
      // Referral is still ACTIVE (not converted)
      mockReferralRepo.findByUuid.mockResolvedValueOnce({
        ...sampleReferral,
        status: 'ACTIVE',
      });

      await expect(
        submitRatingUseCase.execute(
          {
            referralUuid: sampleReferral.uuid,
            score: 5,
          },
          {
            type: 'PM',
            pmActor: referringPmActor,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid rating scores (e.g. 0 or 6)', async () => {
      mockReferralRepo.findByUuid.mockResolvedValueOnce({
        ...sampleReferral,
        status: 'CONVERTED',
      });

      await expect(
        submitRatingUseCase.execute(
          {
            referralUuid: sampleReferral.uuid,
            score: 6,
          },
          {
            type: 'PM',
            pmActor: referringPmActor,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate rating for the same completed relationship', async () => {
      mockReferralRepo.findByUuid.mockResolvedValue({
        ...sampleReferral,
        status: 'CONVERTED',
      });

      // First rating succeeds
      await submitRatingUseCase.execute(
        {
          referralUuid: sampleReferral.uuid,
          score: 5,
        },
        {
          type: 'PM',
          pmActor: referringPmActor,
        },
      );

      // Second rating fails
      await expect(
        submitRatingUseCase.execute(
          {
            referralUuid: sampleReferral.uuid,
            score: 4,
          },
          {
            type: 'PM',
            pmActor: referringPmActor,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
