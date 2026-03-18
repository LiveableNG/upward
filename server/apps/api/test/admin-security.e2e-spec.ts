// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication, ValidationPipe } from '@nestjs/common';
// import * as request from 'supertest';
// import { AppModule } from '../src/app.module';
// import { PrismaService } from '../src/prisma/prisma.service';
// import * as bcrypt from 'bcrypt';
// import { AdminRole } from '@upward/shared-types';

// describe('Admin Authentication & Security (e2e)', () => {
//   let app: INestApplication;
//   let prisma: PrismaService;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     app.useGlobalPipes(new ValidationPipe());
//     await app.init();

//     prisma = app.get<PrismaService>(PrismaService);

//     // Clean up and seed a test subadmin
//     await prisma.upward_admin.deleteMany({ where: { email: 'test-admin@upward.africa' } });
//     const passwordHash = await bcrypt.hash('password123', 10);
//     await prisma.upward_admin.create({
//       data: {
//         email: 'test-admin@upward.africa',
//         passwordHash,
//         role: AdminRole.ADMIN,
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.upward_admin.deleteMany({ where: { email: 'test-admin@upward.africa' } });
//     await app.close();
//   });

//   it('/auth/login (POST) - should login successfully with correct credentials', async () => {
//     const response = await request(app.getHttpServer())
//       .post('/auth/login')
//       .send({ email: 'test-admin@upward.africa', password: 'password123' })
//       .expect(200);

//     expect(response.body).toHaveProperty('accessToken');
//     expect(response.body.user.email).toBe('test-admin@upward.africa');
//   });

//   it('/auth/login (POST) - should fail with wrong password', async () => {
//     await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({ email: 'test-admin@upward.africa', password: 'wrong' })
//         .expect(401);
//   });

//   it('/admin/users (GET) - should block unauthenticated access', async () => {
//     await request(app.getHttpServer())
//       .get('/admin/users')
//       .expect(401);
//   });

//   it('/admin/admins (GET) - should block non-superadmin users', async () => {
//     const loginRes = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({ email: 'test-admin@upward.africa', password: 'password123' });

//     const token = loginRes.body.accessToken;

//     await request(app.getHttpServer())
//       .get('/admin/admins')
//       .set('Authorization', `Bearer ${token}`)
//       .expect(403);
//   });
// });
