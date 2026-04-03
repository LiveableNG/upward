import { Global, Module } from '@nestjs/common'
import { StaticLocationRepository } from './static-location.repository'
import { LOCATION_REPOSITORY } from '@domains/location/location.repository'

@Global()
@Module({
  providers: [
    {
      provide: LOCATION_REPOSITORY,
      useClass: StaticLocationRepository,
    },
  ],
  exports: [LOCATION_REPOSITORY],
})
export class LocationModule {}
