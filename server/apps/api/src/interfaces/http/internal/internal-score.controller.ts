import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { CalculateRentScoreUseCase } from '../../../application/use-cases/user/calculate-rent-score.use-case'

@Controller('internal/score')
export class InternalScoreController {
  constructor(private readonly calculateRentScore: CalculateRentScoreUseCase) {}

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async calculate(@Param('userId') userId: string) {
    return this.calculateRentScore.execute(userId)
  }
}
