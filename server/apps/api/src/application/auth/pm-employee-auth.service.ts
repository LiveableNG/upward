import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../shared/infrastructure/common/encryption.service';
import { S3Service } from '../../shared/infrastructure/common/s3/s3.service';
import { UnifiedCommunicationService } from '../../shared/infrastructure/communication/unified-communication.service';
import { VerificationTokenRepository, VERIFICATION_TOKEN_REPOSITORY } from '../../domains/auth/verification-token.repository';
import { BaseAuthService } from './base-auth.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class PmEmployeeAuthService extends BaseAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly s3Service: S3Service,
    private readonly unifiedCommService: UnifiedCommunicationService,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepository: VerificationTokenRepository,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService);
  }

  async generateFullAuthResponse(employee: any): Promise<any> {
    const decryptedEmail = this.encryption.decrypt(employee.email);
    const payload = {
      sub: employee.uuid,
      email: decryptedEmail,
      role: 'PM_EMPLOYEE',
      ownerPmId: employee.ownerPmId,
      employeeId: employee.id,
    };

    const accessToken = this.generateAccessToken(payload);

    // Cleanup expired employee sessions
    await (this.prisma as any).upward_pm_employee_auth_session.deleteMany({
      where: {
        employeeId: employee.id,
        expiresAt: { lt: new Date() },
      },
    });

    // Create New Employee Session
    const sid = crypto.randomUUID();
    const refreshToken = this.generateRefreshToken({
      sub: employee.uuid,
      sid,
      role: 'PM_EMPLOYEE',
      ownerPmId: employee.ownerPmId,
      employeeId: employee.id,
    });

    await (this.prisma as any).upward_pm_employee_auth_session.create({
      data: {
        id: sid,
        employeeId: employee.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const clientProfile = await this.formatEmployeeProfile(employee);

    return {
      accessToken,
      refreshToken,
      user: clientProfile,
    };
  }

  private async formatEmployeeProfile(employee: any) {
    const ownerPm = await this.prisma.upward_property_manager.findUnique({
      where: { id: employee.ownerPmId },
      select: {
        id: true,
        uuid: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePic: true,
        bankCode: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        isBlocked: true,
      },
    });

    let profilePicUrl = employee.profilePic;
    if (profilePicUrl) {
      profilePicUrl = await this.s3Service.getDownloadUrl(profilePicUrl);
    }

    let companyLogoUrl = ownerPm?.profilePic;
    if (companyLogoUrl) {
      companyLogoUrl = await this.s3Service.getDownloadUrl(companyLogoUrl);
    }

    const assignedCount = await (this.prisma as any).upward_pm_employee_property.count({
      where: { employeeId: employee.id },
    });

    const decryptedEmail = this.encryption.decrypt(employee.email);
    const decryptedFirstName = this.encryption.decrypt(employee.firstName);
    const decryptedLastName = this.encryption.decrypt(employee.lastName);
    const decryptedPhone = employee.phone ? this.encryption.decrypt(employee.phone) : null;

    const ownerEmail = ownerPm ? this.encryption.decrypt(ownerPm.email) : '';
    const ownerFirstName = ownerPm ? this.encryption.decrypt(ownerPm.firstName) : '';
    const ownerLastName = ownerPm ? this.encryption.decrypt(ownerPm.lastName) : '';
    const ownerBusinessName = ownerPm?.businessName ? this.encryption.decrypt(ownerPm.businessName) : null;
    const ownerFullName = `${ownerFirstName} ${ownerLastName}`.trim();
    const companyName = ownerBusinessName || ownerFullName || 'Property Team';
    const hasBankDetails = Boolean(ownerPm?.bankCode && ownerPm?.accountNumber);

    return {
      id: employee.uuid,
      uuid: employee.uuid,
      email: decryptedEmail,
      firstName: decryptedFirstName,
      lastName: decryptedLastName,
      phone: decryptedPhone,
      jobTitle: employee.jobTitle || 'Property Officer',
      profilePic: profilePicUrl,
      accessLevel: employee.accessLevel,
      status: employee.status,
      accountType: 'PM_EMPLOYEE',
      isEmployee: true,
      termsAcceptedAt: employee.updatedAt || new Date(),
      canManageCompanySettings: false,
      isBlocked: ownerPm?.isBlocked ?? false,
      assignedPropertiesCount: assignedCount,
      hasBankDetails,
      bankCode: ownerPm?.bankCode || undefined,
      bankName: ownerPm?.bankName || undefined,
      accountNumber: ownerPm?.accountNumber || undefined,
      employer: ownerPm ? {
        uuid: ownerPm.uuid,
        companyName,
        ownerName: ownerFullName || companyName,
        email: ownerEmail,
        logo: companyLogoUrl,
        hasBankDetails,
      } : null,
    };
  }

  async checkEmail(email: string): Promise<{
    exists: boolean;
    isInvited?: boolean;
    hasPassword?: boolean;
    inviteToken?: string;
    employerName?: string;
    jobTitle?: string;
  }> {
    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
      include: {
        ownerPm: {
          select: {
            businessName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!employee || employee.status === 'REVOKED') {
      return { exists: false, isInvited: false, hasPassword: false };
    }

    const isInvited = employee.status === 'PENDING' || !employee.passwordHash;
    const hasPassword = !!employee.passwordHash && employee.status === 'ACTIVE';

    const owner = employee.ownerPm;
    const ownerBusinessName = owner?.businessName ? this.encryption.decrypt(owner.businessName) : null;
    const ownerFirstName = owner?.firstName ? this.encryption.decrypt(owner.firstName) : '';
    const ownerLastName = owner?.lastName ? this.encryption.decrypt(owner.lastName) : '';
    const employerName = ownerBusinessName || `${ownerFirstName} ${ownerLastName}`.trim() || 'Property Team';

    return {
      exists: true,
      isInvited,
      hasPassword,
      inviteToken: employee.uuid,
      employerName,
      jobTitle: employee.jobTitle || 'Property Officer',
    };
  }

  async login(email: string, password: string): Promise<any> {
    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (employee.status === 'PENDING' || !employee.passwordHash) {
      throw new UnauthorizedException('Your invitation has not been activated yet. Please check your invitation email.');
    }

    if (employee.status === 'SUSPENDED' || employee.status === 'REVOKED') {
      throw new UnauthorizedException('Your employee access has been deactivated by the property manager.');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateFullAuthResponse(employee);
  }

  async getInviteDetails(uuid: string) {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid },
      include: {
        ownerPm: {
          select: {
            businessName: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePic: true,
          },
        },
        assignedProperties: {
          include: {
            property: {
              select: {
                uuid: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Invitation not found or expired');
    }

    const owner = employee.ownerPm;
    const ownerEmail = owner ? this.encryption.decrypt(owner.email) : '';
    const ownerFirstName = owner ? this.encryption.decrypt(owner.firstName) : '';
    const ownerLastName = owner ? this.encryption.decrypt(owner.lastName) : '';
    const ownerBusinessName = owner?.businessName ? this.encryption.decrypt(owner.businessName) : null;
    const inviterName = ownerBusinessName || `${ownerFirstName} ${ownerLastName}`.trim() || 'Property Manager';
    const isActivated = employee.status === 'ACTIVE' || !!employee.passwordHash;

    return {
      uuid: employee.uuid,
      email: this.encryption.decrypt(employee.email),
      firstName: this.encryption.decrypt(employee.firstName),
      lastName: this.encryption.decrypt(employee.lastName),
      jobTitle: employee.jobTitle,
      accessLevel: employee.accessLevel,
      status: employee.status,
      isActivated,
      assignedProperties: employee.assignedProperties.map((ap: any) => ap.property),
      invitedBy: {
        name: inviterName,
        companyName: ownerBusinessName,
        email: ownerEmail,
        accessLevel: employee.accessLevel,
      },
    };
  }

  async acceptInvite(uuid: string, data: { password: string; firstName?: string; lastName?: string; phone?: string }) {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid },
    });

    if (!employee) {
      throw new NotFoundException('Invitation not found');
    }

    if (employee.status === 'REVOKED') {
      throw new BadRequestException('This invitation has been revoked');
    }

    if (employee.status === 'ACTIVE' && employee.passwordHash) {
      throw new BadRequestException('This invitation has already been accepted. Please sign in to your account.');
    }

    const currentFirstName = this.encryption.decrypt(employee.firstName);
    const currentLastName = this.encryption.decrypt(employee.lastName);
    const currentPhone = employee.phone ? this.encryption.decrypt(employee.phone) : undefined;

    const passwordHash = await bcrypt.hash(data.password, 10);
    const firstName = data.firstName || currentFirstName;
    const lastName = data.lastName || currentLastName;
    const phone = data.phone || currentPhone;

    const updatedEmployee = await (this.prisma as any).upward_pm_employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        firstName: this.encryption.encrypt(firstName),
        firstNameHash: this.encryption.hash(firstName),
        lastName: this.encryption.encrypt(lastName),
        lastNameHash: this.encryption.hash(lastName),
        phone: phone ? this.encryption.encrypt(phone) : null,
        phoneHash: phone ? this.encryption.hash(phone) : null,
        status: 'ACTIVE',
      },
    });

    return this.generateFullAuthResponse(updatedEmployee);
  }

  async getProfile(employeeUuid: string): Promise<any> {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid: employeeUuid },
    });

    if (!employee) {
      throw new UnauthorizedException('Employee profile not found');
    }

    return this.formatEmployeeProfile(employee);
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    const sid = decoded.sid;

    if (!sid) throw new UnauthorizedException('Invalid token structure');

    const session = await (this.prisma as any).upward_pm_employee_auth_session.findUnique({
      where: { id: sid },
    });

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const incomingHash = this.hashToken(refreshToken);
    if (session.refreshTokenHash !== incomingHash) {
      await (this.prisma as any).upward_pm_employee_auth_session.update({
        where: { id: sid },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Token reuse detected');
    }

    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid: decoded.sub },
    });

    if (!employee) throw new UnauthorizedException('Employee not found');

    const decryptedEmail = this.encryption.decrypt(employee.email);

    const newAccessToken = this.generateAccessToken({
      sub: employee.uuid,
      email: decryptedEmail,
      role: 'PM_EMPLOYEE',
      ownerPmId: employee.ownerPmId,
      employeeId: employee.id,
    });

    const newRefreshToken = this.generateRefreshToken({
      sub: employee.uuid,
      sid,
      role: 'PM_EMPLOYEE',
      ownerPmId: employee.ownerPmId,
      employeeId: employee.id,
    });

    await (this.prisma as any).upward_pm_employee_auth_session.update({
      where: { id: sid },
      data: {
        refreshTokenHash: this.hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const clientProfile = await this.formatEmployeeProfile(employee);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: clientProfile,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee) {
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await (this.prisma as any).upward_pm_employee.update({
      where: { id: employee.id },
      data: {
        resetPasswordOTP: otp,
        resetPasswordExpires: expires,
      },
    });

    const decryptedEmail = this.encryption.decrypt(employee.email);
    const decryptedFirstName = this.encryption.decrypt(employee.firstName);
    const decryptedLastName = this.encryption.decrypt(employee.lastName);
    const fullName = `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Team Member';

    await this.unifiedCommService.processCommunication({
      recipientEmail: decryptedEmail,
      recipientName: fullName,
      recipientRole: 'PM',
      type: 'PM_PASSWORD_RESET_OTP',
      context: {
        otp,
        title: 'Staff Password Reset Request',
        greeting: fullName,
        message: 'We received a request to reset your password for your Upward Staff account.',
        expiryText: 'This code expires in 15 minutes.',
      },
    });
  }

  async verifyResetOTP(email: string, otp: string): Promise<{ success: boolean }> {
    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee || !employee.resetPasswordOTP || !employee.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (employee.resetPasswordOTP !== otp || new Date() > employee.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    return { success: true };
  }

  async resetPassword(email: string, otp: string, newPlain: string): Promise<void> {
    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee || !employee.resetPasswordOTP || !employee.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (employee.resetPasswordOTP !== otp || new Date() > employee.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10);
    await (this.prisma as any).upward_pm_employee.update({
      where: { id: employee.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordOTP: null,
        resetPasswordExpires: null,
      },
    });
  }

  async requestOTP(email: string, context: 'LOGIN' | 'INVITE' = 'INVITE'): Promise<{ context: string }> {
    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee || employee.status === 'REVOKED') {
      throw new NotFoundException('No staff account found with this email address.');
    }

    if (employee.status === 'SUSPENDED') {
      throw new BadRequestException('Your employee account is suspended. Please contact your property manager.');
    }

    const effectiveContext = context;

    await (this.tokenRepository as any).deleteOldTokens(email, effectiveContext);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.tokenRepository.create({
      otp,
      context: effectiveContext,
      identifier: email,
      expiresAt,
    });

    const firstName = employee.firstName ? this.encryption.decrypt(employee.firstName) : '';
    const lastName = employee.lastName ? this.encryption.decrypt(employee.lastName) : '';
    const employeeName = `${firstName} ${lastName}`.trim() || 'Team Member';

    await this.unifiedCommService.processCommunication({
      recipientEmail: email,
      recipientName: employeeName,
      recipientRole: 'PM',
      type: 'PM_AUTH_OTP',
      context: {
        otp,
        context: effectiveContext,
        title: effectiveContext === 'INVITE' ? 'Accept Your Staff Invitation' : 'Secure Staff Portal Login',
        message: effectiveContext === 'INVITE'
          ? 'You have been invited to join Upward PM as a staff team member. Use the code below to verify your email and complete your account setup:'
          : 'Use the code below to securely access your Upward PM staff dashboard:',
      },
    });

    return { context: effectiveContext };
  }

  async verifyOTP(email: string, otp: string, context: string = 'INVITE'): Promise<{ success: boolean; message?: string; inviteToken?: string }> {
    const record = await this.tokenRepository.findByIdentifier(email, context);

    if (!record || !record.otp || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (record.otp !== otp) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.tokenRepository.delete(record.id!);

    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee) {
      throw new NotFoundException('Employee record not found');
    }

    return { success: true, inviteToken: employee.uuid };
  }

  async otpLogin(email: string, otp: string): Promise<any> {
    await this.verifyOTP(email, otp, 'LOGIN');

    const emailHash = this.encryption.hash(email);
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { emailHash },
    });

    if (!employee) {
      throw new UnauthorizedException('Employee account not found');
    }

    if (employee.status === 'PENDING' || !employee.passwordHash) {
      throw new UnauthorizedException('Your invitation has not been activated yet. Please complete your verification first.');
    }

    if (employee.status === 'SUSPENDED' || employee.status === 'REVOKED') {
      throw new UnauthorizedException('Your employee access has been deactivated by the property manager.');
    }

    return this.generateFullAuthResponse(employee);
  }

  async revokeSession(refreshToken: string): Promise<void> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      if (decoded.sid) {
        await (this.prisma as any).upward_pm_employee_auth_session.update({
          where: { id: decoded.sid },
          data: { isRevoked: true },
        });
      }
    } catch {
      // Ignore
    }
  }

  async updateProfile(employeeUuid: string, dto: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    profilePic?: string;
  }) {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid: employeeUuid },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const dataToUpdate: any = { updatedAt: new Date() };

    if (dto.firstName !== undefined) {
      const trimmed = (dto.firstName || '').trim();
      dataToUpdate.firstName = this.encryption.encrypt(trimmed);
      dataToUpdate.firstNameHash = this.encryption.hash(trimmed);
    }

    if (dto.lastName !== undefined) {
      const trimmed = (dto.lastName || '').trim();
      dataToUpdate.lastName = this.encryption.encrypt(trimmed);
      dataToUpdate.lastNameHash = this.encryption.hash(trimmed);
    }

    if (dto.phone !== undefined) {
      const trimmed = (dto.phone || '').trim();
      dataToUpdate.phone = trimmed ? this.encryption.encrypt(trimmed) : null;
      dataToUpdate.phoneHash = trimmed ? this.encryption.hash(trimmed) : null;
    }

    if (dto.profilePic !== undefined) {
      dataToUpdate.profilePic = dto.profilePic;
    }

    const updated = await (this.prisma as any).upward_pm_employee.update({
      where: { uuid: employeeUuid },
      data: dataToUpdate,
    });

    return this.formatEmployeeProfile(updated);
  }

  async changePassword(employeeUuid: string, dto: {
    currentPassword?: string;
    newPassword: string;
  }) {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid: employeeUuid },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.currentPassword) {
      if (!employee.passwordHash) {
        throw new BadRequestException('Account does not have a password configured');
      }
      const isValid = await bcrypt.compare(dto.currentPassword, employee.passwordHash);
      if (!isValid) throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await (this.prisma as any).upward_pm_employee.update({
      where: { uuid: employeeUuid },
      data: { passwordHash, updatedAt: new Date() },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async getAvatarUploadUrl(employeeUuid: string, contentType: string, filename: string) {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid: employeeUuid },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const ext = filename.split('.').pop() || 'jpg';
    const key = `pm/avatars/employee_${employee.id}_${Date.now()}.${ext}`;
    const uploadUrl = await this.s3Service.getUploadUrl(key, contentType);

    return { uploadUrl, fileKey: key };
  }

  async uploadAvatar(employeeUuid: string, base64Data: string, contentType: string) {
    const employee = await (this.prisma as any).upward_pm_employee.findUnique({
      where: { uuid: employeeUuid },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const key = `pm/avatars/employee_${employee.id}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    await this.s3Service.uploadBuffer(buffer, key, contentType);

    await (this.prisma as any).upward_pm_employee.update({
      where: { uuid: employeeUuid },
      data: { profilePic: key, updatedAt: new Date() },
    });

    const publicUrl = await this.s3Service.getDownloadUrl(key);
    return { publicUrl };
  }
}
