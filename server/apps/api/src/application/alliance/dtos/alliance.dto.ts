import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ToggleAllianceEnablementDto {
  @IsBoolean()
  isEnabled!: boolean;
}

export class CreateAllianceQualificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'slug must contain only lowercase alphanumeric characters, dashes, and underscores',
  })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAllianceQualificationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'slug must contain only lowercase alphanumeric characters, dashes, and underscores',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignPmQualificationDto {
  @IsNotEmpty()
  qualificationId!: number;
}

export class UpdatePmAllianceProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  pmTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;
}
