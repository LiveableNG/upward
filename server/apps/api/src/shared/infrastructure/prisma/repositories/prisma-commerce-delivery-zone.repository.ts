import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  CommerceDeliveryZone,
  CommerceDeliveryZoneRepository,
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
} from '../../../../domains/commerce/commerce-delivery-zone.repository'

@Injectable()
export class PrismaCommerceDeliveryZoneRepository implements CommerceDeliveryZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(record: any): CommerceDeliveryZone {
    return {
      id: record.id,
      uuid: record.uuid,
      tag: record.tag,
      name: record.name,
      state: record.state,
      region: record.region,
      areasCovered: record.areasCovered,
      isDelivering: record.isDelivering,
      deliveryFeeKobo: BigInt(record.deliveryFeeKobo ?? 0),
      estimatedDeliveryDays: record.estimatedDeliveryDays,
      pauseReason: record.pauseReason,
      sortOrder: record.sortOrder,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }

  async findAll(options?: { onlyDelivering?: boolean }): Promise<CommerceDeliveryZone[]> {
    const where: any = {}
    if (options?.onlyDelivering !== undefined) {
      where.isDelivering = options.onlyDelivering
    }

    const records = await this.prisma.upward_commerce_delivery_zone.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { state: 'asc' }, { name: 'asc' }],
    })

    return records.map((r) => this.mapToDomain(r))
  }

  async findById(id: number): Promise<CommerceDeliveryZone | null> {
    const record = await this.prisma.upward_commerce_delivery_zone.findUnique({
      where: { id },
    })
    return record ? this.mapToDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<CommerceDeliveryZone | null> {
    const record = await this.prisma.upward_commerce_delivery_zone.findUnique({
      where: { uuid },
    })
    return record ? this.mapToDomain(record) : null
  }

  async findByTag(tag: string): Promise<CommerceDeliveryZone | null> {
    const record = await this.prisma.upward_commerce_delivery_zone.findUnique({
      where: { tag: tag.toUpperCase().trim() },
    })
    return record ? this.mapToDomain(record) : null
  }

  async create(input: CreateDeliveryZoneInput): Promise<CommerceDeliveryZone> {
    const record = await this.prisma.upward_commerce_delivery_zone.create({
      data: {
        tag: input.tag.toUpperCase().trim(),
        name: input.name.trim(),
        state: input.state.trim(),
        region: input.region?.trim() || null,
        areasCovered: input.areasCovered?.trim() || null,
        isDelivering: input.isDelivering ?? true,
        deliveryFeeKobo: input.deliveryFeeKobo ?? 0n,
        estimatedDeliveryDays: input.estimatedDeliveryDays?.trim() || null,
        pauseReason: input.pauseReason?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
      },
    })
    return this.mapToDomain(record)
  }

  async update(uuid: string, input: UpdateDeliveryZoneInput): Promise<CommerceDeliveryZone> {
    const existing = await this.prisma.upward_commerce_delivery_zone.findUnique({
      where: { uuid },
    })
    if (!existing) {
      throw new NotFoundException(`Delivery zone ${uuid} not found`)
    }

    const data: any = {}
    if (input.name !== undefined) data.name = input.name.trim()
    if (input.state !== undefined) data.state = input.state.trim()
    if (input.region !== undefined) data.region = input.region?.trim() || null
    if (input.areasCovered !== undefined) data.areasCovered = input.areasCovered?.trim() || null
    if (input.isDelivering !== undefined) data.isDelivering = input.isDelivering
    if (input.deliveryFeeKobo !== undefined) data.deliveryFeeKobo = input.deliveryFeeKobo
    if (input.estimatedDeliveryDays !== undefined) data.estimatedDeliveryDays = input.estimatedDeliveryDays?.trim() || null
    if (input.pauseReason !== undefined) data.pauseReason = input.pauseReason?.trim() || null
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

    const record = await this.prisma.upward_commerce_delivery_zone.update({
      where: { uuid },
      data,
    })
    return this.mapToDomain(record)
  }

  async toggleDelivering(
    uuid: string,
    isDelivering: boolean,
    pauseReason?: string | null,
  ): Promise<CommerceDeliveryZone> {
    const existing = await this.prisma.upward_commerce_delivery_zone.findUnique({
      where: { uuid },
    })
    if (!existing) {
      throw new NotFoundException(`Delivery zone ${uuid} not found`)
    }

    const record = await this.prisma.upward_commerce_delivery_zone.update({
      where: { uuid },
      data: {
        isDelivering,
        pauseReason: isDelivering ? null : (pauseReason?.trim() || existing.pauseReason),
      },
    })
    return this.mapToDomain(record)
  }

  async delete(uuid: string): Promise<void> {
    const existing = await this.prisma.upward_commerce_delivery_zone.findUnique({
      where: { uuid },
    })
    if (!existing) {
      throw new NotFoundException(`Delivery zone ${uuid} not found`)
    }

    await this.prisma.upward_commerce_delivery_zone.delete({
      where: { uuid },
    })
  }
}
