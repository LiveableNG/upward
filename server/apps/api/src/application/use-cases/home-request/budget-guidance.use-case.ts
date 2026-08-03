import { Injectable } from '@nestjs/common'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import type { Prisma } from '@prisma/client'

export class BudgetGuidanceLocationDto {
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

export class BudgetGuidanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => BudgetGuidanceLocationDto)
  locations!: BudgetGuidanceLocationDto[]

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  bedrooms!: number
}

export type MatchLevel = 'subarea' | 'area' | 'area_any_bedrooms'

export interface LocationGuidance {
  state: string
  area: string
  subArea?: string
  matchLevel: MatchLevel | null
  minPrice: number | null
  maxPrice: number | null
  sampleSize: number | null
}

@Injectable()
export class BudgetGuidanceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: BudgetGuidanceDto) {
    const locations = await Promise.all(
      dto.locations.map((loc) => this.resolveLocation(loc, dto.bedrooms)),
    )

    const matched = locations.filter((loc) => loc.minPrice != null)
    const suggestedMinBudget = matched.length
      ? Math.max(...matched.map((loc) => loc.minPrice!))
      : null
    const matchedMax = locations.filter((loc) => loc.maxPrice != null)
    const suggestedMaxBudget = matchedMax.length
      ? Math.max(...matchedMax.map((loc) => loc.maxPrice!))
      : null

    return { suggestedMinBudget, suggestedMaxBudget, locations }
  }

  private async resolveLocation(
    loc: BudgetGuidanceLocationDto,
    bedrooms: number,
  ): Promise<LocationGuidance> {
    const attempts: Array<{ level: MatchLevel; where: Prisma.upward_area_price_guideWhereInput }> =
      []

    if (loc.subArea) {
      attempts.push({
        level: 'subarea',
        where: { state: loc.state, area: loc.area, subArea: loc.subArea, bedrooms },
      })
    }
    attempts.push({
      level: 'area',
      where: { state: loc.state, area: loc.area, bedrooms },
    })
    attempts.push({
      level: 'area_any_bedrooms',
      where: { state: loc.state, area: loc.area },
    })

    for (const attempt of attempts) {
      const result = await this.prisma.upward_area_price_guide.aggregate({
        where: attempt.where,
        _min: { minPrice: true },
        _max: { maxPrice: true },
        _sum: { sampleSize: true },
      })

      if (result._min.minPrice != null) {
        return {
          state: loc.state,
          area: loc.area,
          subArea: loc.subArea,
          matchLevel: attempt.level,
          minPrice: result._min.minPrice,
          maxPrice: result._max.maxPrice,
          sampleSize: result._sum.sampleSize,
        }
      }
    }

    return {
      state: loc.state,
      area: loc.area,
      subArea: loc.subArea,
      matchLevel: null,
      minPrice: null,
      maxPrice: null,
      sampleSize: null,
    }
  }
}
