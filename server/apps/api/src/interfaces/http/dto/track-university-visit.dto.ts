import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class TrackUniversityVisitDto {
  @IsNotEmpty({ message: 'Identifier is required' })
  @IsString()
  identifier!: string

  @IsNotEmpty({ message: 'Visitor ID is required' })
  @IsString()
  visitorId!: string

  @IsNotEmpty({ message: 'Session ID is required' })
  @IsString()
  sessionId!: string

  @IsOptional()
  @IsString()
  path?: string

  @IsOptional()
  @IsString()
  referer?: string

  @IsOptional()
  @IsString()
  userAgent?: string
}
