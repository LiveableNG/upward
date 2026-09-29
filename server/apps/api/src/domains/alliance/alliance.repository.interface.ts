import {
  AlliancePmProfileEntity,
  AllianceQualificationEntity,
  AlliancePmQualificationEntity,
  AllianceListingEntity,
  AllianceListingMediaEntity,
  AllianceListingStatus,
  AllianceListingVisibility,
  AllianceSourceType,
  AllianceTargetType,
  AllianceListingIntent,
} from './alliance.entity';

export const ALLIANCE_PROFILE_REPOSITORY = Symbol('ALLIANCE_PROFILE_REPOSITORY');
export const ALLIANCE_QUALIFICATION_REPOSITORY = Symbol('ALLIANCE_QUALIFICATION_REPOSITORY');
export const ALLIANCE_PM_QUALIFICATION_REPOSITORY = Symbol('ALLIANCE_PM_QUALIFICATION_REPOSITORY');
export const ALLIANCE_LISTING_REPOSITORY = Symbol('ALLIANCE_LISTING_REPOSITORY');

export interface IAllianceProfileRepository {
  findByPmId(pmId: number): Promise<AlliancePmProfileEntity | null>;
  findByPmUuid(pmUuid: string): Promise<AlliancePmProfileEntity | null>;
  ensureProfile(pmId: number): Promise<AlliancePmProfileEntity>;
  update(pmId: number, data: Partial<Omit<AlliancePmProfileEntity, 'id' | 'uuid' | 'pmId' | 'createdAt' | 'updatedAt'>>): Promise<AlliancePmProfileEntity>;
}

export interface IAllianceQualificationRepository {
  create(data: { slug: string; name: string; description?: string | null; isActive?: boolean }): Promise<AllianceQualificationEntity>;
  findById(id: number): Promise<AllianceQualificationEntity | null>;
  findBySlug(slug: string): Promise<AllianceQualificationEntity | null>;
  findAll(options?: { includeInactive?: boolean }): Promise<AllianceQualificationEntity[]>;
  update(id: number, data: Partial<{ name: string; description: string | null; isActive: boolean; slug: string }>): Promise<AllianceQualificationEntity>;
}

export interface IAlliancePmQualificationRepository {
  assign(pmId: number, qualificationId: number, adminId?: string | null): Promise<AlliancePmQualificationEntity>;
  remove(pmId: number, qualificationId: number): Promise<boolean>;
  findByPmId(pmId: number): Promise<AlliancePmQualificationEntity[]>;
  findByPmAndQualification(pmId: number, qualificationId: number): Promise<AlliancePmQualificationEntity | null>;
}

