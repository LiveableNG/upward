import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { GetCountriesUseCase } from '../../../application/use-cases/location/get-countries.use-case'
import { GetCitiesUseCase } from '../../../application/use-cases/location/get-cities.use-case'
import { GetStatesUseCase } from '../../../application/use-cases/location/get-states.use-case'

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly getCountriesUseCase: GetCountriesUseCase,
    private readonly getCitiesUseCase: GetCitiesUseCase,
    private readonly getStatesUseCase: GetStatesUseCase,
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

  @Get('states')
  @HttpCode(HttpStatus.OK)
  async getStates(@Query('country') country?: string) {
    const data = await this.getStatesUseCase.execute(country || 'nigeria')
    return { data }
  }
}
