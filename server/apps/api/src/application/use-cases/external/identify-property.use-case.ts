import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { IdentifyPropertyPayloadDto } from './external-api.dto'

@Injectable()
export class IdentifyExternalPropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
  ) { }

  async execute(uuid: string, platformId: number, payload: IdentifyPropertyPayloadDto): Promise<any> {
    const property = await this.propertyRepository.findByUuid(uuid)
    if (!property) {
      throw new NotFoundException(`Property with UUID ${uuid} not found`)
    }

    if (property.platformId && property.platformId !== platformId) {
      throw new BadRequestException('Property is already associated with a different platform')
    }

    if (property.platformId === platformId && property.externalUnitId === payload.externalUnitId) {
      return {
        uuid: property.uuid,
        platformId: property.platformId,
        externalUnitId: property.externalUnitId,
        externalPropertyId: property.externalPropertyId,
      }
    }

    if (payload.externalUnitId !== undefined) {
      const existingMapping = await this.propertyRepository.findByPlatformUnit(platformId, payload.externalUnitId)
      if (existingMapping && existingMapping.id !== property.id) {
        await this.propertyRepository.update(existingMapping.id!, {
          platformId: null as any,
          externalUnitId: null as any,
          externalPropertyId: null as any,
        })
      }
    }

    const updated = await this.propertyRepository.update(property.id!, {
      platformId,
      externalUnitId: payload.externalUnitId,
      externalPropertyId: payload.externalPropertyId,
    })

    return {
      uuid: updated.uuid,
      platformId: updated.platformId,
      externalUnitId: updated.externalUnitId,
      externalPropertyId: updated.externalPropertyId,
    }
  }
}
