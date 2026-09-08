import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { TrackUniversityVisitUseCase } from '../../../application/use-cases/university-traffic/track-university-visit.use-case'
import { TrackUniversityVisitDto } from '../dto/track-university-visit.dto'

@Controller('university/traffic')
export class UniversityTrafficController {
  constructor(private readonly trackVisitUseCase: TrackUniversityVisitUseCase) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async trackVisit(@Body() dto: TrackUniversityVisitDto, @Req() req: FastifyRequest) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] as string ||
      req.ip

    const userAgent = dto.userAgent || (req.headers['user-agent'] as string)
    const referer = dto.referer || (req.headers['referer'] as string)

    const result = await this.trackVisitUseCase.execute({
      identifier: dto.identifier,
      visitorId: dto.visitorId,
      sessionId: dto.sessionId,
      ipAddress: ip,
      userAgent,
      referer,
      path: dto.path || '/university',
    })

    return {
      success: true,
      deduplicated: result.isDeduplicated,
      isNewUnique: result.isNewUnique,
      data: result.visit.toObject(),
    }
  }
}
