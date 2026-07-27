import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common'
import { GetPublicBlogPostBySlugUseCase, GetPublicBlogPostsUseCase } from '../../../application/use-cases/blog/blog-post.use-cases'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { Response } from 'express' // Using fastify/express generic

@Controller('public/blog')
export class PublicBlogController {
  constructor(
    private readonly getPublicBlogPostsUseCase: GetPublicBlogPostsUseCase,
    private readonly getPublicBlogPostBySlugUseCase: GetPublicBlogPostBySlugUseCase,
    private readonly s3Service: S3Service,
  ) {}

  @Get('posts')
  async getPosts() {
    return { data: await this.getPublicBlogPostsUseCase.execute() }
  }

  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return { data: await this.getPublicBlogPostBySlugUseCase.execute(slug) }
  }

  @Get('images/:filename')
  async getBlogImage(@Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    return this.s3Service.streamFile(`blog/images/${filename}`, res);
  }
}
