import { Module, Global } from '@nestjs/common'
import { BugsnagService } from './bugsnag.service'

@Global()
@Module({
  providers: [BugsnagService],
  exports: [BugsnagService],
})
export class BugsnagModule {}
