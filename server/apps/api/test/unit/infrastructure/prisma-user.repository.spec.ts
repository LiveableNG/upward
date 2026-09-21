import { PrismaUserRepository } from '@shared/infrastructure/prisma/repositories/prisma-user.repository';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '@shared/infrastructure/common/encryption.service';

describe('PrismaUserRepository - Property Verification Mapping', () => {
  let repository: PrismaUserRepository;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockEncryption: jest.Mocked<EncryptionService>;

  beforeEach(() => {
    mockPrisma = {} as any;
    mockEncryption = {
      encrypt: jest.fn((val) => `enc_${val}`),
      decrypt: jest.fn((val) => (val ? val.replace('enc_', '') : val)),
      hash: jest.fn((val) => `hash_${val}`),
    } as any;

    repository = new PrismaUserRepository(mockPrisma, mockEncryption);
  });

  const baseUserModel = {
    id: 1,
    uuid: 'usr_123',
    email: 'enc_test@example.com',
    emailHash: 'hash_test@example.com',
    firstName: 'enc_John',
    firstNameHash: 'hash_John',
    lastName: 'enc_Doe',
    lastNameHash: 'hash_Doe',
  };

  it('should NOT mark property as verified or managed when connected to an external platform if isVerified is false', () => {
    const model = {
      ...baseUserModel,
      properties: [
        {
          id: 10,
          uuid: 'prop_ext_pending',
          rentAmount: 2000000,
          isVerified: false,
          verificationStatus: 'PENDING',
          company: {
            id: 5,
            name: 'enc_External PM Platform',
            platformId: 99,
          },
        },
      ],
    };

    const user = (repository as any).toDomain(model);
    expect(user.properties).toHaveLength(1);
    const prop = user.properties[0];

    expect(prop.isVerified).toBe(false);
    expect(prop.isManaged).toBe(false);
    expect(prop.isPlatformLinked).toBe(true);
    expect(prop.verificationStatus).toBe('PENDING');
  });

  it('should mark property as verified and managed once external platform confirms and sets isVerified = true', () => {
    const model = {
      ...baseUserModel,
      properties: [
        {
          id: 11,
          uuid: 'prop_ext_verified',
          rentAmount: 2000000,
          isVerified: true,
          verificationStatus: 'VERIFIED',
          platformId: 99,
          externalUnitId: 'UNIT-101',
          company: {
            id: 5,
            name: 'enc_External PM Platform',
            platformId: 99,
          },
        },
      ],
    };

    const user = (repository as any).toDomain(model);
    expect(user.properties).toHaveLength(1);
    const prop = user.properties[0];

    expect(prop.isVerified).toBe(true);
    expect(prop.isManaged).toBe(true);
    expect(prop.isPlatformLinked).toBe(true);
    expect(prop.verificationStatus).toBe('VERIFIED');
  });

  it('should NOT mark property as managed if linked to Upward PM but isVerified is false', () => {
    const model = {
      ...baseUserModel,
      properties: [
        {
          id: 12,
          uuid: 'prop_pm_pending',
          rentAmount: 1500000,
          isVerified: false,
          verificationStatus: 'PENDING',
          pmId: 4,
          pm: {
            id: 4,
            uuid: 'pm_4',
            firstName: 'enc_Manager',
            lastName: 'enc_One',
            email: 'enc_pm@example.com',
          },
        },
      ],
    };

    const user = (repository as any).toDomain(model);
    expect(user.properties).toHaveLength(1);
    const prop = user.properties[0];

    expect(prop.isVerified).toBe(false);
    expect(prop.isManaged).toBe(false);
    expect(prop.isPlatformLinked).toBe(false);
  });

  it('should mark property as managed when linked to Upward PM and isVerified is true', () => {
    const model = {
      ...baseUserModel,
      properties: [
        {
          id: 13,
          uuid: 'prop_pm_verified',
          rentAmount: 1500000,
          isVerified: true,
          verificationStatus: 'VERIFIED',
          pmId: 4,
          pm: {
            id: 4,
            uuid: 'pm_4',
            firstName: 'enc_Manager',
            lastName: 'enc_One',
            email: 'enc_pm@example.com',
          },
        },
      ],
    };

    const user = (repository as any).toDomain(model);
    expect(user.properties).toHaveLength(1);
    const prop = user.properties[0];

    expect(prop.isVerified).toBe(true);
    expect(prop.isManaged).toBe(true);
    expect(prop.isPlatformLinked).toBe(false);
  });
});
