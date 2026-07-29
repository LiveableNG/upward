import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsEmail,
  IsUUID
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

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

export class PaymentAccountDto {
  @IsOptional()
  @IsString()
  bank_name?: string

  @IsString()
  @IsNotEmpty()
  bank_code!: string

  @IsOptional()
  @IsString()
  account_name?: string

  @IsString()
  @IsNotEmpty()
  account_number!: string
}

export class UserPropertyContextDto {
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? String(value) : value)
  @IsString()
  externalUnitId?: string

  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? String(value) : value)
  @IsString()
  externalPropertyId?: string

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

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentAccountDto)
  paymentAccount?: PaymentAccountDto

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @IsString()
  bankCode?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentHistoryDto)
  rentHistory?: RentHistoryDto[]

  @IsOptional()
  @IsBoolean()
  allowDirectBankTransfer?: boolean
}

export class RentHistoryDto {
  @IsNumber()
  amount!: number

  @IsDateString()
  paymentDate!: string

  @IsOptional()
  @IsDateString()
  periodStart?: string

  @IsOptional()
  @IsDateString()
  periodEnd?: string

  @IsOptional()
  @IsString()
  notes?: string
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

  @IsOptional()
  @IsDateString()
  rentStartDate?: string

  @IsOptional()
  @IsDateString()
  rentEndDate?: string

  @IsOptional()
  @IsString()
  rentType?: string

  @IsOptional()
  @IsNumber()
  paymentRequestId?: number

  @IsOptional()
  @IsDateString()
  scheduledAt?: string

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean

  @IsOptional()
  @IsString()
  recurrenceInterval?: string
}

export class UpdateExternalPaymentRequestPayloadDto {
  @IsOptional()
  @IsNumber()
  amount?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsDateString()
  dueDate?: string

  @IsOptional()
  @IsBoolean()
  allowPartial?: boolean

  @IsOptional()
  @IsNumber()
  minAmount?: number

  @IsOptional()
  @IsDateString()
  rentStartDate?: string

  @IsOptional()
  @IsDateString()
  rentEndDate?: string

  @IsOptional()
  @IsString()
  rentType?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[]

  @IsOptional()
  @IsDateString()
  scheduledAt?: string

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean

  @IsOptional()
  @IsString()
  recurrenceInterval?: string
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

export class IdentifyPropertyPayloadDto {
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? String(value) : value)
  @IsString()
  externalUnitId?: string

  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? String(value) : value)
  @IsString()
  externalPropertyId?: string
}

export class CredibilityRecordDto {
  @IsNumber()
  amount!: number

  @IsDateString()
  dueDate!: string

  @IsDateString()
  paidDate!: string
}

export class FulfillCredibilityRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredibilityRecordDto)
  records!: CredibilityRecordDto[]
}
