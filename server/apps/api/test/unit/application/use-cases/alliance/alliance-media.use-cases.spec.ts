import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RequestAllianceMediaUploadUseCase } from '@application/alliance/use-cases/request-alliance-media-upload.use-case';
import { ConfirmAllianceMediaUploadUseCase } from '@application/alliance/use-cases/confirm-alliance-media-upload.use-case';
import { ListAllianceListingMediaUseCase } from '@application/alliance/use-cases/list-alliance-listing-media.use-case';
import { ReorderAllianceListingMediaUseCase } from '@application/alliance/use-cases/reorder-alliance-listing-media.use-case';
import { DeleteAllianceListingMediaUseCase } from '@application/alliance/use-cases/delete-alliance-listing-media.use-case';
import {
  IAllianceListingRepository,
  IAllianceListingMediaRepository,
  IAllianceProfileRepository,
} from '@domains/alliance/alliance.repository.interface';
import { S3Service } from '@shared/infrastructure/common/s3/s3.service';
import { ActivityLogService } from '@shared/application/activity-log.service';
import { AllianceListingEntity, AllianceListingMediaEntity } from '@domains/alliance/alliance.entity';
import { PmActorContext } from '@domains/pm/types/pm-actor-context';

describe('Alliance Listing Media Use Cases (Stage 1D)', () => {
  let mockListingRepo: jest.Mocked<IAllianceListingRepository>;
  let mockProfileRepo: jest.Mocked<IAllianceProfileRepository>;
  let mockMediaRepo: jest.Mocked<IAllianceListingMediaRepository>;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockActivityLogService: jest.Mocked<ActivityLogService>;

  const defaultActor: PmActorContext = {
    ownerPmId: 1,
    isEmployee: false,
  };

  const sampleListing: AllianceListingEntity = {
    id: 10,
    uuid: 'list-uuid-10',
    pmId: 1,
    sourceType: 'INDEPENDENT',
    targetType: 'PROPERTY',
    intent: 'RENT',
    status: 'DRAFT',
    visibility: 'ALLIANCE',
    targetPropertyId: null,
    targetUnitId: null,
    isSourceDeleted: false,
    sourceDeletedAt: null,
    title: 'Luxury Villa',
    description: 'A beautiful villa',
    currency: 'NGN',
    price: 5000000,
    address: '10 Ocean Drive',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    propertyType: 'Detached',
    bedrooms: 4,
    bathrooms: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    unpublishedAt: null,
    archivedAt: null,
  };

  const sampleMediaItem: AllianceListingMediaEntity = {
    id: 101,
    uuid: 'media-uuid-101',
    listingId: 10,
    storageKey: 'alliance/listings/list-uuid-10/media-uuid-101.jpg',
    publicUrl: 'https://bucket.s3.us-east-1.amazonaws.com/alliance/listings/list-uuid-10/media-uuid-101.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024 * 500,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    mockMediaRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByListingId: jest.fn(),
      countByListingId: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
      deleteByListingId: jest.fn(),
      reindexSortOrders: jest.fn(),
    };
    mockS3Service = {
      getUploadUrl: jest.fn().mockResolvedValue('https://s3.signed-upload-url.com'),
      getDownloadUrl: jest.fn().mockImplementation((url: string) => Promise.resolve(url)),
      uploadBuffer: jest.fn().mockResolvedValue('https://s3.signed-upload-url.com'),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    } as any;
    mockActivityLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('RequestAllianceMediaUploadUseCase', () => {
    let useCase: RequestAllianceMediaUploadUseCase;

    beforeEach(() => {
      useCase = new RequestAllianceMediaUploadUseCase(
        mockProfileRepo,
        mockListingRepo,
        mockMediaRepo,
        mockS3Service,
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
        useCase.execute('list-uuid-10', { filename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 500000 }, defaultActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if listing does not exist', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent', { filename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 500000 }, defaultActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if listing belongs to another PM', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue({ ...sampleListing, pmId: 999 });

      await expect(
        useCase.execute('list-uuid-10', { filename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 500000 }, defaultActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if listing is ARCHIVED', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue({ ...sampleListing, status: 'ARCHIVED' });

      await expect(
        useCase.execute('list-uuid-10', { filename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 500000 }, defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported MIME type', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);

      await expect(
        useCase.execute('list-uuid-10', { filename: 'doc.pdf', mimeType: 'application/pdf', fileSize: 500000 }, defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file size exceeds 10MB', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);

      await expect(
        useCase.execute('list-uuid-10', { filename: 'large.png', mimeType: 'image/png', fileSize: 11 * 1024 * 1024 }, defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if maximum media count (15) is reached', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.countByListingId.mockResolvedValue(15);

      await expect(
        useCase.execute('list-uuid-10', { filename: 'photo.webp', mimeType: 'image/webp', fileSize: 500000 }, defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully issue a presigned upload URL with listing-scoped storageKey', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.countByListingId.mockResolvedValue(2);

      const result = await useCase.execute(
        'list-uuid-10',
        { filename: 'exterior.jpg', mimeType: 'image/jpeg', fileSize: 1024 * 200 },
        defaultActor,
      );

      expect(result.uploadUrl).toBe('https://s3.signed-upload-url.com');
      expect(result.storageKey).toMatch(/^alliance\/listings\/list-uuid-10\/[a-f0-9-]+\.jpg$/);
      expect(mockS3Service.getUploadUrl).toHaveBeenCalledWith(result.storageKey, 'image/jpeg');
    });
  });

  describe('ConfirmAllianceMediaUploadUseCase', () => {
    let useCase: ConfirmAllianceMediaUploadUseCase;

    beforeEach(() => {
      useCase = new ConfirmAllianceMediaUploadUseCase(
        mockProfileRepo,
        mockListingRepo,
        mockMediaRepo,
        mockActivityLogService,
        mockS3Service,
      );
    });

    it('should reject invalid storageKey that does not match listing prefix', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);

      await expect(
        useCase.execute(
          'list-uuid-10',
          {
            storageKey: 'pm/other-pm/properties/bad.jpg',
            mimeType: 'image/jpeg',
            fileSize: 200000,
            publicUrl: 'https://bucket.s3.amazonaws.com/pm/other-pm/properties/bad.jpg',
          },
          defaultActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create media record and log activity on valid confirmation', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.countByListingId.mockResolvedValue(1);
      mockMediaRepo.create.mockResolvedValue({
        ...sampleMediaItem,
        sortOrder: 1,
      });

      const result = await useCase.execute(
        'list-uuid-10',
        {
          storageKey: 'alliance/listings/list-uuid-10/new-image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 300000,
          publicUrl: 'https://bucket.s3.amazonaws.com/alliance/listings/list-uuid-10/new-image.jpg',
        },
        defaultActor,
      );

      expect(mockMediaRepo.create).toHaveBeenCalledWith({
        listingId: 10,
        storageKey: 'alliance/listings/list-uuid-10/new-image.jpg',
        publicUrl: 'https://bucket.s3.amazonaws.com/alliance/listings/list-uuid-10/new-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 300000,
        sortOrder: 1,
      });
      expect(mockActivityLogService.log).toHaveBeenCalled();
      expect(result.sortOrder).toBe(1);
    });
  });

  describe('ReorderAllianceListingMediaUseCase', () => {
    let useCase: ReorderAllianceListingMediaUseCase;

    beforeEach(() => {
      useCase = new ReorderAllianceListingMediaUseCase(
        mockProfileRepo,
        mockListingRepo,
        mockMediaRepo,
        mockActivityLogService,
        mockS3Service,
      );
    });

    it('should throw BadRequestException if duplicate IDs are provided', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.findByListingId.mockResolvedValue([
        sampleMediaItem,
        { ...sampleMediaItem, id: 102, uuid: 'media-uuid-102', sortOrder: 1 },
      ]);

      await expect(
        useCase.execute('list-uuid-10', { mediaUuids: ['media-uuid-101', 'media-uuid-101'] }, defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if foreign media UUID is provided', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.findByListingId.mockResolvedValue([
        sampleMediaItem,
        { ...sampleMediaItem, id: 102, uuid: 'media-uuid-102', sortOrder: 1 },
      ]);

      await expect(
        useCase.execute('list-uuid-10', { mediaUuids: ['media-uuid-101', 'foreign-media-uuid'] }, defaultActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should atomically reorder media items and log activity', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      const m1 = { ...sampleMediaItem, id: 101, uuid: 'm1', sortOrder: 0 };
      const m2 = { ...sampleMediaItem, id: 102, uuid: 'm2', sortOrder: 1 };
      mockMediaRepo.findByListingId.mockResolvedValue([m1, m2]);
      mockMediaRepo.reorder.mockResolvedValue([
        { ...m2, sortOrder: 0 },
        { ...m1, sortOrder: 1 },
      ]);

      const result = await useCase.execute('list-uuid-10', { mediaUuids: ['m2', 'm1'] }, defaultActor);

      expect(mockMediaRepo.reorder).toHaveBeenCalledWith(10, [102, 101]);
      expect(result[0]!.uuid).toBe('m2');
      expect(result[0]!.sortOrder).toBe(0);
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });
  });

  describe('DeleteAllianceListingMediaUseCase', () => {
    let useCase: DeleteAllianceListingMediaUseCase;

    beforeEach(() => {
      useCase = new DeleteAllianceListingMediaUseCase(
        mockProfileRepo,
        mockListingRepo,
        mockMediaRepo,
        mockS3Service,
        mockActivityLogService,
      );
    });

    it('should throw NotFoundException if media does not belong to listing', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.findByUuid.mockResolvedValue({ ...sampleMediaItem, listingId: 999 });

      await expect(
        useCase.execute('list-uuid-10', 'media-uuid-101', defaultActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete from DB, clean S3, re-index remaining orders, and log activity', async () => {
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
      mockListingRepo.findByUuid.mockResolvedValue(sampleListing);
      mockMediaRepo.findByUuid.mockResolvedValue(sampleMediaItem);
      mockMediaRepo.delete.mockResolvedValue(true);
      mockMediaRepo.reindexSortOrders.mockResolvedValue(undefined);

      const result = await useCase.execute('list-uuid-10', 'media-uuid-101', defaultActor);

      expect(mockMediaRepo.delete).toHaveBeenCalledWith(101);
      expect(mockMediaRepo.reindexSortOrders).toHaveBeenCalledWith(10);
      expect(mockS3Service.deleteObject).toHaveBeenCalledWith(sampleMediaItem.storageKey);
      expect(mockActivityLogService.log).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
