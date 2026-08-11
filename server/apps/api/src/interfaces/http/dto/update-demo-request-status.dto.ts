import { IsString, IsNotEmpty, IsIn } from 'class-validator'

export class UpdateDemoRequestStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'CONTACTED', 'COMPLETED'])
  status!: string
}
