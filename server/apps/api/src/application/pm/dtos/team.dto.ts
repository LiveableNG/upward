
import { IsEmail, IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export enum TeamAccessLevel {
  ALL = 'ALL',
  CUSTOM = 'CUSTOM'
}

export class InviteTeamMemberDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(TeamAccessLevel)
  accessLevel!: TeamAccessLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyUuids?: string[];
}

export class UpdateTeamMemberPermissionsDto {
  @IsEnum(TeamAccessLevel)
  accessLevel!: TeamAccessLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyUuids?: string[];
}

export class TransferTeamPropertiesDto {
  @IsString()
  toCollaborationUuid!: string;

  @IsOptional()
  @IsString()
  fromCollaborationUuid?: string;

  @IsArray()
  @IsString({ each: true })
  propertyUuids!: string[];
}
