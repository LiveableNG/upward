import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '../../../../domains/commerce/commerce-delivery-zone.repository'
import { ToggleDeliveryZoneDto } from '../../dto/delivery-zone.dto'

@Injectable()
export class AdminToggleDeliveryZoneUseCase {
  constructor(
    @Inject(COMMERCE_DELIVERY_ZONE_REPOSITORY)
    private readonly zoneRepo: CommerceDeliveryZoneRepository,
  ) {}

  async execute(uuid: string, dto: ToggleDeliveryZoneDto) {
    const existing = await this.zoneRepo.findByUuid(uuid)
    if (!existing) {
      throw new NotFoundException(`Delivery zone '${uuid}' not found`)
    }

    const zone = await this.zoneRepo.toggleDelivering(uuid, dto.isDelivering, dto.pauseReason)

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
