import { Injectable, Inject, Logger } from '@nestjs/common'
import {
  IEmailSequenceRepository,
  EMAIL_SEQUENCE_REPOSITORY,
  EmailSequenceLog,
} from '../../../domains/email-sequence/email-sequence.repository.interface'

export interface InitializeEmailSequenceCommand {
  userId: number
  email: string
}

@Injectable()
export class InitializeEmailSequenceUseCase {
  private readonly logger = new Logger(InitializeEmailSequenceUseCase.name)

  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
  ) {}

  async execute(command: InitializeEmailSequenceCommand): Promise<void> {
    try {
      const now = new Date()

      const schedule = [
        { stage: 'WELCOME', daysOffset: 0, templateName: 'WELCOME_EMAIL' },
        { stage: 'DAY_2', daysOffset: 2, templateName: 'DAY_2_EMAIL' },
        { stage: 'DAY_5', daysOffset: 5, templateName: 'DAY_5_EMAIL' },
        { stage: 'DAY_9', daysOffset: 9, templateName: 'DAY_9_EMAIL' },
        { stage: 'DAY_14', daysOffset: 14, templateName: 'DAY_14_EMAIL' },
      ]

      const sequenceLogs: EmailSequenceLog[] = schedule.map((item) => {
        const scheduledFor = new Date(now)
        scheduledFor.setDate(now.getDate() + item.daysOffset)
        
        // Ensure morning delivery (e.g., 8 AM) for days other than 0
        if (item.daysOffset > 0) {
          scheduledFor.setHours(8, 0, 0, 0)
        }

        return {
          userId: command.userId,
          email: command.email,
          stage: item.stage as 'WELCOME' | 'DAY_2' | 'DAY_5' | 'DAY_9' | 'DAY_14',
          status: 'PENDING',
          scheduledFor,
          templateName: item.templateName,
          templateData: {},
        }
      })

      await this.sequenceRepository.createMany(sequenceLogs)
      this.logger.log(`Initialized email sequence for user ${command.userId}`)
    } catch (error) {
      this.logger.error(`Failed to initialize email sequence for user ${command.userId}`, error)
    }
  }
}
