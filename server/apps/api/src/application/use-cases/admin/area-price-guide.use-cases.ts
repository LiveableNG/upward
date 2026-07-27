import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import type { Prisma } from '@prisma/client'
import {
  CreateAreaPriceGuideDto,
  UpdateAreaPriceGuideDto,
} from '../../../interfaces/http/dto/area-price-guide.dto'

export interface GetAreaPriceGuideParams {
  page?: number
  limit?: number
  search?: string
  state?: string
}

@Injectable()
export class GetAreaPriceGuideUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GetAreaPriceGuideParams) {
    const page = params.page && params.page > 0 ? params.page : 1
    const limit = params.limit && params.limit > 0 ? params.limit : 50
    const skip = (page - 1) * limit

    const where: Prisma.upward_area_price_guideWhereInput = {}

    if (params.state) {
      where.state = params.state
    }

    if (params.search) {
      where.OR = [
        { area: { contains: params.search, mode: 'insensitive' } },
        { subArea: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.upward_area_price_guide.findMany({
        where,
        orderBy: [{ state: 'asc' }, { area: 'asc' }, { subArea: 'asc' }, { bedrooms: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.upward_area_price_guide.count({ where }),
    ])

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}

@Injectable()
export class GetAreaPriceGuideStatesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const rows = await this.prisma.upward_area_price_guide.findMany({
      distinct: ['state'],
      select: { state: true },
      orderBy: { state: 'asc' },
    })
    return rows.map((r) => r.state)
  }
}

@Injectable()
export class CreateAreaPriceGuideUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateAreaPriceGuideDto) {
    return this.prisma.upward_area_price_guide.create({
      data: {
        state: dto.state,
        area: dto.area,
        subArea: dto.subArea ?? null,
        bedrooms: dto.bedrooms,
        baths: dto.baths ?? null,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        sampleSize: dto.sampleSize,
      },
    })
  }
}

@Injectable()
export class UpdateAreaPriceGuideUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(uuid: string, dto: UpdateAreaPriceGuideDto) {
    const existing = await this.prisma.upward_area_price_guide.findUnique({ where: { uuid } })
    if (!existing) {
      throw new NotFoundException('Area price guide row not found')
    }

    return this.prisma.upward_area_price_guide.update({
      where: { uuid },
      data: {
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.area !== undefined && { area: dto.area }),
        ...(dto.subArea !== undefined && { subArea: dto.subArea || null }),
        ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
        ...(dto.baths !== undefined && { baths: dto.baths }),
        ...(dto.minPrice !== undefined && { minPrice: dto.minPrice }),
        ...(dto.maxPrice !== undefined && { maxPrice: dto.maxPrice }),
        ...(dto.sampleSize !== undefined && { sampleSize: dto.sampleSize }),
      },
    })
  }
}

@Injectable()
export class DeleteAreaPriceGuideUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(uuid: string) {
    const existing = await this.prisma.upward_area_price_guide.findUnique({ where: { uuid } })
    if (!existing) {
      throw new NotFoundException('Area price guide row not found')
    }
    return this.prisma.upward_area_price_guide.delete({ where: { uuid } })
  }
}

export interface BulkUpsertFailure {
  row: CreateAreaPriceGuideDto
  error: string
}

@Injectable()
export class BulkUpsertAreaPriceGuideUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rows: CreateAreaPriceGuideDto[]) {
    let created = 0
    let updated = 0
    const failed: BulkUpsertFailure[] = []

    for (const row of rows) {
      try {
        const subArea = row.subArea ?? null
        const baths = row.baths ?? null

        // Prisma's compound-unique lookup type doesn't accept null for nullable
        // columns, and Postgres treats NULL as distinct in unique indexes anyway
        // (many rows have subArea/baths = NULL) — so match manually instead of
        // relying on the state_area_subArea_bedrooms_baths compound key.
        const existing = await this.prisma.upward_area_price_guide.findFirst({
          where: { state: row.state, area: row.area, subArea, bedrooms: row.bedrooms, baths },
        })

        if (existing) {
          await this.prisma.upward_area_price_guide.update({
            where: { id: existing.id },
            data: {
              minPrice: row.minPrice,
              maxPrice: row.maxPrice,
              sampleSize: row.sampleSize,
            },
          })
          updated++
        } else {
          await this.prisma.upward_area_price_guide.create({
            data: {
              state: row.state,
              area: row.area,
              subArea,
              bedrooms: row.bedrooms,
              baths,
              minPrice: row.minPrice,
              maxPrice: row.maxPrice,
              sampleSize: row.sampleSize,
            },
          })
          created++
        }
      } catch (err: any) {
        failed.push({ row, error: err?.message || 'Unknown error' })
      }
    }

    return { created, updated, failed }
  }
}
