import { BadRequestException, Injectable } from '@nestjs/common'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

const PROPERTY_TYPES = ['apartment', 'studio', 'house', 'duplex', 'terrace', 'any'] as const

export class HomeRequestLocationDto {
  @IsString()
  @IsNotEmpty()
  state!: string

  @IsString()
  @IsNotEmpty()
  area!: string

  @IsOptional()
  @IsString()
  subArea?: string
}

export class SubmitHomeRequestDto {
  @IsOptional()
  @IsString()
  @IsIn(['RENT', 'BUY', 'rent', 'buy'])
  requestType?: string

  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => HomeRequestLocationDto)
  locations!: HomeRequestLocationDto[]

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  savedAmount?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overallBudget?: number

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsIn(PROPERTY_TYPES, { each: true })
  propertyTypes!: Array<(typeof PROPERTY_TYPES)[number]>

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  beds!: number

  @IsOptional()
  @IsString()
  moveInDate?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  amenities?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}

@Injectable()
export class SubmitHomeRequestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: SubmitHomeRequestDto) {
    const rawType = (dto.requestType || 'RENT').toUpperCase()
    const requestType = rawType === 'BUY' ? 'BUY' : 'RENT'

    let budgetMin = dto.budgetMin ?? 0
    let budgetMax = dto.budgetMax ?? 0

    if (requestType === 'RENT') {
      if (budgetMax < budgetMin) {
        throw new BadRequestException('Maximum budget must be greater than or equal to minimum budget')
      }
    } else {
      // For BUY requests, default min/max to overallBudget if not provided
      if (dto.overallBudget) {
        budgetMin = budgetMin || dto.overallBudget
        budgetMax = budgetMax || dto.overallBudget
      }
    }

    const phone = dto.phone.trim()
    const email = dto.email.trim().toLowerCase()
    if (!phone) throw new BadRequestException('Phone number is required')

    const request = await this.prisma.upward_home_request.create({
      data: {
        requestType,
        email,
        phone,
        fullName: dto.fullName?.trim() || null,
        locations: dto.locations as any,
        budgetMin,
        budgetMax,
        savedAmount: dto.savedAmount ?? null,
        overallBudget: dto.overallBudget ?? null,
        propertyType: dto.propertyTypes as any,
        beds: dto.beds,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
        amenities: (dto.amenities || []) as any,
        notes: dto.notes?.trim() || null,
        source: 'website',
        status: 'submitted',
      } as any,
    })

    return {
      uuid: request.uuid,
      requestType: (request as any).requestType || requestType,
      status: request.status,
      createdAt: request.createdAt,
    }
  }
}
