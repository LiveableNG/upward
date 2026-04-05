import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator'

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  message!: string

  @IsString()
  @IsOptional()
  iconType?: string = 'sparkles'
}

export class UpdateAnnouncementStateDto {
  @IsString()
  @IsNotEmpty()
  announcementId!: string

  @IsBoolean()
  @IsOptional()
  seenPopup?: boolean

  @IsBoolean()
  @IsOptional()
  interactedPopup?: boolean

  @IsBoolean()
  @IsOptional()
  seenBanner?: boolean

  @IsBoolean()
  @IsOptional()
  interactedBanner?: boolean
}
