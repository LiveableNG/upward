import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '../../../../domains/commerce/commerce-delivery-zone.repository'

@Injectable()
export class AdminDeleteDeliveryZoneUseCase {
  constructor(
    @Inject(COMMERCE_DELIVERY_ZONE_REPOSITORY)
    private readonly zoneRepo: CommerceDeliveryZoneRepository,
  ) {}

  async execute(uuid: string) {
    const existing = await this.zoneRepo.findByUuid(uuid)
    if (!existing) {
      throw new NotFoundException(`Delivery zone '${uuid}' not found`)
    }

    await this.zoneRepo.delete(uuid)
    return { success: true }
  }
}
