import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { SubmitAllianceRatingUseCase } from '../../../application/alliance/use-cases/submit-alliance-rating.use-case';
import { SubmitAllianceRatingDto } from '../../../application/alliance/dtos/alliance-rating.dto';

@UseGuards(JwtAuthGuard)
@Controller('user/alliance')
export class UserAllianceController {
  constructor(
    private readonly submitRatingUc: SubmitAllianceRatingUseCase,
  ) {}

  @Post('ratings')
  async submitClientRating(
    @Body() dto: SubmitAllianceRatingDto,
    @Req() req: any,
  ) {
    const userId = Number(req.user.id);
    const result = await this.submitRatingUc.execute(dto, {
      type: 'CLIENT',
      userId,
    });
    return {
      success: true,
      data: result,
      message: 'Rating submitted successfully',
    };
  }
}
