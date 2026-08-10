import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { PLATFORM_REPOSITORY, PlatformRepository } from '../../src/domains/companies/company.repository';
import { EVENT_BUS } from '../../src/application/events/domain-event';
import { cleanDatabase } from '../helpers/test-db-helper';
import { HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

describe('Platform API Key Validation (Integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let platformRepo: PlatformRepository;

  beforeAll(async () => {
    jest.setTimeout(30000);
    if (!process.env.DATABASE_URL_TEST) {
      console.warn('Skipping platform integration tests: DATABASE_URL_TEST is not set.');
      return;
    }

    const { EventEmitter2 } = require('@nestjs/event-emitter');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EventEmitter2)
      .useValue({
        emit: jest.fn(),
        emitAsync: jest.fn().mockResolvedValue([]),
        on: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
      })
      .overrideProvider(EVENT_BUS)
      .useValue({
        publish: jest.fn(),
        publishAll: jest.fn(),
        subscribe: jest.fn().mockImplementation(() => ({
          unsubscribe: jest.fn(),
          add: jest.fn().mockImplementation((child) => child),
        })),
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
    platformRepo = app.get(PLATFORM_REPOSITORY);
  });

  afterAll(async () => {
    if (app) {
      await prisma.$disconnect();
      await app.close();
    }
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL_TEST) return;
    await cleanDatabase(prisma);
  });

  it('should skip tests if no database config is present', () => {
    if (!process.env.DATABASE_URL_TEST) {
      expect(true).toBe(true);
    }
  });

  if (process.env.DATABASE_URL_TEST) {
    describe('Platform Header Authentication Flow', () => {
      it('should successfully authorize request with a valid x-api-key', async () => {
        // 1. Generate API key and hash it for DB persistence
        const rawApiKey = 'upward_platform_secret_key_999';
        const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

        // 2. Save platform to database using repository
        await platformRepo.save({
          apiKey: apiKeyHash,
          webhookUrl: 'https://example.com/platform-webhook',
          name: 'Integration Test Platform',
          email: 'platform-integration@example.com',
        } as any);

        // 3. Request platform/payments/proof with valid key
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/platform/payments/proof',
          headers: {
            'x-api-key': rawApiKey,
          },
        });

        expect(response.statusCode).toBe(HttpStatus.OK);
        const body = JSON.parse(response.payload);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it('should fail with 401 Unauthorized when x-api-key header is missing', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/platform/payments/proof',
        });

        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Missing API key');
      });

      it('should fail with 401 Unauthorized when x-api-key is invalid', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/platform/payments/proof',
          headers: {
            'x-api-key': 'non_existent_key_123',
          },
        });

        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        const body = JSON.parse(response.payload);
        expect(body.message).toBe('Invalid API key');
      });
    });
  }
});
