import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  GoalPublishStatus,
  Offering,
  OfferingMedia,
  OfferingRepository,
  OfferingType,
  PackageItem,
} from '../../../../domains/goals/offering.repository'

@Injectable()
export class PrismaOfferingRepository implements OfferingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOfferings(filter?: {
    goalId?: number
    type?: OfferingType
    status?: GoalPublishStatus
    vendorId?: number
    isFeatured?: boolean
    minPrice?: number
    maxPrice?: number
    search?: string
    skip?: number
    take?: number
  }): Promise<{ items: Offering[]; total: number }> {
    const where: any = {}

    if (filter?.goalId) {
      where.goalLinks = {
        some: { goalId: filter.goalId },
      }
    }
    if (filter?.type) where.type = filter.type
    if (filter?.status) where.status = filter.status
    if (filter?.vendorId) where.vendorId = filter.vendorId
    if (filter?.isFeatured !== undefined) where.isFeatured = filter.isFeatured

    if (filter?.minPrice !== undefined || filter?.maxPrice !== undefined) {
      where.OR = [
        {
          price: {
            ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
            ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
          },
        },
        {
          minPrice: {
            ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
            ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
          },
        },
      ]
    }

    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { subtitle: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      this.prisma.upward_offering.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: filter?.skip,
        take: filter?.take,
        include: {
          vendor: true,
          media: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          packageItems: {
            include: {
              component: {
                include: { media: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.upward_offering.count({ where }),
    ])

    return { items: items as unknown as Offering[], total }
  }

  async findOfferingById(id: number): Promise<Offering | null> {
    const offering = await this.prisma.upward_offering.findUnique({
      where: { id },
      include: {
        vendor: true,
        media: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        packageItems: {
          include: {
            component: {
              include: { media: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        goalLinks: {
          include: {
            goal: {
              include: { category: true },
            },
          },
        },
      },
    })
    return (offering as unknown as Offering) || null
  }

  async findOfferingByUuid(uuid: string): Promise<Offering | null> {
    const offering = await this.prisma.upward_offering.findUnique({
      where: { uuid },
      include: {
        vendor: true,
        media: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        packageItems: {
          include: {
            component: {
              include: { media: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        goalLinks: {
          include: {
            goal: {
              include: { category: true },
            },
          },
        },
      },
    })
    return (offering as unknown as Offering) || null
  }

  async createOffering(
    data: Partial<Offering>,
    media?: Array<Partial<OfferingMedia>>,
    packageItems?: Array<{ componentId: number; quantity: number; isOptional?: boolean; overridePrice?: number }>,
  ): Promise<Offering> {
    const created = await this.prisma.upward_offering.create({
      data: {
        vendorId: data.vendorId,
        type: data.type!,
        pricingModel: data.pricingModel ?? 'FIXED',
        title: data.title!,
        subtitle: data.subtitle,
        description: data.description,
        currency: data.currency || 'NGN',
        price: data.price,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        inStock: data.inStock ?? true,
        stockCount: data.stockCount,
        deliveryAvailable: data.deliveryAvailable ?? true,
        leadTimeDays: data.leadTimeDays,
        status: data.status ?? 'DRAFT',
        isFeatured: data.isFeatured ?? false,
        ...(media && media.length > 0
          ? {
              media: {
                create: media.map((m, idx) => ({
                  mediaUrl: m.mediaUrl!,
                  mimeType: m.mimeType || 'image/jpeg',
                  sortOrder: m.sortOrder ?? idx,
                  isPrimary: m.isPrimary ?? idx === 0,
                })),
              },
            }
          : {}),
        ...(packageItems && packageItems.length > 0
          ? {
              packageItems: {
                create: packageItems.map((item, idx) => ({
                  componentId: item.componentId,
                  quantity: item.quantity || 1,
                  isOptional: item.isOptional ?? false,
                  sortOrder: idx,
                  overridePrice: item.overridePrice,
                })),
              },
            }
          : {}),
      },
      include: {
        vendor: true,
        media: true,
        packageItems: {
          include: { component: true },
        },
      },
    })

    return created as unknown as Offering
  }

  async updateOffering(id: number, data: Partial<Offering>): Promise<Offering> {
    const updated = await this.prisma.upward_offering.update({
      where: { id },
      data: {
        ...(data.vendorId !== undefined ? { vendorId: data.vendorId } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.pricingModel ? { pricingModel: data.pricingModel } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.minPrice !== undefined ? { minPrice: data.minPrice } : {}),
        ...(data.maxPrice !== undefined ? { maxPrice: data.maxPrice } : {}),
        ...(data.inStock !== undefined ? { inStock: data.inStock } : {}),
        ...(data.stockCount !== undefined ? { stockCount: data.stockCount } : {}),
        ...(data.deliveryAvailable !== undefined ? { deliveryAvailable: data.deliveryAvailable } : {}),
        ...(data.leadTimeDays !== undefined ? { leadTimeDays: data.leadTimeDays } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      },
      include: {
        vendor: true,
        media: true,
        packageItems: {
          include: { component: true },
        },
      },
    })

    return updated as unknown as Offering
  }

  async deleteOffering(id: number): Promise<void> {
    await this.prisma.upward_offering.delete({
      where: { id },
    })
  }

  async addMedia(offeringId: number, media: Partial<OfferingMedia>): Promise<OfferingMedia> {
    const created = await this.prisma.upward_offering_media.create({
      data: {
        offeringId,
        mediaUrl: media.mediaUrl!,
        mimeType: media.mimeType || 'image/jpeg',
        sortOrder: media.sortOrder ?? 0,
        isPrimary: media.isPrimary ?? false,
      },
    })
    return created as OfferingMedia
  }

  async removeMedia(mediaId: number): Promise<void> {
    await this.prisma.upward_offering_media.delete({
      where: { id: mediaId },
    })
  }

  async setPackageItems(
    packageId: number,
    items: Array<{ componentId: number; quantity: number; isOptional?: boolean; overridePrice?: number }>,
  ): Promise<PackageItem[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.upward_package_item.deleteMany({
        where: { packageId },
      })

      if (items.length > 0) {
        await tx.upward_package_item.createMany({
          data: items.map((item, idx) => ({
            packageId,
            componentId: item.componentId,
            quantity: item.quantity || 1,
            isOptional: item.isOptional ?? false,
            sortOrder: idx,
            overridePrice: item.overridePrice,
          })),
        })
      }

      const updated = await tx.upward_package_item.findMany({
        where: { packageId },
        include: { component: true },
        orderBy: { sortOrder: 'asc' },
      })
      return updated as unknown as PackageItem[]
    })
  }
}

