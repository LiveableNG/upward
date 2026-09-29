export interface AlliancePmProfileEntity {
  id: number;
  uuid: string;
  pmId: number;
  isEnabled: boolean;
  enabledAt: Date | null;
  disabledAt: Date | null;
  pmTitle: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllianceQualificationEntity {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlliancePmQualificationEntity {
  id: number;
  uuid: string;
  pmId: number;
  qualificationId: number;
  assignedByAdminId: string | null;
  assignedAt: Date;
  qualification?: AllianceQualificationEntity;
}

export type AllianceSourceType = 'LINKED_INVENTORY' | 'INDEPENDENT';
export type AllianceTargetType = 'PROPERTY' | 'UNIT';
export type AllianceListingIntent = 'RENT' | 'SALE';
export type AllianceListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
export type AllianceListingVisibility = 'ALLIANCE' | 'PRIVATE';

export interface AllianceListingEntity {
  id: number;
  uuid: string;
  pmId: number;
  sourceType: AllianceSourceType;
  targetType: AllianceTargetType;
  intent: AllianceListingIntent;
  status: AllianceListingStatus;
  visibility: AllianceListingVisibility;
  targetPropertyId: number | null;
  targetUnitId: number | null;
  isSourceDeleted: boolean;
  sourceDeletedAt: Date | null;
  title: string;
  description: string | null;
  currency: string;
  price: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  archivedAt: Date | null;
  targetProperty?: {
    id: number;
    uuid: string;
    name: string;
    address: string | null;
  } | null;
  targetUnit?: {
    id: number;
    uuid: string;
    unitName: string;
    rentAmount: number;
    propertyId: number;
    status?: string;
    property?: {
      id: number;
      uuid: string;
      name: string;
    };
  } | null;
  media?: AllianceListingMediaEntity[];
  pm?: {
    id: number;
    uuid: string;
    name: string;
    companyName?: string | null;
    allianceProfile?: {
      pmTitle: string | null;
      bio: string | null;
      isEnabled: boolean;
    } | null;
    qualifications?: Array<{
      qualification: {
        id: number;
        uuid: string;
        name: string;
        slug: string;
        isActive: boolean;
      };
    }>;
  };
}

export interface AllianceDiscoveredListingSummary {
  uuid: string;
  title: string;
  intent: AllianceListingIntent;
  targetType: AllianceTargetType;
  sourceType: AllianceSourceType;
  price: number;
  currency: string;
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
  };
  specs: {
    propertyType: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
  };
  coverImage: string | null;
  mediaCount: number;
  publishedAt: Date | null;
  ownerPm: {
    name: string;
    pmTitle: string | null;
    qualifications: Array<{
      uuid: string;
      name: string;
      slug: string;
    }>;
  };
}

export interface AllianceDiscoveredListingDetail extends AllianceDiscoveredListingSummary {
  description: string | null;
  media: AllianceListingMediaEntity[];
  ownerPm: {
    name: string;
    pmTitle: string | null;
    bio: string | null;
    qualifications: Array<{
      uuid: string;
      name: string;
      slug: string;
    }>;
  };
  canonicalContext: {
    isLinked: boolean;
    propertyName?: string;
    unitName?: string;
    currentOccupancyStatus?: string;
  } | null;
}

export interface AllianceListingMediaEntity {
  id: number;
  uuid: string;
  listingId: number;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
