import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubmitUniversityHireRequestUseCase } from '../../../application/use-cases/university-hire-request/submit-university-hire-request.use-case'
import { CreateUniversityHireRequestDto } from '../dto/create-university-hire-request.dto'

@Controller('university/hire')
export class UniversityHireController {
  constructor(
    private readonly submitUniversityHireRequestUseCase: SubmitUniversityHireRequestUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitHireRequest(@Body() dto: CreateUniversityHireRequestDto) {
    const result = await this.submitUniversityHireRequestUseCase.execute({
      companyName: dto.companyName,
      contactName: dto.contactName,
      contactRole: dto.contactRole,
      email: dto.email,
      phone: dto.phone,
      industry: dto.industry,
      city: dto.city,
      placementType: dto.placementType,
      rolesNeeded: dto.rolesNeeded,
      openingsCount: dto.openingsCount,
      compensationType: dto.compensationType,
      startDate: dto.startDate,
      jobDescription: dto.jobDescription,
      sourceIdentifier: dto.sourceIdentifier,
      abVariant: dto.abVariant,
    })

    return {
      success: true,
      message: 'Hiring inquiry received successfully. Our placement team will contact you shortly.',
      data: result.hireRequest.toObject(),
      emailSent: result.emailSent,
    }
  }
}
