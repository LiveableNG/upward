import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  GoalMilestone,
  GoalProgressSource,
  UserGoal,
  UserGoalStatus,
} from '../../../domains/goals/goal.repository'

export class SetUserGoalsDto {
  @IsArray()
  @IsInt({ each: true })
  goalIds!: number[]
}

export class AdoptCatalogueGoalDto {
  @IsInt()
  @IsNotEmpty()
  goalId!: number

  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsOptional()
  targetAmountMinor?: string | number

  @IsString()
  @IsOptional()
  currency?: string

  @IsEnum(['MILESTONES', 'MANUAL_PERCENT', 'TARGET_AMOUNT', 'RENT_VAULT', 'STATUS_ONLY'])
  @IsOptional()
  progressSource?: GoalProgressSource
}

export class CreateCustomGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customTitle!: string

  @IsInt()
  @IsNotEmpty()
  categoryId!: number

  @IsString()
  @IsOptional()
  customDescription?: string

  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsOptional()
  targetAmountMinor?: string | number

  @IsString()
  @IsOptional()
  currency?: string

  @IsEnum(['MILESTONES', 'MANUAL_PERCENT', 'TARGET_AMOUNT', 'RENT_VAULT', 'STATUS_ONLY'])
  @IsOptional()
  progressSource?: GoalProgressSource
}

export class CreateUserGoalDto {
  @IsInt()
  @IsOptional()
  goalId?: number

  @IsString()
  @IsOptional()
  @MaxLength(255)
  customTitle?: string

  @IsInt()
  @IsOptional()
  categoryId?: number

  @IsString()
  @IsOptional()
  customDescription?: string

  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsOptional()
  targetAmountMinor?: string | number

  @IsString()
  @IsOptional()
  currency?: string

  @IsEnum(['MILESTONES', 'MANUAL_PERCENT', 'TARGET_AMOUNT', 'RENT_VAULT', 'STATUS_ONLY'])
  @IsOptional()
  progressSource?: GoalProgressSource
}

export class UpdateUserGoalDto {
  @IsEnum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
  @IsOptional()
  status?: UserGoalStatus

  @IsString()
  @IsOptional()
  @MaxLength(255)
  customTitle?: string

  @IsString()
  @IsOptional()
  customDescription?: string

  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPct?: number

  @IsEnum(['MILESTONES', 'MANUAL_PERCENT', 'TARGET_AMOUNT', 'RENT_VAULT', 'STATUS_ONLY'])
  @IsOptional()
  progressSource?: GoalProgressSource

  @IsOptional()
  currentAmountMinor?: string | number

  @IsOptional()
  targetAmountMinor?: string | number

  @IsString()
  @IsOptional()
  currency?: string

  @IsDateString()
  @IsOptional()
  completedAt?: string

  @IsOptional()
  historicalTitle?: unknown

  @IsOptional()
  categoryId?: unknown

  @IsOptional()
  lastVerifiedBalanceMinor?: unknown
}

export class GetUserGoalsQueryDto {
  @IsEnum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
  @IsOptional()
  status?: UserGoalStatus

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeArchived?: boolean

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number

  @IsString()
  @IsOptional()
  categorySlug?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  take?: number
}

export class ChangeGoalStatusDto {
  @IsEnum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
  @IsNotEmpty()
  status!: UserGoalStatus
}

export class CreateGoalMilestoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string

  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number
}

export class UpdateGoalMilestoneDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string

  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number
}

/**
 * Serializes milestone for safe API response
 */
export function serializeGoalMilestone(m: GoalMilestone) {
  return {
    id: m.id,
    uuid: m.uuid,
    userGoalId: m.userGoalId,
    title: m.title,
    status: m.status,
    sortOrder: m.sortOrder,
    targetDate: m.targetDate ?? null,
    completedAt: m.completedAt ?? null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

/**
 * Serializes UserGoal, converting BigInt fields to strings to prevent JSON serialization errors
 * and IEEE-754 precision issues in clients.
 */
export function serializeUserGoal(ug: UserGoal) {
  return {
    id: ug.id,
    uuid: ug.uuid,
    userId: ug.userId,
    goalId: ug.goalId ?? null,
    categoryId: ug.categoryId,
    historicalTitle: ug.historicalTitle,
    customTitle: ug.customTitle ?? null,
    customDescription: ug.customDescription ?? null,
    status: ug.status,
    progressSource: ug.progressSource ?? 'MANUAL_PERCENT',
    progressPct: ug.progressPct,
    targetDate: ug.targetDate ?? null,
    notes: ug.notes ?? null,
    currentAmountMinor: ug.currentAmountMinor != null ? ug.currentAmountMinor.toString() : null,
    targetAmountMinor: ug.targetAmountMinor != null ? ug.targetAmountMinor.toString() : null,
    currency: ug.currency ?? 'NGN',
    completedAt: ug.completedAt ?? null,
    archivedAt: ug.archivedAt ?? null,
    pausedAt: ug.pausedAt ?? null,
    lastVerifiedBalanceMinor:
      ug.lastVerifiedBalanceMinor != null ? ug.lastVerifiedBalanceMinor.toString() : null,
    verifiedSourceUuid: ug.verifiedSourceUuid ?? null,
    verifiedAt: ug.verifiedAt ?? null,
    createdAt: ug.createdAt,
    updatedAt: ug.updatedAt,
    catalogueGoal: ug.catalogueGoal
      ? {
          id: ug.catalogueGoal.id,
          uuid: ug.catalogueGoal.uuid,
          slug: ug.catalogueGoal.slug,
          title: ug.catalogueGoal.title,
          tagline: ug.catalogueGoal.tagline ?? null,
          category: ug.catalogueGoal.category
            ? {
                id: ug.catalogueGoal.category.id,
                uuid: ug.catalogueGoal.category.uuid,
                slug: ug.catalogueGoal.category.slug,
                title: ug.catalogueGoal.category.title,
              }
            : undefined,
        }
      : null,
    category: ug.category
      ? {
          id: ug.category.id,
          uuid: ug.category.uuid,
          slug: ug.category.slug,
          title: ug.category.title,
          iconName: ug.category.iconName,
        }
      : null,
    milestones: Array.isArray(ug.milestones) ? ug.milestones.map(serializeGoalMilestone) : [],
  }
}
