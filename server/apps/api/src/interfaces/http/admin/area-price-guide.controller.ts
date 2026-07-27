import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import {
  BulkUpsertAreaPriceGuideUseCase,
  CreateAreaPriceGuideUseCase,
  DeleteAreaPriceGuideUseCase,
  GetAreaPriceGuideStatesUseCase,
  GetAreaPriceGuideUseCase,
  UpdateAreaPriceGuideUseCase,
} from '../../../application/use-cases/admin/area-price-guide.use-cases'
import {
  BulkUpsertAreaPriceGuideDto,
  CreateAreaPriceGuideDto,
  UpdateAreaPriceGuideDto,
} from '../dto/area-price-guide.dto'

@Controller('admin/area-price-guide')
@UseGuards(AdminJwtAuthGuard)
export class AdminAreaPriceGuideController {
  constructor(
    private readonly getAreaPriceGuideUseCase: GetAreaPriceGuideUseCase,
    private readonly getAreaPriceGuideStatesUseCase: GetAreaPriceGuideStatesUseCase,
    private readonly createAreaPriceGuideUseCase: CreateAreaPriceGuideUseCase,
    private readonly updateAreaPriceGuideUseCase: UpdateAreaPriceGuideUseCase,
    private readonly deleteAreaPriceGuideUseCase: DeleteAreaPriceGuideUseCase,
    private readonly bulkUpsertAreaPriceGuideUseCase: BulkUpsertAreaPriceGuideUseCase,
  ) {}

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('state') state?: string,
  ) {
    return this.getAreaPriceGuideUseCase.execute({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      state,
    })
  }

  @Get('states')
  async getStates() {
    const data = await this.getAreaPriceGuideStatesUseCase.execute()
    return { data }
  }

  @Post()
  async create(@Body() body: CreateAreaPriceGuideDto) {
    return { data: await this.createAreaPriceGuideUseCase.execute(body) }
  }

  @Patch(':uuid')
  async update(@Param('uuid') uuid: string, @Body() body: UpdateAreaPriceGuideDto) {
    return { data: await this.updateAreaPriceGuideUseCase.execute(uuid, body) }
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string) {
    await this.deleteAreaPriceGuideUseCase.execute(uuid)
    return { success: true }
  }

  @Post('bulk-upsert')
  async bulkUpsert(@Body() body: BulkUpsertAreaPriceGuideDto) {
    return this.bulkUpsertAreaPriceGuideUseCase.execute(body.rows)
  }
}
