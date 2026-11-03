import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { AdminManageCategoriesUseCase } from '../../../application/goals/use-cases/admin/admin-manage-categories.use-case'
import { AdminManageGoalsUseCase } from '../../../application/goals/use-cases/admin/admin-manage-goals.use-case'
import { AdminManageCollectionsUseCase } from '../../../application/goals/use-cases/admin/admin-manage-collections.use-case'
import { AdminManageOfferingsUseCase } from '../../../application/goals/use-cases/admin/admin-manage-offerings.use-case'
import { AdminManageVendorsUseCase } from '../../../application/goals/use-cases/admin/admin-manage-vendors.use-case'
import { AdminGetGoalsOverviewUseCase } from '../../../application/goals/use-cases/admin/admin-get-goals-overview.use-case'
import {
  CreateGoalCategoryDto,
  UpdateGoalCategoryDto,
} from '../../../application/goals/dto/goal-category.dto'
import {
  CreateGoalDto,
  GoalQueryDto,
  UpdateGoalDto,
} from '../../../application/goals/dto/goal.dto'
import {
  CreateGoalCollectionDto,
  LinkOfferingDto,
  UpdateGoalCollectionDto,
} from '../../../application/goals/dto/goal-collection.dto'
import {
  CreateOfferingDto,
  OfferingQueryDto,
  PackageItemInputDto,
  UpdateOfferingDto,
} from '../../../application/goals/dto/offering.dto'
import {
  CreateVendorDto,
  UpdateVendorDto,
} from '../../../application/goals/dto/vendor.dto'

@Controller('admin/goals')
@UseGuards(AdminJwtAuthGuard)
export class AdminGoalsController {
  constructor(
    private readonly manageCategoriesUseCase: AdminManageCategoriesUseCase,
    private readonly manageGoalsUseCase: AdminManageGoalsUseCase,
    private readonly manageCollectionsUseCase: AdminManageCollectionsUseCase,
    private readonly manageOfferingsUseCase: AdminManageOfferingsUseCase,
    private readonly manageVendorsUseCase: AdminManageVendorsUseCase,
    private readonly getOverviewUseCase: AdminGetGoalsOverviewUseCase,
  ) {}

  // 1. Overview KPIs
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview() {
    const data = await this.getOverviewUseCase.execute()
    return { data }
  }

  // 2. Categories CRUD
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async listCategories() {
    const data = await this.manageCategoriesUseCase.list()
    return { data }
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateGoalCategoryDto) {
    const data = await this.manageCategoriesUseCase.create(dto)
    return { data, message: 'Goal category created' }
  }

