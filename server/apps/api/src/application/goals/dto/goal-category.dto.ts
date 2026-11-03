import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { GoalPublishStatus } from '../../../domains/goals/goal.repository'

export class CreateGoalCategoryDto {
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
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  iconName?: string

  @IsString()
  @IsOptional()
  coverImage?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus
}

export class UpdateGoalCategoryDto {
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
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  iconName?: string

  @IsString()
  @IsOptional()
  coverImage?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus
}
