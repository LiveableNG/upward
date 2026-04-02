import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator'

export class CreateStoryDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  categories!: string[]

  @IsString()
  @IsNotEmpty()
  story!: string

  @IsString()
  @IsOptional()
  audioUrl?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileUrls?: string[]
}
