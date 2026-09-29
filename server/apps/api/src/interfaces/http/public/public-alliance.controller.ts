import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../../application/auth/guards/optional-jwt-auth.guard';
import { GetPublicAllianceListingsUseCase } from '../../../application/alliance/use-cases/get-public-alliance-listings.use-case';
import { GetPublicAllianceListingDetailUseCase } from '../../../application/alliance/use-cases/get-public-alliance-listing-detail.use-case';
import { ResolvePublicAllianceReferralUseCase } from '../../../application/alliance/use-cases/resolve-public-alliance-referral.use-case';
import { SubmitAllianceInquiryUseCase } from '../../../application/alliance/use-cases/submit-alliance-inquiry.use-case';
import { GetSubjectRatingSummaryUseCase } from '../../../application/alliance/use-cases/get-subject-rating-summary.use-case';
import {
  PublicAllianceMarketplaceQueryDto,
  SubmitAllianceInquiryDto,
} from '../../../application/alliance/dtos/alliance-public-marketplace.dto';
import { AllianceRatingSubjectType } from '../../../domains/alliance/alliance.entity';

@Controller('public/alliance')
export class PublicAllianceMarketplaceController {
  constructor(
    private readonly getPublicListingsUc: GetPublicAllianceListingsUseCase,
    private readonly getPublicListingDetailUc: GetPublicAllianceListingDetailUseCase,
    private readonly resolveReferralUc: ResolvePublicAllianceReferralUseCase,
    private readonly submitInquiryUc: SubmitAllianceInquiryUseCase,
    private readonly getRatingSummaryUc: GetSubjectRatingSummaryUseCase,
  ) {}

  @Get('listings')
  async listListings(@Query() query: PublicAllianceMarketplaceQueryDto) {
    const result = await this.getPublicListingsUc.execute(query);
    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  @Get('listings/:uuid')
  async getListingDetail(@Param('uuid') uuid: string) {
    const data = await this.getPublicListingDetailUc.execute(uuid);
    return {
      success: true,
      data,
    };
  }

  @Get('referrals/:shareToken')
  async resolveReferral(@Param('shareToken') shareToken: string) {
    const data = await this.resolveReferralUc.execute(shareToken);
    return {
      success: true,
      data,
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('listings/:uuid/inquiries')
  async submitInquiry(
    @Param('uuid') uuid: string,
    @Body() dto: SubmitAllianceInquiryDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ? Number(req.user.id) : undefined;
    const result = await this.submitInquiryUc.execute(uuid, dto, userId);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Get('ratings/summary/:subjectType/:subjectId')
  async getRatingSummary(
    @Param('subjectType') subjectType: AllianceRatingSubjectType,
    @Param('subjectId') subjectId: string,
  ) {
    const data = await this.getRatingSummaryUc.execute(subjectType, Number(subjectId));
    return {
      success: true,
      data,
    };
  }
}
