import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, BadRequestException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import {
  CreateBlogPostUseCase,
  DeleteBlogPostUseCase,
  GetAdminBlogPostsUseCase,
  PublishBlogPostUseCase,
  UnpublishBlogPostUseCase,
  UpdateBlogPostUseCase,
  UploadBlogImageUseCase,
} from '../../../application/use-cases/blog/blog-post.use-cases'
import { CreateBlogPostDto, UpdateBlogPostDto } from '../dto/blog-post.dto'

@Controller('admin/blog-posts')
@UseGuards(AdminJwtAuthGuard)
export class AdminBlogPostsController {
  constructor(
    private readonly getAdminBlogPostsUseCase: GetAdminBlogPostsUseCase,
    private readonly createBlogPostUseCase: CreateBlogPostUseCase,
    private readonly updateBlogPostUseCase: UpdateBlogPostUseCase,
    private readonly publishBlogPostUseCase: PublishBlogPostUseCase,
    private readonly unpublishBlogPostUseCase: UnpublishBlogPostUseCase,
    private readonly deleteBlogPostUseCase: DeleteBlogPostUseCase,
    private readonly uploadBlogImageUseCase: UploadBlogImageUseCase,
  ) {}
  @Get()
  async getAll() {
    return { data: await this.getAdminBlogPostsUseCase.execute() }
  }

  @Post()
  async create(@Body() body: CreateBlogPostDto) {
    return { data: await this.createBlogPostUseCase.execute(body) }
  }

  @Patch(':uuid')
  async update(@Param('uuid') uuid: string, @Body() body: UpdateBlogPostDto) {
    return { data: await this.updateBlogPostUseCase.execute(uuid, body) }
  }

  @Patch(':uuid/publish')
  async publish(@Param('uuid') uuid: string) {
    return { data: await this.publishBlogPostUseCase.execute(uuid) }
  }

  @Patch(':uuid/unpublish')
  async unpublish(@Param('uuid') uuid: string) {
    return { data: await this.unpublishBlogPostUseCase.execute(uuid) }
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string) {
    return { data: await this.deleteBlogPostUseCase.execute(uuid) }
  }

  @Post('upload-image')
  async uploadImage(
    @Body() body: { base64Data: string; contentType: string; originalName?: string },
  ) {
    if (!body.base64Data || !body.contentType) {
      throw new BadRequestException('base64Data and contentType are required')
    }
    
    const result = await this.uploadBlogImageUseCase.execute(body)
    
    return {
      success: true,
      ...result,
    }
  }
}
