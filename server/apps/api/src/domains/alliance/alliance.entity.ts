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
