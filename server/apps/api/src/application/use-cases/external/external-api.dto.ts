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

  @IsOptional()
  @IsString()
  logoUrl?: string

  @IsOptional()
  @IsString()
  logo?: string
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

export function normalizeRentType(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined
  if (typeof val !== 'string') return val
  const trimmed = val.trim().toLowerCase()
  if (['yearly', 'annual', 'annually', 'year', 'per annum', 'per_annum', 'p.a.', 'lease', 'long lease', 'fixed lease'].includes(trimmed)) {
    return 'Annually'
  }
  if (['monthly', 'month', 'per month', 'per_month', 'p.m.', 'short let', 'shortlet'].includes(trimmed)) {
    return 'Monthly'
  }
  if (['quarterly', 'quarter', 'per quarter'].includes(trimmed)) {
    return 'Quarterly'
  }
  if (['bi-annually', 'biannually', 'semi-annually', 'semi-annual', 'biannual'].includes(trimmed)) {
    return 'Bi-Annually'
  }
  return val
}

export class RentInfoDto {
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : value))
  @IsNumber()
  rentAmount!: number

  @IsOptional()
  @IsDateString()
  rentStartDate?: string

  @IsDateString()
  rentEndDate!: string

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isFirstRent?: boolean

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber()
  initialAmountPaid?: number

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber()
  leaseYears?: number

  @IsOptional()
  @Transform(({ value }) => normalizeRentType(value))
  @IsString()
  rentType?: string
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

  @IsOptional()
  @IsString()
  bankName?: string

  @IsOptional()
  @IsString()
  bank_code?: string

  @IsOptional()
  @IsString()
  bankCode?: string

  @IsOptional()
  @IsString()
  account_name?: string

  @IsOptional()
  @IsString()
  accountName?: string

  @IsOptional()
  @IsString()
  account_number?: string

  @IsOptional()
  @IsString()
  accountNumber?: string
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
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : value))
  @IsNumber()
  amount!: number

  @IsDateString()
  paymentDate!: string

  @IsOptional()
  @IsDateString()
  dueDate?: string

  @IsOptional()
  @IsDateString()
  periodStart?: string

  @IsOptional()
  @IsDateString()
  periodEnd?: string

  @IsOptional()
  @IsString()
  method?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class IngestExternalRentHistoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentHistoryDto)
  records!: RentHistoryDto[]
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

  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : value))
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
  @Transform(({ value }) => normalizeRentType(value))
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
  inheritedTimeliness?: string

  @IsOptional()
  @IsString()
  recurrenceInterval?: string

  @IsOptional()
  @IsNumber()
  manualAccountId?: number

  @IsOptional()
  @IsBoolean()
  allowSupersede?: boolean
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
  @Transform(({ value }) => normalizeRentType(value))
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

export class VerifyAndAssignPropertyDto {
  @IsString()
  @IsNotEmpty()
  externalUnitId!: string

  @IsOptional()
  @IsString()
  externalPropertyId?: string

  @IsOptional()
  @Transform(({ value }) => (value !== '' && value !== null && value !== undefined ? Number(value) : undefined))
  @IsNumber()
  rentAmount?: number

  @IsOptional()
  @IsDateString()
  rentStartDate?: string

  @IsOptional()
  @IsDateString()
  rentEndDate?: string

  @IsOptional()
  @Transform(({ value }) => normalizeRentType(value))
  @IsString()
  rentType?: string

  @IsOptional()
  @Transform(({ value }) => (value !== '' && value !== null && value !== undefined ? Number(value) : undefined))
  @IsNumber()
  leaseYears?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentAccountDto)
  settlementAccount?: PaymentAccountDto

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentHistoryDto)
  rentHistory?: RentHistoryDto[]
}

