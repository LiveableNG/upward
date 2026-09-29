import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ArrayMinSize,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ALLOWED_ALLIANCE_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_ALLIANCE_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ALLIANCE_MEDIA_PER_LISTING = 15;

export class RequestMediaUploadDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_ALLIANCE_MEDIA_MIME_TYPES, {
    message: 'Allowed image types are: image/jpeg, image/png, image/webp',
  })
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(MAX_ALLIANCE_MEDIA_SIZE_BYTES, {
    message: 'Image size cannot exceed 10MB',
  })
  @Type(() => Number)
  fileSize!: number;
}

export class ConfirmMediaUploadDto {
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @IsString()
  @IsIn(ALLOWED_ALLIANCE_MEDIA_MIME_TYPES, {
    message: 'Allowed image types are: image/jpeg, image/png, image/webp',
  })
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(MAX_ALLIANCE_MEDIA_SIZE_BYTES)
  @Type(() => Number)
  fileSize!: number;

  @IsString()
  @IsNotEmpty()
  publicUrl!: string;
}

export class ReorderMediaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  mediaUuids!: string[];
}
