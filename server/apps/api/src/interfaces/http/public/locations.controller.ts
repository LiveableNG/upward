import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { GetCountriesUseCase } from '../../../application/use-cases/location/get-countries.use-case'
import { GetCitiesUseCase } from '../../../application/use-cases/location/get-cities.use-case'

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly getCountriesUseCase: GetCountriesUseCase,
    private readonly getCitiesUseCase: GetCitiesUseCase,
  ) {}

  @Get('countries')
  @HttpCode(HttpStatus.OK)
  async getCountries() {
    return { data: await this.getCountriesUseCase.execute() }
  }

  @Get('cities')
  @HttpCode(HttpStatus.OK)
  async getCities(@Query('country') country: string) {
    const data = await this.getCitiesUseCase.execute(country)
    return { data }
  }
}
