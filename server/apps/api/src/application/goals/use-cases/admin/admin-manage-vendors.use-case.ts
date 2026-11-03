import { Inject, Injectable } from '@nestjs/common'
import {
  CommerceVendor,
  VENDOR_REPOSITORY,
  VendorRepository,
} from '../../../../domains/goals/vendor.repository'
import { CreateVendorDto, UpdateVendorDto } from '../../dto/vendor.dto'

@Injectable()
export class AdminManageVendorsUseCase {
  constructor(
    @Inject(VENDOR_REPOSITORY)
    private readonly vendorRepo: VendorRepository,
  ) {}

  async list(filter?: { isActive?: boolean; search?: string }): Promise<CommerceVendor[]> {
    return this.vendorRepo.findVendors(filter)
  }

  async getById(id: number): Promise<CommerceVendor | null> {
    return this.vendorRepo.findVendorById(id)
  }

  async create(dto: CreateVendorDto): Promise<CommerceVendor> {
    return this.vendorRepo.createVendor(dto)
  }

  async update(id: number, dto: UpdateVendorDto): Promise<CommerceVendor> {
    return this.vendorRepo.updateVendor(id, dto)
  }

  async delete(id: number): Promise<void> {
    return this.vendorRepo.deleteVendor(id)
  }
}
