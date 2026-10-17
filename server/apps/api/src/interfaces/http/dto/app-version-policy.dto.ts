import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator'

export class UpdateAppVersionPolicyDto {
  @IsString()
  @IsNotEmpty()
  platform!: string

  @IsString()
  @IsOptional()
  app?: string

  @IsString()
  @IsNotEmpty()
  minSupportedVersion!: string

  @IsString()
  @IsNotEmpty()
  latestVersion!: string

  @IsInt()
  @IsOptional()
  minBuildNumber?: number

  @IsInt()
  @IsOptional()
  latestBuildNumber?: number

  @IsBoolean()
  @IsOptional()
  forceUpdate?: boolean

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gatedFeatures?: string[]

  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  message?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  releaseNotes?: string[]

  @IsString()
  @IsOptional()
  storeUrl?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class ToggleAppForceUpdateDto {
  @IsString()
  @IsOptional()
  app?: string

  @IsBoolean()
  @IsOptional()
  forceUpdate?: boolean

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean
}
