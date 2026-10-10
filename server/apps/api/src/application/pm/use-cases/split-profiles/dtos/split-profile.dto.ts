import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SplitProfileItemDto {
  @IsString()
  @IsNotEmpty()
  manualAccountUuid!: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  percentage!: number;

  @IsString()
  @IsOptional()
  lineItemName?: string;
}

export class CreateSplitProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitProfileItemDto)
  items!: SplitProfileItemDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  propertyUuids?: string[];
}

export class UpdateSplitProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitProfileItemDto)
  @IsOptional()
  items?: SplitProfileItemDto[];
}

export class AttachSplitProfileDto {
  @IsArray()
  @IsString({ each: true })
  propertyUuids!: string[];
}
