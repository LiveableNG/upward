import { IsString, IsNotEmpty, IsIn } from 'class-validator'

export class UpdateHomeRequestStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['submitted', 'contacted', 'assigned', 'closed'])
  status!: string
}
