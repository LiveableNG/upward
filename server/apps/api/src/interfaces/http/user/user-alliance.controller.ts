import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { SubmitAllianceRatingUseCase } from '../../../application/alliance/use-cases/submit-alliance-rating.use-case';
import { GetUserAllianceJourneysUseCase } from '../../../application/alliance/use-cases/get-user-alliance-journeys.use-case';
import { SubmitAllianceRatingDto } from '../../../application/alliance/dtos/alliance-rating.dto';

@UseGuards(JwtAuthGuard)
@Controller('user/alliance')
export class UserAllianceController {
  constructor(
    private readonly submitRatingUc: SubmitAllianceRatingUseCase,
    private readonly getJourneysUc: GetUserAllianceJourneysUseCase,
  ) {}

  @Get('journeys')
  async getUserJourneys(@Req() req: any) {
    const userIdentifier = req.user?.id || req.user?.sub;
    const data = await this.getJourneysUc.execute(userIdentifier);
    return {
      success: true,
      data,
    };
  }

  @Post('ratings')
  async submitClientRating(
    @Body() dto: SubmitAllianceRatingDto,
    @Req() req: any,
  ) {
    const userIdentifier = req.user?.id || req.user?.sub;
    const result = await this.submitRatingUc.execute(dto, {
      type: 'CLIENT',
      userId: userIdentifier,
    });
    return {
      success: true,
      data: result,
      message: 'Rating submitted successfully',
    };
  }
}
