import { Inject, Injectable } from '@nestjs/common'
import { LOCATION_REPOSITORY, LocationRepository } from '../../../domains/location/location.repository'

@Injectable()
export class GetCitiesUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepository,
  ) {}

  async execute(country: string) {
    return this.locationRepository.getCities(country)
  }
}
