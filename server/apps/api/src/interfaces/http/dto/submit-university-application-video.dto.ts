import { IsNotEmpty, IsOptional, IsString, IsUrl, IsEmail } from 'class-validator'

export class SubmitUniversityApplicationVideoDto {
  @IsOptional()
  @IsString()
  paymentRef?: string

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string

  @IsNotEmpty({ message: 'Video link is required' })
  @IsUrl({ require_protocol: true }, { message: 'Please enter a valid video URL (starting with https://)' })
  videoUrl!: string
}
