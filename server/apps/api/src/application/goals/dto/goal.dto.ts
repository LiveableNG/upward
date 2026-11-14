import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { GoalPublishStatus } from '../../../domains/goals/goal.repository'

export class CreateGoalDto {
  @IsInt()
  @IsNotEmpty()
  categoryId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tagline?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  iconName?: string

  @IsString()
  @IsOptional()
  heroImage?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string

  @IsString()
  @IsOptional()
  coverImageUrl?: string

  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @IsEnum(['AMOUNT', 'DEADLINE', 'HYBRID', 'CHECKLIST_ACTIONS', 'RECURRING_HABIT', 'VERIFICATION'])
  @IsOptional()
  targetType?: any

  @IsInt()
  @IsOptional()
  @Min(1)
  defaultDurationDays?: number

  @IsOptional()
  suggestedAmountKobo?: number | string | bigint
}

export class CreateActionTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean
}

export class UpdateActionTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean
}

export class UpdateGoalDto {
  @IsInt()
  @IsOptional()
  categoryId?: number

  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string

  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tagline?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  iconName?: string

  @IsString()
  @IsOptional()
  heroImage?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string

  @IsString()
  @IsOptional()
  coverImageUrl?: string

  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @IsEnum(['AMOUNT', 'DEADLINE', 'HYBRID', 'CHECKLIST_ACTIONS', 'RECURRING_HABIT', 'VERIFICATION'])
  @IsOptional()
  targetType?: any

  @IsInt()
  @IsOptional()
  @Min(1)
  defaultDurationDays?: number

  @IsOptional()
  suggestedAmountKobo?: number | string | bigint
}

export class GoalQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number

  @IsString()
  @IsOptional()
  categorySlug?: string

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isFeatured?: boolean

  @IsString()
  @IsOptional()
  search?: string

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
