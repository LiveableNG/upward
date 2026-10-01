import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import {
  CreateAllianceListingDto,
  UpdateAllianceListingDto,
  ListAllianceListingsQueryDto,
} from '../../../application/alliance/dtos/alliance-listing.dto';
import {
  RequestMediaUploadDto,
  ConfirmMediaUploadDto,
  ReorderMediaDto,
  UploadAllianceListingMediaDto,
} from '../../../application/alliance/dtos/alliance-listing-media.dto';
import { CreateAllianceListingUseCase } from '../../../application/alliance/use-cases/create-alliance-listing.use-case';
import { GetAllianceListingUseCase } from '../../../application/alliance/use-cases/get-alliance-listing.use-case';
import { UpdateAllianceListingUseCase } from '../../../application/alliance/use-cases/update-alliance-listing.use-case';
import { PublishAllianceListingUseCase } from '../../../application/alliance/use-cases/publish-alliance-listing.use-case';
import { UnpublishAllianceListingUseCase } from '../../../application/alliance/use-cases/unpublish-alliance-listing.use-case';
import { ArchiveAllianceListingUseCase } from '../../../application/alliance/use-cases/archive-alliance-listing.use-case';
import { ListPmAllianceListingsUseCase } from '../../../application/alliance/use-cases/list-pm-alliance-listings.use-case';
import { RequestAllianceMediaUploadUseCase } from '../../../application/alliance/use-cases/request-alliance-media-upload.use-case';
import { ConfirmAllianceMediaUploadUseCase } from '../../../application/alliance/use-cases/confirm-alliance-media-upload.use-case';
import { UploadAllianceListingMediaUseCase } from '../../../application/alliance/use-cases/upload-alliance-listing-media.use-case';
import { ListAllianceListingMediaUseCase } from '../../../application/alliance/use-cases/list-alliance-listing-media.use-case';
import { ReorderAllianceListingMediaUseCase } from '../../../application/alliance/use-cases/reorder-alliance-listing-media.use-case';
import { DeleteAllianceListingMediaUseCase } from '../../../application/alliance/use-cases/delete-alliance-listing-media.use-case';
import { TrackAllianceListingUseCase } from '../../../application/alliance/use-cases/track-alliance-listing.use-case';
import { UntrackAllianceListingUseCase } from '../../../application/alliance/use-cases/untrack-alliance-listing.use-case';
import { CreateAllianceReferralDto } from '../../../application/alliance/dtos/alliance-referral.dto';
import { CreateAllianceReferralUseCase } from '../../../application/alliance/use-cases/create-alliance-referral.use-case';

@Controller('pm/alliance/listings')
@UseGuards(JwtAuthGuard)
export class PmAllianceListingController {
  constructor(
    private readonly createListingUseCase: CreateAllianceListingUseCase,
    private readonly getListingUseCase: GetAllianceListingUseCase,
    private readonly updateListingUseCase: UpdateAllianceListingUseCase,
    private readonly publishListingUseCase: PublishAllianceListingUseCase,
    private readonly unpublishListingUseCase: UnpublishAllianceListingUseCase,
    private readonly archiveListingUseCase: ArchiveAllianceListingUseCase,
    private readonly listListingsUseCase: ListPmAllianceListingsUseCase,
    private readonly requestMediaUploadUseCase: RequestAllianceMediaUploadUseCase,
    private readonly confirmMediaUploadUseCase: ConfirmAllianceMediaUploadUseCase,
    private readonly uploadMediaUseCase: UploadAllianceListingMediaUseCase,
    private readonly listMediaUseCase: ListAllianceListingMediaUseCase,
    private readonly reorderMediaUseCase: ReorderAllianceListingMediaUseCase,
    private readonly deleteMediaUseCase: DeleteAllianceListingMediaUseCase,
    private readonly trackListingUseCase: TrackAllianceListingUseCase,
    private readonly untrackListingUseCase: UntrackAllianceListingUseCase,
    private readonly createReferralUseCase: CreateAllianceReferralUseCase,
  ) {}

  @Post(':uuid/referrals')
  async createReferral(
    @Param('uuid') uuid: string,
    @Body() dto: CreateAllianceReferralDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.createReferralUseCase.execute(uuid, dto, actor);
  }

  @Post(':uuid/track')
  async track(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.trackListingUseCase.execute(uuid, actor);
  }

  @Delete(':uuid/track')
  async untrack(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.untrackListingUseCase.execute(uuid, actor);
  }

  @Post()
  async create(
    @Body() dto: CreateAllianceListingDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.createListingUseCase.execute(dto, actor);
  }

  @Get()
  async list(
    @Query() query: ListAllianceListingsQueryDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.listListingsUseCase.execute(query, actor);
  }

  @Get(':uuid')
  async getOne(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.getListingUseCase.execute(uuid, actor);
  }

  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateAllianceListingDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.updateListingUseCase.execute(uuid, dto, actor);
  }

  @Post(':uuid/publish')
  async publish(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.publishListingUseCase.execute(uuid, actor);
  }

  @Post(':uuid/unpublish')
  async unpublish(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.unpublishListingUseCase.execute(uuid, actor);
  }

  @Post(':uuid/archive')
  async archive(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.archiveListingUseCase.execute(uuid, actor);
  }

  @Post(':uuid/media/upload')
  async uploadMedia(
    @Param('uuid') uuid: string,
    @Body() dto: UploadAllianceListingMediaDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.uploadMediaUseCase.execute(uuid, dto, actor);
  }

  @Post(':uuid/media/image-upload')
  async uploadImage(
    @Param('uuid') uuid: string,
    @Body() dto: UploadAllianceListingMediaDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.uploadMediaUseCase.execute(uuid, dto, actor);
  }

  @Post(':uuid/media/upload-url')
  async requestMediaUpload(
    @Param('uuid') uuid: string,
    @Body() dto: RequestMediaUploadDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.requestMediaUploadUseCase.execute(uuid, dto, actor);
  }

  @Post(':uuid/media/confirm')
  async confirmMediaUpload(
    @Param('uuid') uuid: string,
    @Body() dto: ConfirmMediaUploadDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.confirmMediaUploadUseCase.execute(uuid, dto, actor);
  }

  @Get(':uuid/media')
  async listMedia(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.listMediaUseCase.execute(uuid, actor);
  }

  @Patch(':uuid/media/order')
  async reorderMedia(
    @Param('uuid') uuid: string,
    @Body() dto: ReorderMediaDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.reorderMediaUseCase.execute(uuid, dto, actor);
  }

  @Delete(':uuid/media/:mediaUuid')
  async deleteMedia(
    @Param('uuid') uuid: string,
    @Param('mediaUuid') mediaUuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.deleteMediaUseCase.execute(uuid, mediaUuid, actor);
  }
}
