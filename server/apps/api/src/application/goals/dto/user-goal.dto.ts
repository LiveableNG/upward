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
import { GoalTargetType, UserGoalStatus } from '../../../domains/goals/goal.repository'

export class SetUserGoalsDto {
  @IsArray()
  @IsInt({ each: true })
  goalIds!: number[]
}

export class CreateCustomGoalDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsOptional()
  categorySlug?: string

  @IsString()
  @IsOptional()
  icon?: string

  @IsEnum(['AMOUNT', 'DEADLINE', 'HYBRID', 'CHECKLIST_ACTIONS', 'RECURRING_HABIT', 'VERIFICATION'])
  @IsOptional()
  targetType?: GoalTargetType

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number

  @IsOptional()
  targetAmountKobo?: number | string

  @IsArray()
  @IsOptional()
  actions?: string[]

  @IsString()
  @IsOptional()
  notes?: string
}

export class SubmitGoalQuestionnaireDto {
  @IsString()
  @IsNotEmpty()
  categorySlug!: string

  @IsString()
  @IsNotEmpty()
  questionTitle!: string

  @IsString()
  @IsNotEmpty()
  selectedOption!: string

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number

  @IsOptional()
  targetAmountKobo?: number | string
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
