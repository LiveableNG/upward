import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common'
import { GetGoalCategoriesUseCase } from '../../../application/goals/use-cases/get-goal-categories.use-case'
import { GetGoalsUseCase } from '../../../application/goals/use-cases/get-goals.use-case'
import { GetGoalDetailUseCase } from '../../../application/goals/use-cases/get-goal-detail.use-case'
import { GetOfferingsUseCase } from '../../../application/goals/use-cases/get-offerings.use-case'
import { GetOfferingDetailUseCase } from '../../../application/goals/use-cases/get-offering-detail.use-case'
import { GetDeliveryZonesUseCase } from '../../../application/commerce/use-cases/get-delivery-zones.use-case'
import { GoalQueryDto } from '../../../application/goals/dto/goal.dto'
import { OfferingQueryDto } from '../../../application/goals/dto/offering.dto'

@Controller('public/goals')
export class PublicGoalsController {
  constructor(
    private readonly getCategoriesUseCase: GetGoalCategoriesUseCase,
    private readonly getGoalsUseCase: GetGoalsUseCase,
    private readonly getGoalDetailUseCase: GetGoalDetailUseCase,
    private readonly getOfferingsUseCase: GetOfferingsUseCase,
    private readonly getOfferingDetailUseCase: GetOfferingDetailUseCase,
    private readonly getDeliveryZonesUseCase: GetDeliveryZonesUseCase,
  ) {}

  @Get('delivery-zones')
  @HttpCode(HttpStatus.OK)
  async getDeliveryZones() {
    const data = await this.getDeliveryZonesUseCase.execute()
    return { data }
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async getCategories() {
    const data = await this.getCategoriesUseCase.execute({
      status: 'PUBLISHED',
      includeGoals: true,
    })
    return { data }
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async getGoals(@Query() query: GoalQueryDto) {
    const result = await this.getGoalsUseCase.execute({ ...query, status: 'PUBLISHED' })
    return {
      data: result.items,
      meta: {
        total: result.total,
        skip: query.skip || 0,
        take: query.take || 20,
      },
    }
  }

  @Get('detail/:identifier')
  @HttpCode(HttpStatus.OK)
  async getGoalDetail(@Param('identifier') identifier: string) {
    const data = await this.getGoalDetailUseCase.execute(identifier)
    return { data }
  }

  @Get('offerings')
  @HttpCode(HttpStatus.OK)
  async getOfferings(@Query() query: OfferingQueryDto) {
    const result = await this.getOfferingsUseCase.execute({ ...query, status: 'PUBLISHED' })
    return {
      data: result.items,
      meta: {
        total: result.total,
        skip: query.skip || 0,
        take: query.take || 20,
      },
    }
  }

  @Get('offerings/:identifier')
  @HttpCode(HttpStatus.OK)
  async getOfferingDetail(@Param('identifier') identifier: string) {
    const data = await this.getOfferingDetailUseCase.execute(identifier)
    return { data }
  }
}
