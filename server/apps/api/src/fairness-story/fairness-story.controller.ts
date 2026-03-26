import { Controller, Post, Body, Get } from '@nestjs/common'
import { CreateStoryDto } from './dto/create-story.dto'
import { FairnessStoryService } from './fairness-story.service'

@Controller('fairness-story')
export class FairnessStoryController {
  constructor(private readonly fairnessStoryService: FairnessStoryService) {}

  @Post()
  async create(@Body() createStoryDto: CreateStoryDto) {
    return this.fairnessStoryService.create(createStoryDto)
  }

  @Get()
  async findAll() {
    return this.fairnessStoryService.findAll()
  }
}
