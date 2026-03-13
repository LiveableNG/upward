import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

let cachedApp: NestFastifyApplication

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
  })

  app.enableShutdownHooks()
  return app
}

if (!process.env['VERCEL']) {
  bootstrap().then(async (app) => {
    const port = Number(process.env['PORT'] ?? 4000)
    await app.listen(port, '0.0.0.0')
    console.log(`  Upward API listening on http://0.0.0.0:${port}/api/v1`)
  })
}

export default async function handler(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
) {
  if (!cachedApp) {
    cachedApp = await bootstrap()
    await cachedApp.init()
    const instance = cachedApp.getHttpAdapter().getInstance()
    await instance.ready()
  }

  const instance = cachedApp.getHttpAdapter().getInstance()
  instance.server.emit('request', req, res)
}
