import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubmitDemoRequestUseCase } from '../../../application/use-cases/system/submit-demo-request.use-case'
import { CreateDemoRequestDto } from '../dto/create-demo-request.dto'
import type { ApiSuccess } from '@upward/shared-types'

@Controller('public/demo-requests')
export class DemoRequestController {
  constructor(private readonly submitDemoRequestUseCase: SubmitDemoRequestUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Body() dto: CreateDemoRequestDto): Promise<ApiSuccess<any>> {
    const data = await this.submitDemoRequestUseCase.execute(dto)
    return { data, message: 'Successfully submitted demo request' }
  }
}
