import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class CreateUniversityTrafficSourceDto {
  @IsNotEmpty({ message: 'Source name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name!: string

  @IsNotEmpty({ message: 'Identifier / slug is required' })
  @IsString()
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message: 'Identifier can only contain letters, numbers, hyphens, and underscores',
  })
  identifier!: string

  @IsOptional()
  @IsString()
  channel?: string

  @IsOptional()
  @IsString()
  targetUrl?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateUniversityTrafficSourceDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  channel?: string

  @IsOptional()
  @IsString()
  targetUrl?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
