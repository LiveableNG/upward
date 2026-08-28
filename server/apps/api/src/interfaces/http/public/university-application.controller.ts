import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubmitUniversityApplicationUseCase } from '../../../application/use-cases/university-application/submit-university-application.use-case'
import { CreateUniversityApplicationDto } from '../dto/create-university-application.dto'

@Controller('university/application')
export class UniversityApplicationController {
  constructor(
    private readonly submitUniversityApplicationUseCase: SubmitUniversityApplicationUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitApplication(@Body() dto: CreateUniversityApplicationDto) {
    const application = await this.submitUniversityApplicationUseCase.execute({
      name: dto.name,
      whatsapp: dto.whatsapp,
      email: dto.email,
      city: dto.city,
      ageBracket: dto.ageBracket,
      occupation: dto.occupation,
      experienceLevel: dto.experienceLevel,
      goals: dto.goals,
      commitment: dto.commitment,
      why: dto.why,
      timing: dto.timing,
    })

    return {
      success: true,
      message: 'University application received successfully',
      data: application.toObject(),
    }
  }
}
