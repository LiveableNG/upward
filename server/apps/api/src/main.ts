import 'reflect-metadata'

// Handle BigInt serialization for JSON.stringify
declare global {
  interface BigInt {
    toJSON(): string
  }
}
BigInt.prototype.toJSON = function () {
  return this.toString()
}

import { NestFactory } from '@nestjs/core'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import fastifyCookie from '@fastify/cookie'

let cachedApp: NestFastifyApplication
let initializationPromise: Promise<NestFastifyApplication> | null = null

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )

  // Use 'as any' to bypass complex type mismatches between NestJS 11 and Fastify 5 plugins
  await app.register(fastifyCookie as any)

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const frontendUrl = process.env['FRONTEND_URL']
  const origins = frontendUrl
    ? frontendUrl.split(',').map((url) => url.trim())
    : ['http://localhost:3000', 'http://localhost:5173']

  // Allow Capacitor origins for mobile app
  origins.push('capacitor://localhost')
  origins.push('http://localhost')

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  })

  app.enableShutdownHooks()
  return app
}

async function getApp() {
  if (cachedApp) return cachedApp
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    const app = await bootstrap()
    await app.init()
    const instance = app.getHttpAdapter().getInstance()
    await instance.ready()
    cachedApp = app
    return app
  })()

  return initializationPromise
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
  const app = await getApp()
  const instance = app.getHttpAdapter().getInstance()

  if (req.url === '/' || req.url === '') {
    req.url = '/api/v1'
  }

  instance.server.emit('request', req, res)
}
