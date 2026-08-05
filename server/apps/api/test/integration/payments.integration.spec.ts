import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { cleanDatabase } from '../helpers/test-db-helper';
import { HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

import { USER_REPOSITORY, UserRepository } from '../../src/domains/users/user.repository';
import { EVENT_BUS } from '../../src/application/events/domain-event';

describe('Payments Webhook (Integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let userRepo: UserRepository;

  beforeAll(async () => {
    jest.setTimeout(30000);
    if (!process.env.DATABASE_URL_TEST) {
      console.warn('Skipping payments integration tests: DATABASE_URL_TEST is not set.');
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
    configService = app.get(ConfigService);
    userRepo = app.get(USER_REPOSITORY);
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
    describe('Paystack Webhook Processing Flow', () => {
      it('should successfully process a valid charge.success webhook and transition DB records', async () => {
        // 1. Seed base data: User
        const testUserEmail = 'tenant-payments@example.com';
        const user = await userRepo.save({
          uuid: crypto.randomUUID(),
          email: testUserEmail,
          passwordHash: 'somehashedpwd',
          firstName: 'Dave',
          lastName: 'Maland',
        } as any);

        // 2. Seed User Property
        const property = await prisma.upward_user_property.create({
          data: {
            userId: user.id!,
            rentAmount: 100000,
            currency: 'NGN',
            isVerified: true,
          },
        });

        // 3. Seed Payment Request
        const paymentRequest = await prisma.upward_payment_request.create({
          data: {
            userId: user.id!,
            userPropertyId: property.id,
            amount: 100000,
            currency: 'NGN',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
            allowPartial: true,
          },
        });

        // Seed Payment Line Item so rent calculations succeed
        await prisma.upward_payment_line_item.create({
          data: {
            paymentRequestId: paymentRequest.id,
            name: 'Rent',
            totalAmount: 100000,
            amountPaid: 0,
            status: 'PENDING',
          },
        });

        // 4. Construct payload mimicking Paystack's charge.success structure
        // The fee structure for rent < 1,000,000 NGN is: txFee=500, benefitsFee=1000
        // Total = 100,000 rent + 500 txFee + 1,000 benefitsFee = 101,500 NGN
        const RENT_AMOUNT = 100000;
        const TX_FEE = 500;
        const BENEFITS_FEE = 1000;
        const TOTAL_PAID = RENT_AMOUNT + TX_FEE + BENEFITS_FEE; // 101500
        const payload = {
          event: 'charge.success',
          data: {
            reference: `TFD_PAYMENT_${TOTAL_PAID}_${Date.now()}`,
            amount: TOTAL_PAID * 100, // Paystack sends amount in kobo (101500 * 100 = 10150000)
            currency: 'NGN',
            status: 'success',
            metadata: {
              source_app: 'upward',
              userUuid: user.uuid,
              paymentRequestId: paymentRequest.id,
              type: 'RENT',
            },
            customer: {
              email: testUserEmail,
            },
          },
        };

        // 5. Generate HMAC SHA512 signature using the app config's Paystack secret key
        const secret = configService.get<string>('PAYSTACK_SECRET_KEY') || 'sk_test_fallback';
        const bodyString = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha512', secret)
          .update(bodyString)
          .digest('hex');

        // 6. Inject request to NestJS fastify app
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/payments/webhook',
          payload,
          headers: {
            'x-paystack-signature': signature,
          },
        });

        expect(response.statusCode).toBe(HttpStatus.CREATED || HttpStatus.OK);

        // 7. Verify database transition: Transaction must be seeded, Payment Request must be paid
        const updatedPaymentRequest = await prisma.upward_payment_request.findUnique({
          where: { id: paymentRequest.id },
        });

        expect(updatedPaymentRequest?.status).toBe('PAID');
        expect(updatedPaymentRequest?.amountPaid).toBe(RENT_AMOUNT);

        const tx = await prisma.upward_transaction.findFirst({
          where: { reference: payload.data.reference },
        });

        expect(tx).toBeDefined();
        expect(tx?.amount).toBe(TOTAL_PAID); // 101500
        expect(tx?.status).toBe('SUCCESS');
      });

      it('should fail with 401 Unauthorized when signature is missing', async () => {
        const payload = {
          event: 'charge.success',
          data: {},
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/payments/webhook',
          payload,
        });

        expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  }
});
