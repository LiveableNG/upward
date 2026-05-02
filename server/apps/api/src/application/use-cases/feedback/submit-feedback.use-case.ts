import { Inject, Injectable } from '@nestjs/common'
import { FEEDBACK_REPOSITORY, IFeedbackRepository } from '@domains/feedback/feedback.repository'
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class SubmitFeedbackDto {
  @IsOptional()
  userId?: number

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsNotEmpty()
  type!: string // BUG, SUGGESTION, DIFFICULTY, OTHER

  @IsString()
  @IsNotEmpty()
  message!: string
}

@Injectable()
export class SubmitFeedbackUseCase {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly feedbackRepository: IFeedbackRepository
  ) {}

  async execute(dto: SubmitFeedbackDto) {
    return await this.feedbackRepository.create({
      userId: dto.userId,
      email: dto.email,
      name: dto.name,
      type: dto.type,
      message: dto.message,
    })
  }
}
