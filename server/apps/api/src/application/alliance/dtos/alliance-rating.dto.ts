import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import {
  AllianceRatingAuthorType,
  AllianceRatingSubjectType,
} from '../../../domains/alliance/alliance.entity';

export class SubmitAllianceRatingDto {
  @IsString()
  referralUuid!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  review?: string;
}

export class ListAllianceRatingsQueryDto {
  @IsEnum(['CLIENT', 'PM', 'LISTING'])
  subjectType!: AllianceRatingSubjectType;

  @IsNumber()
  subjectId!: number;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
