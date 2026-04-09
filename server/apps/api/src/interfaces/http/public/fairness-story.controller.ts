import { Controller, Post, Get, Body, Delete, Param } from '@nestjs/common'
import { CreateStoryDto } from '../dto/create-story.dto'
import { CreateFairnessStoryUseCase } from '../../../application/use-cases/fairness-story/create-fairness-story.use-case'
import { GetFairnessStoriesUseCase } from '../../../application/use-cases/fairness-story/get-fairness-stories.use-case'
import { DeleteFairnessStoryUseCase } from '../../../application/use-cases/fairness-story/delete-fairness-story.use-case'
import {
  GetStoryUploadUrlsUseCase,
  StoryFileUploadDto,
} from '../../../application/use-cases/fairness-story/get-story-upload-urls.use-case'

@Controller('fairness-story')
export class FairnessStoryController {
  constructor(
    private readonly createUseCase: CreateFairnessStoryUseCase,
    private readonly getAllUseCase: GetFairnessStoriesUseCase,
    private readonly deleteUseCase: DeleteFairnessStoryUseCase,
    private readonly getUploadUrlsUseCase: GetStoryUploadUrlsUseCase,
  ) {}

  @Post('upload-urls')
  async getUploadUrls(@Body() body: { files: StoryFileUploadDto[] }) {
    return this.getUploadUrlsUseCase.execute(body.files)
  }

  @Post()
  async create(@Body() createStoryDto: CreateStoryDto) {
    return this.createUseCase.execute(createStoryDto)
  }

  @Get()
  async findAll() {
    return this.getAllUseCase.execute()
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.deleteUseCase.execute(id)
  }
}
