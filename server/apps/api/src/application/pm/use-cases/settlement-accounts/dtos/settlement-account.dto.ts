import { IsString, IsNotEmpty, IsOptional, IsBoolean, Length, IsArray } from 'class-validator';

export class CreateSettlementAccountDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  accountNumber!: string;

  @IsString()
  @IsNotEmpty()
  accountName!: string;

  @IsString()
  @IsNotEmpty()
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  bankCode!: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateSettlementAccountDto {
  @IsString()
  @IsOptional()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  accountNumber?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class LinkPropertiesDto {
  @IsArray()
  @IsString({ each: true })
  propertyUuids!: string[];
}
