import { IsString, IsOptional } from 'class-validator'

export class TrackInteractionDto {
  @IsString()
  visitorId!: string

  @IsString()
  type!: string // CLICK, VIEW, etc

  @IsString()
  target!: string // HERO_CTA, etc

  @IsString()
  abVariant!: string

  @IsOptional()
  @IsString()
  metadata?: string
}
