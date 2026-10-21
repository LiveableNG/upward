import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import {
  SimulateRentSavingsDto,
  SimulateRentSavingsUseCase,
} from '../../../application/use-cases/rent-savings/simulate-rent-savings.use-case'

@Controller('rent-calculator')
export class RentCalculatorController {
  constructor(private readonly simulateUseCase: SimulateRentSavingsUseCase) {}

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(@Body() dto: SimulateRentSavingsDto) {
    return this.simulateUseCase.execute(dto)
  }
}
