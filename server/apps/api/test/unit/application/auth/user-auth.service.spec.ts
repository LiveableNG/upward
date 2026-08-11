import { UserAuthService } from '@application/auth/user-auth.service';
import { UserRepository } from '@domains/users/user.repository';
import { VerificationTokenRepository } from '@domains/auth/verification-token.repository';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { EmailService } from '@shared/infrastructure/email/email.service';
import { SmsService } from '@shared/infrastructure/sms/sms.service';
import { WhatsappService } from '@shared/infrastructure/whatsapp/whatsapp.service';
import { EncryptionService } from '@shared/infrastructure/common/encryption.service';
import { S3Service } from '@shared/infrastructure/common/s3/s3.service';
import { InitializeUserSequenceUseCase } from '@application/use-cases/whatsapp-sequence/initialize-user-sequence.use-case';
import { InitializeEmailSequenceUseCase } from '@application/use-cases/email-sequence/initialize-email-sequence.use-case';
import { UnifiedCommunicationService } from '@shared/infrastructure/communication/unified-communication.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UserAuthService', () => {
  let service: UserAuthService;
  let userRepo: jest.Mocked<UserRepository>;
  let tokenRepo: jest.Mocked<VerificationTokenRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SmsService>;
  let whatsappService: jest.Mocked<WhatsappService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let s3Service: jest.Mocked<S3Service>;
  let initUserSequence: jest.Mocked<InitializeUserSequenceUseCase>;
  let initEmailSequence: jest.Mocked<InitializeEmailSequenceUseCase>;
  let unifiedCommService: jest.Mocked<UnifiedCommunicationService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      encryption: {
        hash: jest.fn().mockImplementation((val) => `hash-${val}`),
        encrypt: jest.fn().mockImplementation((val) => `enc-${val}`),
      },
    } as any;

    tokenRepo = {} as any;

    prisma = {
      upward_auth_session: {
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      upward_communication_log: {
        create: jest.fn(),
      },
      upward_pm_tenant: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;

    emailService = {
      sendCustomerSupportNotification: jest.fn().mockResolvedValue({}),
    } as any;

    smsService = {} as any;

    whatsappService = {
      sendMessage: jest.fn().mockResolvedValue({}),
    } as any;

    encryptionService = {
      encrypt: jest.fn().mockImplementation((val) => `enc-${val}`),
      decrypt: jest.fn().mockImplementation((val) => val.replace('enc-', '')),
      hash: jest.fn().mockImplementation((val) => `hash-${val}`),
    } as any;

    s3Service = {
      getDownloadUrl: jest.fn().mockImplementation(async (key) => `https://s3/${key}`),
    } as any;

    initUserSequence = {
      execute: jest.fn().mockResolvedValue({}),
    } as any;

    initEmailSequence = {
      execute: jest.fn().mockResolvedValue({}),
    } as any;

    unifiedCommService = {
      processCommunication: jest.fn().mockResolvedValue({}),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verifyAsync: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        return null;
      }),
    } as any;

    service = new UserAuthService(
      userRepo,
      tokenRepo,
      prisma,
      emailService,
      smsService,
      whatsappService,
      encryptionService,
      s3Service,
      initUserSequence,
      initEmailSequence,
      unifiedCommService,
      jwtService,
      configService
    );
  });

  describe('signup', () => {
    it('should throw ConflictException if user with the same email already exists', async () => {
      userRepo.findByEmail.mockResolvedValue({ id: 1, email: 'taken@example.com', passwordHash: '$2b$10$hashedpassword' } as any);

      await expect(
        service.signup({
          email: 'taken@example.com',
          password: 'Password123',
          firstName: 'Ada',
          lastName: 'Obi',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should create a user, hash password, and generate token response', async () => {
      userRepo.findByEmail.mockResolvedValueOnce(null); // doesn't exist yet
      userRepo.save.mockResolvedValue({} as any);

      const mockSavedUser = {
        id: 10,
        uuid: 'user-uuid-888',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Obi',
        passwordHash: 'hashed-pw',
        phone: null,
      };

      userRepo.findByEmail.mockResolvedValueOnce(mockSavedUser as any);

      const result = await service.signup({
        email: 'ada@example.com',
        password: 'SecurePassword1!',
        firstName: 'Ada',
        lastName: 'Obi',
      });

      expect(userRepo.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('ada@example.com');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if credentials are invalid', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('wrong@example.com', 'some-pass')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should validate matching password and return auth response', async () => {
      const plainPassword = 'CorrectPassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const mockUser = {
        id: 20,
        uuid: 'user-uuid-999',
        email: 'test@example.com',
        passwordHash: hashedPassword,
      };

      userRepo.findByEmail.mockResolvedValue(mockUser as any);

      const result = await service.login('test@example.com', plainPassword);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
