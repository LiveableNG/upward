import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { LocationsService } from './locations.service'

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('countries')
  @HttpCode(HttpStatus.OK)
  getCountries() {
    return { data: this.locationsService.getCountries() }
  }

  @Get('cities')
  @HttpCode(HttpStatus.OK)
  async getCities(@Query('country') country: string) {
    const data = await this.locationsService.getCities(country)
    return { data }
  }
}
