import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class SendLandlordReportDto {
  @IsEmail()
  @IsNotEmpty()
  landlordEmail!: string;

  @IsString()
  @IsNotEmpty()
  landlordName!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsBoolean()
  includeLetterhead?: boolean;
}
