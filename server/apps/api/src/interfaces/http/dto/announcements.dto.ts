import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator'

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

  @IsString()
  @IsOptional()
  url?: string
}

export class UpdateAnnouncementStateDto {
  @IsNumber()
  @IsNotEmpty()
  announcementId!: number

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
