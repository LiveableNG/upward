import { Inject, Injectable } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'
import { EarlyAccessEntry } from '../../../domains/early-access/early-access.entity'

export interface SubmitLandlordEarlyAccessCommand {
  name: string
  whatsapp: string
  email?: string
  city: string
  propertyCount: string
  landlordStatus: string
  managementStyle: string
}

@Injectable()
export class SubmitLandlordEarlyAccessUseCase {
  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
  ) {}

  async execute(command: SubmitLandlordEarlyAccessCommand): Promise<EarlyAccessEntry> {
    const entry = EarlyAccessEntry.create({
      type: 'LANDLORD',
      name: command.name,
      whatsapp: command.whatsapp,
      email: command.email,
      city: command.city,
      propertyCount: command.propertyCount,
      landlordStatus: command.landlordStatus,
      managementStyle: command.managementStyle,
    })

    return await this.earlyAccessRepo.save(entry)
  }
}
