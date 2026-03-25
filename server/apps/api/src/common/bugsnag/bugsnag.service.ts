/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Bugsnag from '@bugsnag/js'
import BugsnagPluginExpress from '@bugsnag/plugin-express'

@Injectable()
export class BugsnagService implements OnModuleInit {
  private readonly logger = new Logger(BugsnagService.name)

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('BUGSNAG_API_KEY')
    if (!apiKey) {
      this.logger.warn('BUGSNAG_API_KEY not found. Bugsnag error tracking is disabled.')
      return
    }

    Bugsnag.start({
      apiKey,
      plugins: [BugsnagPluginExpress],
      releaseStage: process.env.NODE_ENV || 'development',
      enabledReleaseStages: ['production', 'staging'], // Only track in these stages if needed, or keep all
    })

    this.logger.log('Bugsnag error tracking initialized.')
  }

  notify(error: any, context?: any) {
    Bugsnag.notify(error, (event) => {
      if (context) {
        event.addMetadata('request', context)
      }
    })
  }
}
