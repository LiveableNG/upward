import { Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '../../../domains/commerce/commerce-delivery-zone.repository'

export interface GetDeliveryZonesOptions {
  onlyDelivering?: boolean
}

@Injectable()
export class GetDeliveryZonesUseCase {
  constructor(
    @Inject(COMMERCE_DELIVERY_ZONE_REPOSITORY)
    private readonly zoneRepo: CommerceDeliveryZoneRepository,
  ) {}

  async execute(options?: GetDeliveryZonesOptions) {
    const zones = await this.zoneRepo.findAll(options)

    return zones.map((zone) => ({
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
    }))
  }
}
