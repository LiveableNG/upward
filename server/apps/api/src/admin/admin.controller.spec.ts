import { Test, TestingModule } from '@nestjs/testing'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

describe('AdminController', () => {
  let controller: AdminController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            getAllUsers: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            bulkUpload: jest.fn(),
            getSessions: jest.fn(),
            createSession: jest.fn(),
            markAttendance: jest.fn(),
            sendBulkEmail: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AdminController>(AdminController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
