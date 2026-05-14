import { Inject, Injectable } from '@nestjs/common';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';

@Injectable()
export class VerifyPmEmailUseCase {
  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(email: string) {
    const pm = await this.pmRepository.findByEmail(email);

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
