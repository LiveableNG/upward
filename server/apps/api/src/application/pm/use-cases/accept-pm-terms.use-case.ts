import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'

@Injectable()
export class AcceptPmTermsUseCase {
  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(pmIdentifier: string | number, version: string = '2026-08-24') {
    let pm = null
    if (typeof pmIdentifier === 'number') {
      pm = await this.pmRepository.findById(pmIdentifier)
    } else if (/^\d+$/.test(pmIdentifier)) {
      pm = await this.pmRepository.findById(Number(pmIdentifier))
    } else {
      pm = await this.pmRepository.findByUuid(pmIdentifier)
    }

    if (!pm || !pm.id) {
      throw new NotFoundException('Property manager not found')
    }

    const updatedPm = await this.pmRepository.update(pm.id, {
      termsAcceptedAt: new Date(),
      termsVersion: version,
    })

    return {
      success: true,
      termsAcceptedAt: updatedPm.termsAcceptedAt,
      termsVersion: updatedPm.termsVersion,
    }
  }
}
