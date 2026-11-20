import { IsNotEmpty, IsString, IsUrl } from 'class-validator'

export class SubmitUniversityApplicationVideoDto {
  @IsNotEmpty({ message: 'Payment reference is required' })
  @IsString()
  paymentRef!: string

  @IsNotEmpty({ message: 'Video link is required' })
  @IsUrl({ require_protocol: true }, { message: 'Please enter a valid video URL (starting with https://)' })
  videoUrl!: string
}
