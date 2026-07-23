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

@Controller('public/home-requests')
export class HomeRequestController {
  constructor(private readonly submitHomeRequestUseCase: SubmitHomeRequestUseCase) {}

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
}
