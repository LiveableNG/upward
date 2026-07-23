import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import {
  SubmitHomeRequestDto,
  SubmitHomeRequestUseCase,
} from '../../../application/use-cases/home-request/submit-home-request.use-case'
import {
  BudgetGuidanceDto,
  BudgetGuidanceUseCase,
} from '../../../application/use-cases/home-request/budget-guidance.use-case'

@Controller('public/home-requests')
export class HomeRequestController {
  constructor(
    private readonly submitHomeRequestUseCase: SubmitHomeRequestUseCase,
    private readonly budgetGuidanceUseCase: BudgetGuidanceUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async submit(@Body() dto: SubmitHomeRequestDto) {
    const data = await this.submitHomeRequestUseCase.execute(dto)
    return {
      data,
      message: 'Home request received. A verified agent will reach out shortly.',
      meta: {},
    }
  }

  @Post('budget-guidance')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async budgetGuidance(@Body() dto: BudgetGuidanceDto) {
    const data = await this.budgetGuidanceUseCase.execute(dto)
    return { data, message: '', meta: {} }
  }
}