export interface CreateAllianceListingData {
  pmId: number;
  sourceType: AllianceSourceType;
  targetType: AllianceTargetType;
  intent?: AllianceListingIntent;
  visibility?: AllianceListingVisibility;
  targetPropertyId?: number | null;
  targetUnitId?: number | null;
  title: string;
  description?: string | null;
  currency?: string;
  price?: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

export interface UpdateAllianceListingData {
  title?: string;
  description?: string | null;
  currency?: string;
  price?: number;
  intent?: AllianceListingIntent;
  visibility?: AllianceListingVisibility;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status?: AllianceListingStatus;
  publishedAt?: Date | null;
  unpublishedAt?: Date | null;
  archivedAt?: Date | null;
  isSourceDeleted?: boolean;
  sourceDeletedAt?: Date | null;
}

export interface IAllianceListingRepository {
  create(data: CreateAllianceListingData): Promise<AllianceListingEntity>;
  findById(id: number): Promise<AllianceListingEntity | null>;
  findByUuid(uuid: string): Promise<AllianceListingEntity | null>;
  findPublishedByTargetProperty(targetPropertyId: number): Promise<AllianceListingEntity | null>;
  findPublishedByTargetUnit(targetUnitId: number): Promise<AllianceListingEntity | null>;
  update(id: number, data: UpdateAllianceListingData): Promise<AllianceListingEntity>;
  findPmListings(
    pmId: number,
    options?: {
      status?: AllianceListingStatus;
      targetType?: AllianceTargetType;
      sourceType?: AllianceSourceType;
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: AllianceListingEntity[]; total: number }>;
  findDiscoverableListings(
    excludePmId: number,
    options?: {
      intent?: AllianceListingIntent;
      targetType?: AllianceTargetType;
      propertyType?: string;
      city?: string;
      state?: string;
      search?: string;
      sortBy?: 'newest' | 'price_asc' | 'price_desc';
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: AllianceListingEntity[]; total: number }>;
  findDiscoverableByUuid(uuid: string, excludePmId?: number): Promise<AllianceListingEntity | null>;
  deleteDraft(id: number): Promise<boolean>;
}

export const ALLIANCE_LISTING_MEDIA_REPOSITORY = Symbol('ALLIANCE_LISTING_MEDIA_REPOSITORY');

export interface CreateAllianceListingMediaData {
  listingId: number;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  sortOrder?: number;
}

export interface IAllianceListingMediaRepository {
  create(data: CreateAllianceListingMediaData): Promise<AllianceListingMediaEntity>;
  findById(id: number): Promise<AllianceListingMediaEntity | null>;
  findByUuid(uuid: string): Promise<AllianceListingMediaEntity | null>;
  findByListingId(listingId: number): Promise<AllianceListingMediaEntity[]>;
  countByListingId(listingId: number): Promise<number>;
  reorder(listingId: number, orderedIds: number[]): Promise<AllianceListingMediaEntity[]>;
  delete(id: number): Promise<boolean>;
  deleteByListingId(listingId: number): Promise<number>;
  reindexSortOrders(listingId: number): Promise<void>;
}

export const ALLIANCE_LISTING_TRACKER_REPOSITORY = Symbol('ALLIANCE_LISTING_TRACKER_REPOSITORY');

export interface IAllianceListingTrackerRepository {
  track(listingId: number, trackerPmId: number): Promise<import('./alliance.entity').AllianceListingTrackerEntity>;
  untrack(listingId: number, trackerPmId: number): Promise<boolean>;
  isTracked(listingId: number, trackerPmId: number): Promise<boolean>;
  countByListingId(listingId: number): Promise<number>;
  countByListingIds(listingIds: number[]): Promise<Map<number, number>>;
  findTrackedListingIdsByPm(pmId: number, listingIds: number[]): Promise<Set<number>>;
  findByListingAndPm(listingId: number, trackerPmId: number): Promise<import('./alliance.entity').AllianceListingTrackerEntity | null>;
}

export const ALLIANCE_REFERRAL_REPOSITORY = Symbol('ALLIANCE_REFERRAL_REPOSITORY');

export interface CreateAllianceReferralData {
  listingId: number;
  referringPmId: number;
  matchedUserId?: number | null;
  clientIdentityKey: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientNormalizedEmail?: string | null;
  clientNormalizedPhone?: string | null;
  shareToken?: string;
  status?: import('./alliance.entity').AllianceReferralStatus;
  stage?: import('./alliance.entity').AllianceLeadStage;
  notes?: string | null;
}

export interface UpdateAllianceReferralData {
  stage?: import('./alliance.entity').AllianceLeadStage;
  status?: import('./alliance.entity').AllianceReferralStatus;
  notes?: string | null;
  convertedAt?: Date | null;
  closedAt?: Date | null;
}

export interface IAllianceReferralRepository {
  create(data: CreateAllianceReferralData): Promise<import('./alliance.entity').AllianceReferralEntity>;
  findById(id: number): Promise<import('./alliance.entity').AllianceReferralEntity | null>;
  findByUuid(uuid: string): Promise<import('./alliance.entity').AllianceReferralEntity | null>;
  findByShareToken(shareToken: string): Promise<import('./alliance.entity').AllianceReferralEntity | null>;
  findActiveReferral(listingId: number, clientIdentityKey: string): Promise<import('./alliance.entity').AllianceReferralEntity | null>;
  update(id: number, data: UpdateAllianceReferralData): Promise<import('./alliance.entity').AllianceReferralEntity>;
  findPmReferrals(
    pmId: number,
    options?: {
      stage?: import('./alliance.entity').AllianceLeadStage;
      status?: import('./alliance.entity').AllianceReferralStatus;
      listingUuid?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: import('./alliance.entity').AllianceReferralEntity[]; total: number }>;
  countActiveByListingId(listingId: number): Promise<number>;
  findActiveReferralsByListingId(listingId: number): Promise<import('./alliance.entity').AllianceReferralEntity[]>;
}


