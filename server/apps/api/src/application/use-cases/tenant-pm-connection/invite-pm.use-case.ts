import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import * as crypto from 'crypto';

@Injectable()
export class InvitePmUseCase {
  private readonly logger = new Logger(InvitePmUseCase.name);

  constructor(
    private readonly emailService: EmailService,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(
    user: any, 
    pmEmail: string, 
    pmName: string, 
    isFirstInvite: boolean = true, 
    pmUuid?: string,
    pmType?: string,
    companyName?: string
  ) {
    this.logger.log(`Sending PM invite to ${pmEmail} requested by ${user.email}`);

    let targetPmUuid = pmUuid;

    if (!targetPmUuid) {
      let pm = await this.pmRepository.findByEmail(pmEmail);
      if (!pm) {
        const newPmData = {
          uuid: crypto.randomUUID(),
          email: pmEmail,
          firstName: pmName.split(' ')[0] || 'Property',
          lastName: pmName.split(' ').slice(1).join(' ') || 'Manager',
          passwordHash: 'PENDING_INVITE',
          pmType: pmType || 'Property Manager',
          businessName: companyName || null,
        };
        pm = await this.pmRepository.save(newPmData as any);
      }
      targetPmUuid = pm.uuid;
    }

    const isLandlord = pmType === 'Landlord';
    const baseUrl = 'https://upward-pm.vercel.app';
    const inviteLink = `${baseUrl}/invite/${targetPmUuid}`;
    
    const roleName = isLandlord ? 'Landlord' : (pmType || 'Property Manager');

    const firstInviteMessage = `
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #1B4332;">
            <strong>${user.firstName} ${user.lastName}</strong> has just joined Upward to manage their rent payments and requested to connect with you as their ${roleName}!
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #1B4332;">
            Upward is a premium platform designed to automate rent collection, streamline tenant communication, and provide you with powerful financial insights.
          </p>
    `;

    const subsequentInviteMessage = `
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #1B4332;">
            Another tenant, <strong>${user.firstName} ${user.lastName}</strong>, has requested to connect with you on Upward as their ${roleName}!
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #1B4332;">
            You currently have pending connection requests waiting. Claim your profile to approve these requests and start managing your properties seamlessly.
          </p>
    `;

    const buttonText = isFirstInvite ? "Join Upward" : "Claim Your Profile";

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFFF0; color: #1B4332; border: 1px solid #E5E5D8; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #1B4332; padding: 32px 24px; text-align: center;">
          <h1 style="color: #FFFFF0; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Upward ${isLandlord ? 'Landlord' : ''}</h1>
        </div>
        <div style="padding: 40px 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #1B4332;">Hi ${pmName},</p>
          ${isFirstInvite ? firstInviteMessage : subsequentInviteMessage}
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="${inviteLink}" style="background-color: #1B4332; color: #FFFFF0; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              ${buttonText}
            </a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #4A6052; margin-bottom: 0;">
            If you have any questions, reply to this email to speak with our onboarding team.
          </p>
        </div>
        <div style="background-color: #F0F4F1; padding: 24px; text-align: center; border-top: 1px solid #E5E5D8;">
          <p style="font-size: 12px; color: #7B8F82; margin: 0;">
            &copy; ${new Date().getFullYear()} Upward. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await this.emailService.sendEmailWithRetry({
      userId: user.uuid,
      email: pmEmail,
      subject: `${user.firstName} ${user.lastName} wants to connect on Upward`,
      html: html,
      type: 'PM_INVITE',
    });

    return { success: true, message: 'Invitation sent to Property Manager.' };
  }
}
