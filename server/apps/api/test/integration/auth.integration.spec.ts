import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { cleanDatabase } from '../helpers/test-db-helper';
import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('Auth (Integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Only run if DATABASE_URL_TEST is set
    if (!process.env.DATABASE_URL_TEST) {
      console.warn('Skipping integration tests: DATABASE_URL_TEST is not set.');
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
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Replicate bootstrap configuration
    await app.register(fastifyCookie as any);
    app.setGlobalPrefix('api/v1');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
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
    describe('PM Cookie-Based Authentication Flow', () => {
      const testEmail = 'pm-test-integration@example.com';
      const testPassword = 'SecurePassword123!';

      it('should register a new Property Manager and return cookies', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/signup',
          payload: {
            email: testEmail,
            password: testPassword,
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'JD Real Estate',
            phone: '+2348000000000',
            pmType: 'INDIVIDUAL',
          },
        });

        expect(response.statusCode).toBe(HttpStatus.CREATED);

        const cookies = response.cookies;
        const accessTokenCookie = cookies.find(c => c.name === 'pm_access_token');
        const refreshTokenCookie = cookies.find(c => c.name === 'pm_refresh');

        expect(accessTokenCookie).toBeDefined();
        expect(refreshTokenCookie).toBeDefined();
        expect(accessTokenCookie?.value).not.toBeNull();
      });

      it('should login, set cookies, and deny unauthorized access to /me', async () => {
        // 1. Try accessing /me without auth cookie
        const unauthorizedResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/pm/auth/me',
        });
        expect(unauthorizedResponse.statusCode).toBe(HttpStatus.UNAUTHORIZED);

        // 2. Perform Signup
        await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/signup',
          payload: {
            email: testEmail,
            password: testPassword,
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'JD Real Estate',
            phone: '+2348000000000',
            pmType: 'INDIVIDUAL',
          },
        });

        // 3. Perform Login
        const loginResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/login',
          payload: {
            email: testEmail,
            password: testPassword,
          },
        });

        expect(loginResponse.statusCode).toBe(HttpStatus.OK);
        
        const cookies = loginResponse.cookies;
        const accessToken = cookies.find(c => c.name === 'pm_access_token')?.value;
        const refreshToken = cookies.find(c => c.name === 'pm_refresh')?.value;
        expect(accessToken).toBeDefined();

        // 4. Request /me using access token cookie
        const profileResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/pm/auth/me',
          cookies: {
            pm_access_token: accessToken!,
          },
        });

        expect(profileResponse.statusCode).toBe(HttpStatus.OK);
        const body = JSON.parse(profileResponse.body);
        expect(body.email).toBe(testEmail);
      });

      it('should refresh authentication using refresh token', async () => {
        // Signup
        await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/signup',
          payload: {
            email: testEmail,
            password: testPassword,
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'JD Real Estate',
            phone: '+2348000000000',
            pmType: 'INDIVIDUAL',
          },
        });

        // Login to get tokens
        const loginResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/login',
          payload: {
            email: testEmail,
            password: testPassword,
          },
        });

        const originalRefreshToken = loginResponse.cookies.find(c => c.name === 'pm_refresh')?.value;

        // Perform Refresh call
        const refreshResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/refresh',
          cookies: {
            pm_refresh: originalRefreshToken!,
          },
        });

        expect(refreshResponse.statusCode).toBe(HttpStatus.OK);
        const newAccessToken = refreshResponse.cookies.find(c => c.name === 'pm_access_token')?.value;
        expect(newAccessToken).toBeDefined();
      });

      it('should clear cookies on logout', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/pm/auth/logout',
        });

        expect(response.statusCode).toBe(HttpStatus.OK);
        
        // Fastify reply clears cookies by setting expiration time to past
        const accessTokenHeader = response.headers['set-cookie'];
        expect(accessTokenHeader).toBeDefined();
        
        // Should contain indicators of cleared cookies
        const headersStr = Array.isArray(accessTokenHeader) ? accessTokenHeader.join(';') : (accessTokenHeader as string);
        expect(headersStr).toContain('Max-Age=0');
      });
    });
  }
});
