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

export interface AllianceListingEntity {
  id: number;
  uuid: string;
  pmId: number;
  sourceType: AllianceSourceType;
  targetType: AllianceTargetType;
  intent: AllianceListingIntent;
  status: AllianceListingStatus;
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
    property?: {
      id: number;
      uuid: string;
      name: string;
    };
  } | null;
}
