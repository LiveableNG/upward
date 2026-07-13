import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropertyDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  totalUnits?: number;

  @IsString()
  propertyType!: string;

  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  landlordName?: string;

  @IsString()
  @IsOptional()
  landlordEmail?: string;

  @IsString()
  @IsOptional()
  landlordPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collaboratorUuids?: string[];
}

export class UpdatePropertyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  totalUnits?: number;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  landlordName?: string;

  @IsString()
  @IsOptional()
  landlordEmail?: string;

  @IsString()
  @IsOptional()
  landlordPhone?: string;
}

// --- Mode B: Units-only import for an existing property ---
export class UnitImportDto {
  @IsString()
  unitName!: string;

  @IsString()
  @IsOptional()
  tenantCommercialName?: string;

  @IsString()
  @IsOptional()
  tenantFirstName?: string;

  @IsString()
  @IsOptional()
  tenantLastName?: string;

  @IsString()
  @IsOptional()
  tenantEmail?: string;

  @IsString()
  @IsOptional()
  tenantPhone?: string;

  @IsNumber()
  rentAmount!: number;

  @IsNumber()
  @IsOptional()
  rentAmountPaid?: number;

  @IsNumber()
  @IsOptional()
  managementFee?: number;

  @IsString()
  @IsOptional()
  rentStartDate?: string;

  @IsString()
  @IsOptional()
  rentDueDate?: string;

  @IsString()
  @IsOptional()
  rentType?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  tenantUuid?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  unitType?: string;

  @IsBoolean()
  @IsOptional()
  rentReminderEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  rentReminderDaysBefore?: number;
}


export class BulkCreateUnitsDto {
  @IsString()
  propertyUuid!: string;

  @IsBoolean()
  @IsOptional()
  inviteAfterImport?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitImportDto)
  units!: UnitImportDto[];
}

// --- Mode A: Full import (property + landlord + tenant + unit in one flat row) ---
export class FullImportRowDto {
  // Property (required)
  @IsString()
  propertyName!: string;

  @IsString()
  propertyAddress!: string;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsString()
  @IsOptional()
  propertyCountry?: string;

  @IsString()
  @IsOptional()
  propertyState?: string;

  @IsString()
  @IsOptional()
  propertyArea?: string;

  // Landlord (all optional)
  @IsString()
  @IsOptional()
  landlordFirstName?: string;

  @IsString()
  @IsOptional()
  landlordLastName?: string;

  @IsString()
  @IsOptional()
  landlordEmail?: string;

  @IsString()
  @IsOptional()
  landlordPhone?: string;

  // Tenant (all optional - either firstName+lastName OR commercialName is sufficient)
  @IsString()
  @IsOptional()
  tenantCommercialName?: string;

  @IsString()
  @IsOptional()
  tenantFirstName?: string;

  @IsString()
  @IsOptional()
  tenantLastName?: string;

  @IsString()
  @IsOptional()
  tenantEmail?: string;

  @IsString()
  @IsOptional()
  tenantPhone?: string;

  // Unit (name + rentAmount required)
  @IsString()
  unitName!: string;

  @IsNumber()
  unitRentAmount!: number;

  @IsNumber()
  @IsOptional()
  unitRentAmountPaid?: number;

  @IsString()
  @IsOptional()
  unitRentType?: string;

  @IsString()
  @IsOptional()
  unitCurrency?: string;

  @IsString()
  @IsOptional()
  unitRentStartDate?: string;

  @IsString()
  @IsOptional()
  unitRentDueDate?: string;

  @IsNumber()
  @IsOptional()
  unitManagementFee?: number;

  @IsString()
  @IsOptional()
  unitNotes?: string;

  @IsString()
  @IsOptional()
  unitType?: string;

  @IsBoolean()
  @IsOptional()
  unitRentReminderEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  unitRentReminderDaysBefore?: number;
}


export class BulkFullImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullImportRowDto)
  rows!: FullImportRowDto[];

  @IsBoolean()
  @IsOptional()
  inviteAfterImport?: boolean;
}

export class RentHistoryImportRowDto {
  @IsString()
  tenantEmail!: string;

  @IsString()
  @IsOptional()
  tenantFirstName?: string;

  @IsString()
  @IsOptional()
  tenantLastName?: string;

  @IsNumber()
  amount!: number;

  @IsString()
  paymentDate!: string;

  @IsString()
  periodStart!: string;

  @IsString()
  @IsOptional()
  periodEnd?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkAddRentHistoryDto {
  @IsString()
  unitUuid!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentHistoryImportRowDto)
  rows!: RentHistoryImportRowDto[];
}
