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
    const res = await this.offeringRepo.findOfferings(query)
    const items = res.items.map((item: any) => ({
      ...item,
      compareAtPrice: item.maxPrice ?? item.compareAtPrice,
    }))
    return { items, total: res.total }
  }

  async getById(id: number): Promise<Offering | null> {
    const item: any = await this.offeringRepo.findOfferingById(id)
    if (!item) return null
    return {
      ...item,
      compareAtPrice: item.maxPrice ?? item.compareAtPrice,
    }
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

    const maxPrice = offeringData.maxPrice !== undefined ? offeringData.maxPrice : compareAtPrice

    const cleanData: any = {
      ...offeringData,
      maxPrice: maxPrice !== undefined ? maxPrice : undefined,
      type: cleanType as any,
      status: offeringData.status || (isPublished !== undefined ? (isPublished ? 'PUBLISHED' : 'DRAFT') : undefined),
      deliveryAvailable: offeringData.deliveryAvailable ?? isDeliverable ?? true,
    }

    const created: any = await this.offeringRepo.createOffering(cleanData, mappedMedia, mappedPackageItems)
    return {
      ...created,
      compareAtPrice: created.maxPrice ?? created.compareAtPrice,
    }
  }

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const { media, packageItems, ...patch } = dto as any
    if (patch.type === 'SERVICE_INDIVIDUAL') patch.type = 'SERVICE'
    if (patch.type === 'SERVICE_PACKAGE') patch.type = 'PACKAGE'
    if (dto.isDeliverable !== undefined && dto.deliveryAvailable === undefined) {
      patch.deliveryAvailable = dto.isDeliverable
    }
    if (dto.isPublished !== undefined && !dto.status) {
      patch.status = dto.isPublished ? 'PUBLISHED' : 'DRAFT'
    }
    if (dto.compareAtPrice !== undefined && dto.maxPrice === undefined) {
      patch.maxPrice = dto.compareAtPrice
    }
    delete patch.slug
    delete patch.compareAtPrice
    delete patch.isDeliverable
    delete patch.isPublished

    let mappedMedia: any[] | undefined
    if (media !== undefined) {
      mappedMedia = Array.isArray(media)
        ? media
            .map((m: any, idx: number) => ({
              mediaUrl: m.mediaUrl || m.url || '',
              mimeType: m.mimeType || 'image/jpeg',
              sortOrder: m.sortOrder ?? idx,
              isPrimary: m.isPrimary ?? m.isCover ?? idx === 0,
            }))
            .filter((m: any) => Boolean(m.mediaUrl))
        : []
    }

    const updated: any = await this.offeringRepo.updateOffering(id, patch, mappedMedia)
    return {
      ...updated,
      compareAtPrice: updated.maxPrice ?? updated.compareAtPrice,
    }
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
