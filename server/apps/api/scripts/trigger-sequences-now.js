// Usage: node scripts/trigger-sequences-now.js <CHANNEL> <STAGE> [ADMIN_ID]
// Example: node scripts/trigger-sequences-now.js EMAIL DAY_2 admin-1

try { require('dotenv').config({ path: '.env' }) } catch (e) {}

const { NestFactory } = require('@nestjs/core')

async function main() {
  const channel = (process.argv[2] || process.env.TRIGGER_CHANNEL || 'EMAIL').toUpperCase()
  const stage = process.argv[3] || process.env.TRIGGER_STAGE || 'DAY_2'
  // Use explicit argv[4] when provided; otherwise use env var or null (don't auto-default to a non-existent admin)
  const adminId = (typeof process.argv[4] !== 'undefined' && process.argv[4] !== null)
    ? process.argv[4]
    : (process.env.TRIGGER_ADMIN_ID ? process.env.TRIGGER_ADMIN_ID : null)

  console.log(`Triggering sequences -> channel=${channel}, stage=${stage}, adminId=${adminId}`)

  try {
    // Load compiled AppModule from dist
    const appModulePath = '../dist/src/app.module'
    const triggerUseCasePath = '../dist/src/application/use-cases/sequence/trigger-sequences.use-case'

    const { AppModule } = require(appModulePath)
    const { TriggerSequencesUseCase } = require(triggerUseCasePath)

    const app = await NestFactory.createApplicationContext(AppModule)
    const trigger = app.get(TriggerSequencesUseCase)

    if (!trigger || typeof trigger.execute !== 'function') {
      console.error('TriggerSequencesUseCase not available from DI')
      await app.close()
      process.exit(2)
    }

    await trigger.execute(channel, stage, adminId)
    console.log('Done')
    await app.close()
    process.exit(0)
  } catch (err) {
    console.error('Failed to trigger sequences:', err)
    process.exit(1)
  }
}

main()
