import { Controller, Get, Param } from '@nestjs/common'
import { GetPublicBlogPostBySlugUseCase, GetPublicBlogPostsUseCase } from '../../../application/use-cases/blog/blog-post.use-cases'

@Controller('public/blog')
export class PublicBlogController {
  constructor(
    private readonly getPublicBlogPostsUseCase: GetPublicBlogPostsUseCase,
    private readonly getPublicBlogPostBySlugUseCase: GetPublicBlogPostBySlugUseCase,
  ) {}

  @Get('posts')
  async getPosts() {
    return { data: await this.getPublicBlogPostsUseCase.execute() }
  }

  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return { data: await this.getPublicBlogPostBySlugUseCase.execute(slug) }
  }
}
