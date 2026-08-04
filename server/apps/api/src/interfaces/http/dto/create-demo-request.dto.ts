import { IsString, IsEmail, IsNotEmpty, IsDateString } from 'class-validator'

export class CreateDemoRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  phone!: string

  @IsString()
  @IsNotEmpty()
  tenants!: string

  @IsDateString()
  @IsNotEmpty()
  demoDate!: string
}
