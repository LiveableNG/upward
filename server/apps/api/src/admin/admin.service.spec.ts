import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { AdminLogService } from '../admin-log/admin-log.service'

describe('AdminService', () => {
  let service: AdminService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            upward_waitlist: {
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              upsert: jest.fn(),
            },
            upward_session: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            upward_attendance: {
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            upward_email_log: {
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
            upward_admin: {
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            $transaction: jest.fn((cb) => cb(this)),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendGenericEmail: jest.fn(),
          },
        },
        {
          provide: AdminLogService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
