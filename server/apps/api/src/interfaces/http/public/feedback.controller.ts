import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubmitFeedbackUseCase, SubmitFeedbackDto } from '../../../application/use-cases/feedback/submit-feedback.use-case'

@Controller('public/feedback')
export class FeedbackController {
  constructor(
    private readonly submitFeedbackUseCase: SubmitFeedbackUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async submitFeedback(@Body() dto: SubmitFeedbackDto) {
    return this.submitFeedbackUseCase.execute(dto)
  }
}
