import { Module } from '@nestjs/common'

/**
 * Domain layer contains ONLY pure business logic, entities, and repository interfaces.
 * It must NOT depend on any other layers.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class DomainsModule {}
