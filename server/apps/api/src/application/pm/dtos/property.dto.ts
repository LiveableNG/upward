import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropertyDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  totalUnits!: number;

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
}

export class UnitImportDto {
  @IsString()
  unitName!: string;

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

  @IsString()
  @IsOptional()
  rentStartDate?: string;

  @IsString()
  @IsOptional()
  rentDueDate?: string;

  @IsString()
  @IsOptional()
  rentFrequency?: string;

  @IsString()
  @IsOptional()
  tenantUuid?: string;

  @IsString()
  status!: string;
}

export class BulkCreateUnitsDto {
  @IsString()
  propertyUuid!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitImportDto)
  units!: UnitImportDto[];
}
