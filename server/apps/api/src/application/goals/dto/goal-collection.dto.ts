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
import { GoalPublishStatus } from '../../../domains/goals/goal.repository'

export class CreateGoalCollectionDto {
  @IsInt()
  @IsNotEmpty()
  goalId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  badge?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus
}

export class UpdateGoalCollectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  badge?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus
}

export class LinkOfferingDto {
  @IsInt()
  @IsNotEmpty()
  offeringId!: number

  @IsInt()
  @IsOptional()
  collectionId?: number

  @IsBoolean()
  @IsOptional()
  isRecommended?: boolean

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean

  @IsInt()
  @IsOptional()
  relevanceScore?: number

  @IsString()
  @IsOptional()
  @MaxLength(255)
  curatorNote?: string

  @IsInt()
  @IsOptional()
  sortOrder?: number
}
