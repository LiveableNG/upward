import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '../../../../domains/commerce/commerce-delivery-zone.repository'
import { UpdateDeliveryZoneDto } from '../../dto/delivery-zone.dto'

@Injectable()
export class AdminUpdateDeliveryZoneUseCase {
  constructor(
    @Inject(COMMERCE_DELIVERY_ZONE_REPOSITORY)
    private readonly zoneRepo: CommerceDeliveryZoneRepository,
  ) {}

  async execute(uuid: string, dto: UpdateDeliveryZoneDto) {
    const existing = await this.zoneRepo.findByUuid(uuid)
    if (!existing) {
      throw new NotFoundException(`Delivery zone '${uuid}' not found`)
    }

    const zone = await this.zoneRepo.update(uuid, {
      name: dto.name,
      state: dto.state,
      region: dto.region,
      areasCovered: dto.areasCovered,
      isDelivering: dto.isDelivering,
      deliveryFeeKobo: dto.deliveryFeeKobo !== undefined ? BigInt(dto.deliveryFeeKobo) : undefined,
      estimatedDeliveryDays: dto.estimatedDeliveryDays,
      pauseReason: dto.pauseReason,
      sortOrder: dto.sortOrder,
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
