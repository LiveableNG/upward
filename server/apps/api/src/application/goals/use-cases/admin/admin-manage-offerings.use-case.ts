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
    const { media, packageItems, slug, compareAtPrice, isDeliverable, isPublished, ...offeringData } = dto
    let cleanType = offeringData.type as string
    if (cleanType === 'SERVICE_INDIVIDUAL') cleanType = 'SERVICE'
    if (cleanType === 'SERVICE_PACKAGE') cleanType = 'PACKAGE'

    const mappedPackageItems = packageItems?.map((p) => ({
      componentId: p.componentId,
      quantity: p.quantity ?? 1,
      isOptional: p.isOptional,
      overridePrice: p.overridePrice,
    }))

    const mappedMedia = media?.map((m) => ({
      mediaUrl: m.mediaUrl || m.url || '',
      mimeType: m.mimeType || 'image/jpeg',
      sortOrder: m.sortOrder ?? 0,
      isPrimary: m.isPrimary ?? m.isCover ?? false,
    })).filter((m) => Boolean(m.mediaUrl))

    const cleanData: any = {
      ...offeringData,
      type: cleanType as any,
      status: offeringData.status || (isPublished !== undefined ? (isPublished ? 'PUBLISHED' : 'DRAFT') : undefined),
      deliveryAvailable: offeringData.deliveryAvailable ?? isDeliverable ?? true,
    }

    return this.offeringRepo.createOffering(cleanData, mappedMedia, mappedPackageItems)
  }

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const patch: any = { ...dto }
    if (patch.type === 'SERVICE_INDIVIDUAL') patch.type = 'SERVICE'
    if (patch.type === 'SERVICE_PACKAGE') patch.type = 'PACKAGE'
    if (dto.isDeliverable !== undefined && dto.deliveryAvailable === undefined) {
      patch.deliveryAvailable = dto.isDeliverable
    }
    if (dto.isPublished !== undefined && !dto.status) {
      patch.status = dto.isPublished ? 'PUBLISHED' : 'DRAFT'
    }
    delete patch.slug
    delete patch.compareAtPrice
    delete patch.isDeliverable
    delete patch.isPublished
    return this.offeringRepo.updateOffering(id, patch)
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
