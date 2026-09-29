import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CreateAllianceListingUseCase } from '../../../application/alliance/use-cases/create-alliance-listing.use-case';
import { GetAllianceListingUseCase } from '../../../application/alliance/use-cases/get-alliance-listing.use-case';
import { UpdateAllianceListingUseCase } from '../../../application/alliance/use-cases/update-alliance-listing.use-case';
import { PublishAllianceListingUseCase } from '../../../application/alliance/use-cases/publish-alliance-listing.use-case';
import { UnpublishAllianceListingUseCase } from '../../../application/alliance/use-cases/unpublish-alliance-listing.use-case';
import { ArchiveAllianceListingUseCase } from '../../../application/alliance/use-cases/archive-alliance-listing.use-case';
import { ListPmAllianceListingsUseCase } from '../../../application/alliance/use-cases/list-pm-alliance-listings.use-case';

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
  ) {}

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
}
