import { Inject, Injectable } from '@nestjs/common'
import { LOCATION_REPOSITORY, LocationRepository } from '@domains/location/location.repository'

@Injectable()
export class GetCountriesUseCase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: LocationRepository,
  ) {}

  async execute() {
    return this.locationRepository.getCountries()
  }
}
