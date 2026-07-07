import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  slug!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  excerpt!: string

  @IsString()
  @IsNotEmpty()
  contentHtml!: string

  @IsString()
  @IsOptional()
  coverImageUrl?: string

  @IsString()
  @IsNotEmpty()
  authorName!: string
}

export class UpdateBlogPostDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  slug?: string

  @IsString()
  @IsOptional()
  @MinLength(20)
  excerpt?: string

  @IsString()
  @IsOptional()
  contentHtml?: string

  @IsString()
  @IsOptional()
  coverImageUrl?: string

  @IsString()
  @IsOptional()
  authorName?: string
}