  @Patch('categories/:id')
  @HttpCode(HttpStatus.OK)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateGoalCategoryDto) {
    const data = await this.manageCategoriesUseCase.update(Number(id), dto)
    return { data, message: 'Goal category updated' }
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@Param('id') id: string) {
    await this.manageCategoriesUseCase.delete(Number(id))
    return { message: 'Goal category deleted' }
  }

  // 3. Goals CRUD
  @Get('list')
  @HttpCode(HttpStatus.OK)
  async listGoals(@Query() query: GoalQueryDto) {
    const result = await this.manageGoalsUseCase.list(query)
    return {
      data: result.items,
      meta: {
        total: result.total,
        skip: query.skip || 0,
        take: query.take || 20,
      },
    }
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createGoal(@Body() dto: CreateGoalDto) {
    const data = await this.manageGoalsUseCase.create(dto)
    return { data, message: 'Goal created successfully' }
  }

  @Patch('update/:id')
  @HttpCode(HttpStatus.OK)
  async updateGoal(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    const data = await this.manageGoalsUseCase.update(Number(id), dto)
    return { data, message: 'Goal updated successfully' }
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async deleteGoal(@Param('id') id: string) {
    await this.manageGoalsUseCase.delete(Number(id))
    return { message: 'Goal deleted successfully' }
  }

  // 4. Collections & Linkings
  @Get(':goalId/collections')
  @HttpCode(HttpStatus.OK)
  async listCollections(@Param('goalId') goalId: string) {
    const data = await this.manageCollectionsUseCase.list(Number(goalId))
    return { data }
  }

  @Post('collections')
  @HttpCode(HttpStatus.CREATED)
  async createCollection(@Body() dto: CreateGoalCollectionDto) {
    const data = await this.manageCollectionsUseCase.create(dto)
    return { data, message: 'Collection created successfully' }
  }

  @Patch('collections/:id')
  @HttpCode(HttpStatus.OK)
  async updateCollection(@Param('id') id: string, @Body() dto: UpdateGoalCollectionDto) {
    const data = await this.manageCollectionsUseCase.update(Number(id), dto)
    return { data, message: 'Collection updated' }
  }

  @Delete('collections/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCollection(@Param('id') id: string) {
    await this.manageCollectionsUseCase.delete(Number(id))
    return { message: 'Collection deleted' }
  }

  @Post(':goalId/offerings/link')
  @HttpCode(HttpStatus.OK)
  async linkOffering(@Param('goalId') goalId: string, @Body() dto: LinkOfferingDto) {
    const data = await this.manageCollectionsUseCase.linkOffering(Number(goalId), dto)
    return { data, message: 'Offering linked to goal' }
  }

  @Delete(':goalId/offerings/:offeringId')
  @HttpCode(HttpStatus.OK)
  async unlinkOffering(
    @Param('goalId') goalId: string,
    @Param('offeringId') offeringId: string,
    @Query('collectionId') collectionId?: string,
  ) {
    await this.manageCollectionsUseCase.unlinkOffering(
      Number(goalId),
      Number(offeringId),
      collectionId ? Number(collectionId) : undefined,
    )
    return { message: 'Offering unlinked from goal' }
  }

  // 5. Offerings CRUD
  @Get('offerings')
  @HttpCode(HttpStatus.OK)
  async listOfferings(@Query() query: OfferingQueryDto) {
    const result = await this.manageOfferingsUseCase.list(query)
    return {
      data: result.items,
      meta: {
        total: result.total,
        skip: query.skip || 0,
        take: query.take || 20,
      },
    }
  }

  @Get('offerings/:id')
  @HttpCode(HttpStatus.OK)
  async getOffering(@Param('id') id: string) {
    const data = await this.manageOfferingsUseCase.getById(Number(id))
    return { data }
  }

  @Post('offerings')
  @HttpCode(HttpStatus.CREATED)
  async createOffering(@Body() dto: CreateOfferingDto) {
    const data = await this.manageOfferingsUseCase.create(dto)
    return { data, message: 'Offering created' }
  }

  @Patch('offerings/:id')
  @HttpCode(HttpStatus.OK)
  async updateOffering(@Param('id') id: string, @Body() dto: UpdateOfferingDto) {
    const data = await this.manageOfferingsUseCase.update(Number(id), dto)
    return { data, message: 'Offering updated' }
  }

  @Delete('offerings/:id')
  @HttpCode(HttpStatus.OK)
  async deleteOffering(@Param('id') id: string) {
    await this.manageOfferingsUseCase.delete(Number(id))
    return { message: 'Offering deleted' }
  }

  @Put('offerings/:id/package-items')
  @HttpCode(HttpStatus.OK)
  async setPackageItems(
    @Param('id') id: string,
    @Body('items') items: PackageItemInputDto[],
  ) {
    const mappedItems = (items || []).map((item) => ({
      componentId: item.componentId,
      quantity: item.quantity ?? 1,
      isOptional: item.isOptional ?? false,
      overridePrice: item.overridePrice,
    }))
    const data = await this.manageOfferingsUseCase.setPackageItems(Number(id), mappedItems)
    return { data, message: 'Package items updated' }
  }

  // 6. Vendors CRUD
  @Get('vendors')
  @HttpCode(HttpStatus.OK)
  async listVendors(@Query('search') search?: string, @Query('isActive') isActive?: string) {
    const filter = {
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    }
    const data = await this.manageVendorsUseCase.list(filter)
    return { data }
  }

  @Get('vendors/:id')
  @HttpCode(HttpStatus.OK)
  async getVendor(@Param('id') id: string) {
    const data = await this.manageVendorsUseCase.getById(Number(id))
    return { data }
  }

  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  async createVendor(@Body() dto: CreateVendorDto) {
    const data = await this.manageVendorsUseCase.create(dto)
    return { data, message: 'Vendor created' }
  }

  @Patch('vendors/:id')
  @HttpCode(HttpStatus.OK)
  async updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    const data = await this.manageVendorsUseCase.update(Number(id), dto)
    return { data, message: 'Vendor updated' }
  }

  @Delete('vendors/:id')
  @HttpCode(HttpStatus.OK)
  async deleteVendor(@Param('id') id: string) {
    await this.manageVendorsUseCase.delete(Number(id))
    return { message: 'Vendor deleted' }
  }
}
