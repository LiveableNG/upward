import {
  AlliancePmProfileEntity,
  AllianceQualificationEntity,
  AlliancePmQualificationEntity,
} from './alliance.entity';

export const ALLIANCE_PROFILE_REPOSITORY = Symbol('ALLIANCE_PROFILE_REPOSITORY');
export const ALLIANCE_QUALIFICATION_REPOSITORY = Symbol('ALLIANCE_QUALIFICATION_REPOSITORY');
export const ALLIANCE_PM_QUALIFICATION_REPOSITORY = Symbol('ALLIANCE_PM_QUALIFICATION_REPOSITORY');

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
