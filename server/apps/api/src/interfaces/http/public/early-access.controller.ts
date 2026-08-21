import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubmitStudentEarlyAccessUseCase } from '../../../application/use-cases/early-access/submit-student-early-access.use-case'
import { SubmitLandlordEarlyAccessUseCase } from '../../../application/use-cases/early-access/submit-landlord-early-access.use-case'
import { CreateStudentEarlyAccessDto } from '../dto/create-student-early-access.dto'
import { CreateLandlordEarlyAccessDto } from '../dto/create-landlord-early-access.dto'

@Controller('early-access')
export class EarlyAccessController {
  constructor(
    private readonly submitStudentEarlyAccessUseCase: SubmitStudentEarlyAccessUseCase,
    private readonly submitLandlordEarlyAccessUseCase: SubmitLandlordEarlyAccessUseCase,
  ) {}

  @Post('student')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitStudent(@Body() dto: CreateStudentEarlyAccessDto) {
    const entry = await this.submitStudentEarlyAccessUseCase.execute({
      name: dto.name,
      whatsapp: dto.whatsapp,
      email: dto.email,
      city: dto.city,
      ageBracket: dto.ageBracket,
      experienceLevel: dto.experienceLevel,
      interest: dto.interest,
    })

    return {
      success: true,
      message: 'Student early access application received successfully',
      data: entry.toObject(),
    }
  }

  @Post('landlord')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitLandlord(@Body() dto: CreateLandlordEarlyAccessDto) {
    const entry = await this.submitLandlordEarlyAccessUseCase.execute({
      name: dto.name,
      whatsapp: dto.whatsapp,
      email: dto.email,
      city: dto.city,
      propertyCount: dto.propertyCount,
      landlordStatus: dto.landlordStatus,
      managementStyle: dto.managementStyle,
    })

    return {
      success: true,
      message: 'Landlord early access application received successfully',
      data: entry.toObject(),
    }
  }
}
