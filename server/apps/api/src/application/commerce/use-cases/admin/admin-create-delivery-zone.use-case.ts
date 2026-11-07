import { ConflictException, Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '../../../../domains/commerce/commerce-delivery-zone.repository'
import { CreateDeliveryZoneDto } from '../../dto/delivery-zone.dto'

@Injectable()
export class AdminCreateDeliveryZoneUseCase {
  constructor(
    @Inject(COMMERCE_DELIVERY_ZONE_REPOSITORY)
    private readonly zoneRepo: CommerceDeliveryZoneRepository,
  ) {}

  async execute(dto: CreateDeliveryZoneDto) {
    const derived = (dto.tag?.trim() || dto.name.trim())
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    const formattedTag = derived || `ZONE_${Date.now().toString(36).toUpperCase()}`
    const existing = await this.zoneRepo.findByTag(formattedTag)
    if (existing) {
      throw new ConflictException(`Delivery zone with tag '${formattedTag}' already exists`)
    }

    const zone = await this.zoneRepo.create({
      tag: formattedTag,
      name: dto.name,
      state: dto.state,
      region: dto.region,
      areasCovered: dto.areasCovered,
      isDelivering: dto.isDelivering ?? true,
      deliveryFeeKobo: dto.deliveryFeeKobo !== undefined ? BigInt(dto.deliveryFeeKobo) : 0n,
      estimatedDeliveryDays: dto.estimatedDeliveryDays,
      pauseReason: dto.pauseReason,
      sortOrder: dto.sortOrder ?? 0,
    })

    return {
      zone: {
        id: zone.id,
        uuid: zone.uuid,
        tag: zone.tag,
        name: zone.name,
        state: zone.state,
        region: zone.region,
        areasCovered: zone.areasCovered,
        isDelivering: zone.isDelivering,
        deliveryFeeKobo: zone.deliveryFeeKobo.toString(),
        estimatedDeliveryDays: zone.estimatedDeliveryDays,
        pauseReason: zone.pauseReason,
        sortOrder: zone.sortOrder,
        createdAt: zone.createdAt,
        updatedAt: zone.updatedAt,
      },
    }
  }
}
