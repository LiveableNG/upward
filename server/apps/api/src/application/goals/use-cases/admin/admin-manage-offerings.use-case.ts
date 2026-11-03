import { Inject, Injectable } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  Offering,
  OfferingRepository,
} from '../../../../domains/goals/offering.repository'
import {
  CreateOfferingDto,
  OfferingQueryDto,
  UpdateOfferingDto,
} from '../../dto/offering.dto'

@Injectable()
export class AdminManageOfferingsUseCase {
  constructor(
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
  ) {}

  async list(query?: OfferingQueryDto): Promise<{ items: Offering[]; total: number }> {
    return this.offeringRepo.findOfferings(query)
  }

  async getById(id: number): Promise<Offering | null> {
    return this.offeringRepo.findOfferingById(id)
  }

  async create(dto: CreateOfferingDto): Promise<Offering> {
    const { media, packageItems, ...offeringData } = dto
    const mappedPackageItems = packageItems?.map((p) => ({
      componentId: p.componentId,
      quantity: p.quantity ?? 1,
      isOptional: p.isOptional,
      overridePrice: p.overridePrice,
    }))
    return this.offeringRepo.createOffering(offeringData, media, mappedPackageItems)
  }

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    return this.offeringRepo.updateOffering(id, dto)
  }

  async delete(id: number): Promise<void> {
    return this.offeringRepo.deleteOffering(id)
  }

  async setPackageItems(
    packageId: number,
    items: Array<{ componentId: number; quantity: number; isOptional?: boolean; overridePrice?: number }>,
  ) {
    return this.offeringRepo.setPackageItems(packageId, items)
  }
}
