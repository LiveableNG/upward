import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { UserGoalStatus } from '../../../domains/goals/goal.repository'

export class SetUserGoalsDto {
  @IsArray()
  @IsInt({ each: true })
  goalIds!: number[]
}

export class UpdateUserGoalDto {
  @IsEnum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
  @IsOptional()
  status?: UserGoalStatus

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

  @IsDateString()
  @IsOptional()
  completedAt?: string
}
