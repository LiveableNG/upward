import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsBoolean, 
  IsDateString, 
  IsNotEmpty,
  IsEmail,
  IsUUID
} from 'class-validator'
import { Type } from 'class-transformer'

export class CompanyInfoDto {
  @IsOptional()
  @IsString()
  uuid?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  address?: string
}

export class UserInfoDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsString()
  phone?: string
}

export class LocationInfoDto {
  @IsString()
  @IsNotEmpty()
  country!: string

  @IsString()
  @IsNotEmpty()
  state!: string

  @IsString()
  @IsNotEmpty()
  area!: string

  @IsOptional()
  @IsString()
  subarea?: string

  @IsOptional()
  @IsString()
  subArea?: string

  @IsOptional()
  @IsString()
  address?: string
}

export class RentInfoDto {
  @IsNumber()
  rentAmount!: number

  @IsOptional()
  @IsDateString()
  rentStartDate?: string

  @IsDateString()
  rentEndDate!: string
}

export class ManagerInfoDto {
  @IsOptional()
  @IsString()
  uuid?: string

  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string
}

export class UserPropertyContextDto {
  @ValidateNested()
  @Type(() => LocationInfoDto)
  location!: LocationInfoDto

  @ValidateNested()
  @Type(() => RentInfoDto)
  rent!: RentInfoDto

  @IsOptional()
  @ValidateNested()
  @Type(() => ManagerInfoDto)
  manager?: ManagerInfoDto
}

export class InviteContextDto {
  @ValidateNested()
  @Type(() => UserInfoDto)
  user!: UserInfoDto

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPropertyContextDto)
  properties?: UserPropertyContextDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => UserPropertyContextDto)
  property?: UserPropertyContextDto
}

export class InviteRequestDto {
  @ValidateNested()
  @Type(() => CompanyInfoDto)
  company!: CompanyInfoDto

  @ValidateNested()
  @Type(() => InviteContextDto)
  invite!: InviteContextDto
}

export class LineItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsNumber()
  amount!: number
}

export class ExternalPaymentRequestPayloadDto {
  @IsOptional()
  @IsString()
  userPropertyUuid?: string

  @IsOptional()
  @IsNumber()
  amount?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[]

  @IsDateString()
  dueDate!: string

  @IsOptional()
  @IsString()
  bankCode?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => InviteRequestDto)
  invite?: InviteRequestDto

  @IsOptional()
  @IsBoolean()
  allowPartial?: boolean

  @IsOptional()
  @IsNumber()
  minAmount?: number
}

export class AddPropertyPayloadDto {
  @IsUUID()
  @IsNotEmpty()
  userUuid!: string

  @IsUUID()
  @IsNotEmpty()
  companyUuid!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPropertyContextDto)
  properties!: UserPropertyContextDto[]
}
