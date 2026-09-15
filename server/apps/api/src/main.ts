// Guarantee that all toLocaleString formatting uses commas as thousands separators (en-US format)
const originalToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (locales, options) {
  return originalToLocaleString.call(this, locales || 'en-US', options);
};

import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe, RequestMethod } from '@nestjs/common'
import { AppModule } from './app.module'
import fastifyCookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart'

let cachedApp: NestFastifyApplication
let initializationPromise: Promise<NestFastifyApplication> | null = null

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production'

  const fastifyAdapterOptions: any = {
    bodyLimit: 1048576 * 100, // 100MB limit for base64 file uploads
  }

  if (isDev) {
    fastifyAdapterOptions.disableRequestLogging = true
    fastifyAdapterOptions.logger = {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    }
  } else {
    fastifyAdapterOptions.logger = true
  }

  const adapter = new FastifyAdapter(fastifyAdapterOptions)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  )

  if (isDev) {
    const fastifyInstance = app.getHttpAdapter().getInstance()
    fastifyInstance.addHook('onRequest', (request: any, reply: any, done: any) => {
      request.log.debug(`--> [INCOMING]  ${request.method} ${request.url}`)
      done()
    })
    fastifyInstance.addHook('onResponse', (request: any, reply: any, done: any) => {
      const responseTime = Math.round(reply.elapsedTime)
      const status = reply.statusCode
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
      request.log[level](`<-- [COMPLETED] ${request.method} ${request.url} (${status}) +${responseTime}ms`)
      done()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyCookie as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyMultipart as any, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB per file
    },
  })

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'l/{*path}', method: RequestMethod.GET },
      { path: 'l/*', method: RequestMethod.GET },
      { path: 'l', method: RequestMethod.GET },
    ],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const frontendUrl = process.env['FRONTEND_URL']
  const baseOrigins = frontendUrl
    ? frontendUrl.split(',').map((url) => url.trim())
    : ['http://localhost:3000', 'http://localhost:5173']
    
  const origins = [
    ...baseOrigins,
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    'https://upward-web.vercel.app',
  ]

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-api-key',
      'x-client-platform',
      'x-refresh-token',
    ],
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
  if (req.url === '/favicon.ico') {
    res.statusCode = 204
    res.end()
    return
  }
  const app = await getApp()
  const instance = app.getHttpAdapter().getInstance()

  if (req.url === '/' || req.url === '') {
    req.url = '/api/v1'
  }

  instance.server.emit('request', req, res)
}
