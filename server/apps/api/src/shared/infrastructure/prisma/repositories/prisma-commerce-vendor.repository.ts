import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { CommerceVendor, VendorRepository } from '../../../../domains/goals/vendor.repository'

@Injectable()
export class PrismaCommerceVendorRepository implements VendorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVendors(filter?: { isActive?: boolean; search?: string }): Promise<CommerceVendor[]> {
    const where: any = {}
    if (filter?.isActive !== undefined) where.isActive = filter.isActive
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ]
    }

    const vendors = await this.prisma.upward_commerce_vendor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { offerings: true },
        },
      },
    })
    return vendors as CommerceVendor[]
  }

  async findVendorById(id: number): Promise<CommerceVendor | null> {
    const vendor = await this.prisma.upward_commerce_vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { offerings: true },
        },
      },
    })
    return (vendor as CommerceVendor) || null
  }

  async findVendorByUuid(uuid: string): Promise<CommerceVendor | null> {
    const vendor = await this.prisma.upward_commerce_vendor.findUnique({
      where: { uuid },
      include: {
        _count: {
          select: { offerings: true },
        },
      },
    })
    return (vendor as CommerceVendor) || null
  }

  async findVendorBySlug(slug: string): Promise<CommerceVendor | null> {
    const vendor = await this.prisma.upward_commerce_vendor.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { offerings: true },
        },
      },
    })
    return (vendor as CommerceVendor) || null
  }

  async createVendor(data: Partial<CommerceVendor>): Promise<CommerceVendor> {
    const created = await this.prisma.upward_commerce_vendor.create({
      data: {
        name: data.name!,
        slug: data.slug!,
        logoUrl: data.logoUrl,
        email: data.email,
        phone: data.phone,
        website: data.website,
        rating: data.rating ?? 5.0,
        isActive: data.isActive ?? true,
      },
    })
    return created as CommerceVendor
  }

  async updateVendor(id: number, data: Partial<CommerceVendor>): Promise<CommerceVendor> {
    const updated = await this.prisma.upward_commerce_vendor.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.slug ? { slug: data.slug } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
    return updated as CommerceVendor
  }

  async deleteVendor(id: number): Promise<void> {
    await this.prisma.upward_commerce_vendor.delete({
      where: { id },
    })
  }
}
