import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { RequestDataDeletionUseCase } from '../../../application/use-cases/user/request-data-deletion.use-case'
import { IsEmail, IsNotEmpty } from 'class-validator'

class RequestDeletionDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string
}

@Controller('public/user')
export class PublicUserController {
  constructor(
    private readonly requestDataDeletionUseCase: RequestDataDeletionUseCase,
  ) {}

  @Post('request-deletion')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async requestDeletion(@Body() dto: RequestDeletionDto) {
    return this.requestDataDeletionUseCase.execute(dto.email)
  }
}
