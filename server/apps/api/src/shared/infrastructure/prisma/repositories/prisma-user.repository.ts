import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { User, UserRepository } from '../../../../domains/users/user.repository'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(model: any): User {
    return {
      id: model.id,
      uuid: model.uuid,
      email: this.encryption.decrypt(model.email),
      emailHash: model.emailHash,
      firstName: this.encryption.decrypt(model.firstName),
      firstNameHash: model.firstNameHash,
      lastName: this.encryption.decrypt(model.lastName),
      lastNameHash: model.lastNameHash,
      phone: model.phone ? this.encryption.decrypt(model.phone) : undefined,
      phoneHash: model.phoneHash,
      passwordHash: model.passwordHash,
      authProvider: model.authProvider,
      providerId: model.providerId,
      gender: model.gender,
      dateOfBirth: model.dateOfBirth,
      isIdentityVerified: model.isIdentityVerified,
      savingsWalletEnabled: model.savingsWalletEnabled,
      isFromWaitlist: model.isFromWaitlist,
      isFromInvite: model.isFromInvite,
      profilePic: model.profilePic,
      profileSlug: model.profileSlug,
      bio: model.bio,
      properties: model.properties ? model.properties.map((p: any) => ({
        id: p.id,
        uuid: p.uuid,
        rentStartDate: p.pmUnit?.rentPayments?.[0]?.periodStart ? p.pmUnit.rentPayments[0].periodStart : p.rentStartDate,
        rentEndDate: p.pmUnit?.rentPayments?.[0]?.periodEnd ? p.pmUnit.rentPayments[0].periodEnd : p.rentEndDate,
        rentAmount: p.rentAmount,
        amountPaid: p.amountPaid,
        amountRemaining: p.amountRemaining,
        currency: p.currency,
        location: p.location,
        unitName: p.pmUnit?.unitName || undefined,
        isManaged: !!p.pmId || !!p.company?.platformId,
        isVerified: !!p.isVerified || !!p.company?.platformId,
        isPmVerified: p.pm ? !!p.pm.isVerified : false,
        isPlatformLinked: !!p.company?.platformId,
        externalUnitId: p.externalUnitId ?? undefined,
        isPastTenancy: p.isPastTenancy,
        verificationStatus: p.verificationStatus,
        rejectionReason: p.rejectionReason,
        updatedAt: p.updatedAt,
        manager: p.manager ? {
          ...p.manager,
          firstName: p.manager.firstName ? this.encryption.decrypt(p.manager.firstName) : undefined,
          lastName: p.manager.lastName ? this.encryption.decrypt(p.manager.lastName) : undefined,
          email: p.manager.email ? this.encryption.decrypt(p.manager.email) : undefined,
          phone: p.manager.phone ? this.encryption.decrypt(p.manager.phone) : undefined,
        } : (p.pm ? {
          firstName: this.encryption.decrypt(p.pm.firstName),
          lastName: this.encryption.decrypt(p.pm.lastName),
          email: this.encryption.decrypt(p.pm.email),
          phone: p.pm.phone ? this.encryption.decrypt(p.pm.phone) : undefined,
        } : undefined),
        company: p.company ? {
          ...p.company,
          name: p.company.name ? this.encryption.decrypt(p.company.name) : undefined,
          email: p.company.email ? this.encryption.decrypt(p.company.email) : undefined,
          phone: p.company.phone ? this.encryption.decrypt(p.company.phone) : undefined,
        } : (p.pm && p.pm.businessName ? {
          name: this.encryption.decrypt(p.pm.businessName),
        } : undefined),
        subaccount: p.subaccount ? {
          subaccountCode: p.subaccount.subaccountCode,
          accountNumber: p.subaccount.accountNumber,
          bankCode: p.subaccount.bankCode,
          businessName: p.subaccount.businessName
        } : undefined,
        dedicatedAccount: p.dedicatedAccount ? {
          accountNumber: p.dedicatedAccount.accountNumber,
          accountName: p.dedicatedAccount.accountName,
          bankName: p.dedicatedAccount.bankName,
          bankCode: p.dedicatedAccount.bankCode
        } : undefined,
        manualAccount: p.manualAccount ? {
          accountNumber: p.manualAccount.accountNumber,
          accountName: p.manualAccount.accountName,
          bankName: p.manualAccount.bankName,
          bankCode: p.manualAccount.bankCode
        } : undefined,
        pmManualAccount: p.pmUnit?.property?.manualAccount ? {
          accountNumber: p.pmUnit.property.manualAccount.accountNumber,
          accountName: p.pmUnit.property.manualAccount.accountName,
          bankName: p.pmUnit.property.manualAccount.bankName,
          bankCode: p.pmUnit.property.manualAccount.bankCode
        } : undefined
      })) : [],
      companyUsers: model.companyUsers ? model.companyUsers.map((cu: any) => ({
        id: cu.id,
        company: cu.company ? {
          ...cu.company,
          name: cu.company.name ? this.encryption.decrypt(cu.company.name) : undefined
        } : undefined,
        invitedAt: cu.invitedAt,
      })) : [],
      resetPasswordOTP: model.resetPasswordOTP,
      resetPasswordExpires: model.resetPasswordExpires,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findByEmail(email: string, tx?: any): Promise<User | null> {
    const prisma = tx || this.prisma
    const emailHash = this.encryption.hash(email)
    const record = await prisma.upward_user.findUnique({
      where: { emailHash },
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return record ? this.toDomain(record) : null
  }

  async findByPhone(phone: string, tx?: any): Promise<User | null> {
    const prisma = tx || this.prisma
    const phoneHash = this.encryption.hash(phone)
    const record = await prisma.upward_user.findFirst({
      where: { phoneHash },
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return record ? this.toDomain(record) : null
  }

  async findByProviderId(providerId: string, tx?: any): Promise<User | null> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user.findUnique({
      where: { providerId },
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true,
          },
        },
      },
    })
    return record ? this.toDomain(record) : null
  }

  async findById(id: number, tx?: any): Promise<User | null> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user.findUnique({
      where: { id },
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string, tx?: any): Promise<User | null> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user.findUnique({
      where: { uuid },
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return record ? this.toDomain(record) : null
  }

  async findBySlug(profileSlug: string, tx?: any): Promise<User | null> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user.findUnique({
      where: { profileSlug },
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return record ? this.toDomain(record) : null
  }

  async findAll(tx?: any): Promise<User[]> {
    const prisma = tx || this.prisma
    const records = await prisma.upward_user.findMany({
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return records.map((record: any) => this.toDomain(record))
  }

  async save(user: User, tx?: any): Promise<User> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user.create({
      data: {
        uuid: user.uuid,
        email: this.encryption.encrypt(user.email),
        emailHash: this.encryption.hash(user.email),
        firstName: this.encryption.encrypt(user.firstName),
        firstNameHash: this.encryption.hash(user.firstName),
        lastName: this.encryption.encrypt(user.lastName),
        lastNameHash: this.encryption.hash(user.lastName),
        phone: user.phone ? this.encryption.encrypt(user.phone) : null,
        phoneHash: user.phone ? this.encryption.hash(user.phone) : null,
        passwordHash: user.passwordHash,
        authProvider: user.authProvider ?? 'email',
        providerId: user.providerId ?? null,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        isIdentityVerified: user.isIdentityVerified,
        isFromWaitlist: user.isFromWaitlist,
        isFromInvite: user.isFromInvite,
        profilePic: user.profilePic,
        profileSlug: user.profileSlug,
        bio: user.bio,
        resetPasswordOTP: user.resetPasswordOTP,
        resetPasswordExpires: user.resetPasswordExpires,
      },
    })
    return this.toDomain(record)
  }

  async update(id: number, data: Partial<User>, tx?: any): Promise<User> {
    const prisma = tx || this.prisma
    const updateData: any = {}
    
    // Pick direct scalar fields
    const scalarFields = [
      'passwordHash', 'authProvider', 'providerId', 'gender', 'dateOfBirth', 'isIdentityVerified',
      'isFromWaitlist', 'isFromInvite', 'profilePic', 'profileSlug', 
      'bio', 'resetPasswordOTP', 'resetPasswordExpires'
    ]

    for (const field of scalarFields) {
      if ((data as any)[field] !== undefined) {
        updateData[field] = (data as any)[field]
      }
    }

    if (data.email) {
      updateData.email = this.encryption.encrypt(data.email)
      updateData.emailHash = this.encryption.hash(data.email)
    }
    if (data.firstName) {
      updateData.firstName = this.encryption.encrypt(data.firstName)
      updateData.firstNameHash = this.encryption.hash(data.firstName)
    }
    if (data.lastName) {
      updateData.lastName = this.encryption.encrypt(data.lastName)
      updateData.lastNameHash = this.encryption.hash(data.lastName)
    }
    if (data.phone) {
      updateData.phone = this.encryption.encrypt(data.phone)
      updateData.phoneHash = this.encryption.hash(data.phone)
    }

    const record = await prisma.upward_user.update({
      where: { id },
      data: updateData,
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: true,
            subaccount: true,
            dedicatedAccount: true,
            manualAccount: true,
            pmUnit: {
              include: {
                property: { include: { manualAccount: true } },
                rentPayments: {
                  where: { status: 'SUCCESS' },
                  orderBy: { periodEnd: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        companyUsers: {
          include: {
            company: true
          }
        }
      }
    })
    return this.toDomain(record)
  }
}
