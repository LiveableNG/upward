import { Inject, Injectable } from '@nestjs/common'
import { FEEDBACK_REPOSITORY, IFeedbackRepository } from '../../../domains/feedback/feedback.repository'
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class SubmitFeedbackDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
    return isNaN(parsed) ? undefined : parsed
  })
  @IsInt()
  userId?: number

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
    return isNaN(parsed) ? undefined : parsed
  })
  @IsInt()
  pmId?: number

  @IsString()
  @IsOptional()
  pmUuid?: string

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

  async execute(dto: SubmitFeedbackDto & { pmUuid?: string }) {
    return await this.feedbackRepository.create({
      userId: dto.userId,
      pmId: dto.pmId,
      pmUuid: dto.pmUuid,
      email: dto.email,
      name: dto.name,
      type: dto.type,
      message: dto.message,
    } as any)
  }
}
