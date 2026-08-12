import { Injectable, Inject } from '@nestjs/common';
import { LandlordService } from '../../services/landlord.service';
import { CreatePmLandlordDto } from '../../dtos/landlord.dto';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';

@Injectable()
export class CreatePmLandlordUseCase {
  constructor(
    private readonly landlordService: LandlordService,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
  ) {}

  async execute(pmId: number, dto: CreatePmLandlordDto) {
    const pm = await this.pmRepo.findById(pmId);
    if (!pm) {
      throw new Error('Property manager not found');
    }

    const landlord = await this.landlordService.ensureLandlord(
      dto.email,
      dto.name,
      dto.phone,
      pm.uuid
    );

    return { success: true, landlord };
  }
}
