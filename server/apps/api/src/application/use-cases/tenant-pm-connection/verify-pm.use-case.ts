import { Inject, Injectable } from '@nestjs/common';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';

@Injectable()
export class VerifyPmEmailUseCase {
  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(identifier: string) {
    let pm = await this.pmRepository.findByEmail(identifier);

    if (!pm) {
      pm = await this.pmRepository.findByPhone(identifier);
    }

    if (!pm) {
      return { found: false };
    }

    return {
      found: true,
      pm: {
        id: pm.id,
        uuid: pm.uuid,
        firstName: pm.firstName,
        lastName: pm.lastName,
        businessName: pm.businessName,
      },
    };
  }
}
