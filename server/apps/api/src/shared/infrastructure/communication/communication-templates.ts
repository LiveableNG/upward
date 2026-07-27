import {
  buildTenantInviteHtml,
  buildPaymentRequestHtml,
  buildCredibilityRequestHtml,
  buildNewUserRecordsHtml,
  buildLandlordWelcomeHtml,
  buildLandlordNewPropertyAssignmentHtml,
  buildRecordAddedHtml,
  buildDataDeletionRequestConfirmationHtml,
  buildTeamInvitationHtml,
  buildJoinRequestRejectionHtml,
  buildCredibilityRequestRejectionHtml,
  buildWaitlistConfirmationHtml,
  buildRentReceiptEmailHtml,
  buildPmPaymentReceivedHtml,
  buildSequenceWelcomeHtml,
  buildSequenceDay2Html,
  buildSequenceDay5Html,
  buildSequenceDay9Html,
  buildSequenceDay14Html,
  buildGlobalLayoutHtml,
} from '../email/email.helper';

export type RecipientRole = 'TENANT' | 'PM' | 'LANDLORD' | 'ADMIN';
export type ThemeType = 'CLAY' | 'FOREST';

export function resolveTheme(role?: RecipientRole | string): ThemeType {
  if (role === 'PM' || role === 'LANDLORD' || role === 'ADMIN') {
    return 'FOREST';
  }
  return 'CLAY';
}

export interface TemplateInterpolationContext {
  [key: string]: any;
}

export interface CommunicationTemplateDef {
  recipientRole: RecipientRole;
  subjectTemplate: string;
  plainTextTemplate: string;
  whatsappTemplateName?: string;
  whatsappParams?: string[];
  whatsappButtonParam?: string;
  buildHtml?: (context: TemplateInterpolationContext, theme: ThemeType) => string;
}

export const COMMUNICATION_TEMPLATES: Record<string, CommunicationTemplateDef> = {
  TENANT_INVITE: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Invitation to join Upward from {{pmName}}',
    plainTextTemplate:
      'Hi {{displayName}}, {{pmName}} has invited you to join Upward. Build your credit score, earn rewards for on-time payments, and verify your tenancy history effortlessly with Upward. Claim your account here: {{inviteLink}}',
    whatsappTemplateName: 'upward_tenant_invite_v3',
    whatsappParams: ['displayName', 'managerName', 'companyName'],
    whatsappButtonParam: 'invitePath',
    buildHtml: (ctx) =>
      buildTenantInviteHtml({
        tenantName: ctx.displayName || 'Tenant',
        pmName: ctx.pmName || 'Property Manager',
        inviteLink: ctx.inviteLink || '',
        pmType: ctx.pmRole || 'Property Manager',
      }),
  },

  PAYMENT_REQUEST: {
    recipientRole: 'TENANT',
    subjectTemplate: 'New Payment Request: {{currency}} {{amount}} from {{pmName}}',
    plainTextTemplate:
      'Hello {{displayName}}, you have a new payment request of {{currency}} {{amount}} from {{pmName}} due on {{dueDate}}. Pay securely here: {{paymentLink}}',
    whatsappTemplateName: 'upward_payment_request',
    whatsappParams: ['displayName', 'pmName', 'formattedAmount'],
    buildHtml: (ctx) =>
      buildPaymentRequestHtml({
        tenantName: ctx.displayName || 'Tenant',
        pmName: ctx.pmName || 'Property Manager',
        propertyName: ctx.propertyName || 'Property',
        unitName: ctx.unitName || 'Unit',
        amount: ctx.amount || 0,
        currency: ctx.currency || 'NGN',
        dueDate: ctx.dueDate || new Date().toLocaleDateString(),
        paymentLink: ctx.paymentLink || '',
        allowPartial: !!ctx.allowPartial,
        minAmount: ctx.minAmount || undefined,
      }),
  },

  CREDIBILITY_REQUEST: {
    recipientRole: 'PM',
    subjectTemplate: 'Past Tenancy Record Request for {{propertyAddress}}',
    plainTextTemplate:
      'Hello {{managerName}}, {{tenantName}} has requested that you verify their past tenancy and payment records for {{propertyAddress}} on Upward: {{requestLink}}',
    whatsappTemplateName: 'upward_credibility_request',
    whatsappParams: ['managerName', 'tenantName', 'propertyAddress'],
    buildHtml: (ctx) =>
      buildCredibilityRequestHtml({
        pmName: ctx.pmName || ctx.managerName || 'Property Manager',
        tenantName: ctx.tenantName || 'Tenant',
        propertyAddress: ctx.propertyAddress || 'Property',
        requestLink: ctx.requestLink || '',
        isRegisteredPm: ctx.isRegisteredPm,
      }),
  },

  NEW_USER_RECORDS: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Your past rent records have been added on Upward',
    plainTextTemplate:
      'Hello {{displayName}}, {{pmName}} has added your past rent payment records for {{propertyAddress}} to Upward. Complete your profile here: {{completeProfileLink}}',
    whatsappTemplateName: 'upward_new_user_records',
    whatsappParams: ['displayName', 'pmName', 'propertyAddress'],
    buildHtml: (ctx) =>
      buildNewUserRecordsHtml({
        tenantName: ctx.displayName || ctx.tenantName || 'Tenant',
        pmName: ctx.pmName || 'Property Manager',
        propertyAddress: ctx.propertyAddress || 'Property',
        loginLink: ctx.completeProfileLink || ctx.loginLink || '',
      }),
  },

  RECORD_ADDED: {
    recipientRole: 'TENANT',
    subjectTemplate: 'New rent records added by {{pmName}} for {{propertyAddress}}',
    plainTextTemplate:
      'Hello {{displayName}}, {{pmName}} has updated your rental payment history for {{propertyAddress}} on Upward. View your rent passport here: {{frontendUrl}}/dashboard',
    whatsappTemplateName: 'upward_record_added',
    whatsappParams: ['displayName', 'pmName', 'propertyAddress'],
    buildHtml: (ctx) =>
      buildRecordAddedHtml({
        tenantName: ctx.displayName || ctx.tenantName || 'Tenant',
        pmName: ctx.pmName || 'Property Manager',
        propertyAddress: ctx.propertyAddress || 'Property',
        loginLink: ctx.frontendUrl ? `${ctx.frontendUrl}/dashboard` : 'https://upward.goodtenants.io/dashboard',
      }),
  },

  LANDLORD_WELCOME: {
    recipientRole: 'LANDLORD',
    subjectTemplate: 'Welcome to Upward Landlord Portal',
    plainTextTemplate:
      'Welcome to Upward Landlord Portal, {{landlordName}}! Your property manager has invited you to view real-time portfolio reports. Temporary password: {{tempPassword}}. Log in: {{portalLink}}',
    whatsappTemplateName: 'upward_landlord_welcome',
    whatsappParams: ['landlordName', 'tempPassword'],
    buildHtml: (ctx) =>
      buildLandlordWelcomeHtml({
        landlordName: ctx.landlordName || 'Landlord',
        password: ctx.tempPassword || '',
        loginLink: ctx.portalLink || '',
      }),
  },

  LANDLORD_PROPERTY_ASSIGNMENT: {
    recipientRole: 'LANDLORD',
    subjectTemplate: 'New Property Added to Your Upward Portfolio',
    plainTextTemplate:
      'Hello {{landlordName}}, a property manager has added a new property to your portfolio on Upward. View portfolio: {{portalLink}}',
    whatsappTemplateName: 'upward_landlord_property_assignment',
    whatsappParams: ['landlordName'],
    buildHtml: (ctx) =>
      buildLandlordNewPropertyAssignmentHtml({
        landlordName: ctx.landlordName || 'Landlord',
        propertyName: ctx.propertyName || 'Property',
        dashboardLink: ctx.portalLink || '',
      }),
  },

  TEAM_INVITATION: {
    recipientRole: 'PM',
    subjectTemplate: 'Collaboration Invite from {{inviterName}}',
    plainTextTemplate:
      'Hello {{name}}, {{inviterName}} has invited you to collaborate on properties on Upward PM platform. Claim your access here: {{claimLink}}',
    whatsappTemplateName: 'upward_team_invitation',
    whatsappParams: ['name', 'inviterName'],
    buildHtml: (ctx) =>
      buildTeamInvitationHtml({
        employeeName: ctx.name || 'Team Member',
        pmName: ctx.inviterName || 'Manager',
        inviteLink: ctx.claimLink || '',
      }),
  },

  JOIN_REQUEST_REJECTION: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Update on your connection request for {{propertyAddress}}',
    plainTextTemplate:
      'Hello {{tenantName}}, your request to connect with {{pmName}} for {{propertyAddress}} was declined. Reason: {{reason}}',
    whatsappTemplateName: 'upward_join_request_rejection',
    whatsappParams: ['tenantName', 'pmName', 'propertyAddress', 'reason'],
    buildHtml: (ctx) =>
      buildJoinRequestRejectionHtml({
        tenantName: ctx.tenantName || 'Tenant',
        pmName: ctx.pmName || 'Manager',
        propertyAddress: ctx.propertyAddress || 'Property',
        reason: ctx.reason,
      }),
  },

  CREDIBILITY_REJECTION: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Update on your record request for {{propertyAddress}}',
    plainTextTemplate:
      'Hello {{tenantName}}, your request for past tenancy records for {{propertyAddress}} was declined by the manager. Reason: {{reason}}',
    whatsappTemplateName: 'upward_credibility_rejection',
    whatsappParams: ['tenantName', 'propertyAddress', 'reason'],
    buildHtml: (ctx) =>
      buildCredibilityRequestRejectionHtml({
        tenantName: ctx.tenantName || 'Tenant',
        propertyAddress: ctx.propertyAddress || 'Property',
        reason: ctx.reason,
      }),
  },

  WAITLIST_CONFIRMATION: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Welcome to the Upward Waitlist — You’re In',
    plainTextTemplate:
      'Hi {{firstName}}, you are officially on the waitlist for Upward by GoodTenants! We will notify you as soon as early access is ready.',
    whatsappTemplateName: 'upward_waitlist_confirmation',
    whatsappParams: ['firstName'],
    buildHtml: (ctx) =>
      buildWaitlistConfirmationHtml({
        displayName: ctx.displayName || ctx.firstName || 'there',
        firstName: ctx.firstName,
        email: ctx.email || '',
        frontendUrl: ctx.frontendUrl || 'https://upward.goodtenants.io',
      }),
  },

  DATA_DELETION_REQUEST: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Confirm your data deletion request',
    plainTextTemplate:
      'Hello {{email}}, we received a request to delete all data associated with your email from Upward. This process is irreversible.',
    whatsappTemplateName: 'upward_data_deletion_request',
    whatsappParams: ['email'],
    buildHtml: (ctx) => buildDataDeletionRequestConfirmationHtml({
      userName: ctx.displayName || ctx.userName || 'User',
      deletionLink: ctx.deletionLink || '',
    }),
  },

  RENT_RECEIPT: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Rent Payment Receipt — {{amount}}',
    plainTextTemplate:
      'Hi {{tenantName}}, your rent payment of {{amount}} for {{propertyAddress}} was successful. Receipt No: {{receiptNumber}}. View online: {{receiptUrl}}',
    whatsappTemplateName: 'upward_rent_receipt',
    whatsappParams: ['tenantName', 'amount', 'propertyAddress', 'receiptNumber'],
    buildHtml: (ctx) =>
      buildRentReceiptEmailHtml({
        tenantName: ctx.tenantName || 'Tenant',
        amountPaid: Number(ctx.amountPaid || ctx.amount || 0),
        balance: Number(ctx.balance || 0),
        propertyAddress: ctx.propertyAddress || 'Property',
        unitName: ctx.unitName || 'Unit',
        receiptNumber: ctx.receiptNumber || '',
        paymentDate: ctx.paymentDate || new Date().toLocaleDateString(),
        receiptUrl: ctx.receiptUrl || '',
      }),
  },

  PM_PAYMENT_RECEIVED: {
    recipientRole: 'PM',
    subjectTemplate: 'Payment Received: Unit {{unitName}} - {{propertyName}}',
    plainTextTemplate:
      'Dear {{pmName}}, your tenant {{tenantName}} has successfully completed a rent payment of NGN {{formattedAmount}} for Unit {{unitName}} at {{propertyName}}.',
    buildHtml: (ctx) =>
      buildPmPaymentReceivedHtml({
        pmName: ctx.pmName || 'Property Manager',
        tenantName: ctx.tenantName || 'Tenant',
        unitName: ctx.unitName || '',
        propertyName: ctx.propertyName || '',
        amount: ctx.amount || 0,
        baseUrl: ctx.baseUrl || 'https://upward.goodtenants.io',
      }),
  },

  AUTH_OTP: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Your Upward Verification Code: {{otp}}',
    plainTextTemplate: 'Your Upward verification code is {{otp}}. It expires in 10 minutes.',
    whatsappTemplateName: 'upward_auth_otp_v3',
    whatsappParams: ['displayName', 'otp'],
    whatsappButtonParam: 'otp',
    buildHtml: (ctx) => {
      const contexts: Record<string, { title: string; message: string; subject?: string }> = {
        SIGNUP: {
          title: 'Verify your email',
          message: 'Welcome to Upward! Use the code below to verify your email address and complete your signup.',
        },
        LOGIN: {
          title: 'Login Verification',
          message: 'You requested to log in via verification code. Use the code below to proceed.',
        },
        INVITE: {
          title: 'Accept Your Invite',
          message: 'You have been invited to join Upward. Use the code below to verify your identity and accept the invite.',
        },
        PAYMENT: {
          title: 'Verify Payment Access',
          message: 'Use the code below to verify your access to this payment. This ensures your transaction is secure.',
        },
        WAITLIST: {
          title: 'Claim Your Waitlist Spot',
          message: 'Use the code below to verify your email and claim your spot on the Upward waitlist.',
        },
      };

      const fallback = {
        title: ctx.title || 'Verify your email',
        message: ctx.message || 'Use the code below to proceed.',
      };

      const selected = (ctx.context && contexts[ctx.context]) ? contexts[ctx.context] : fallback;

      return buildGlobalLayoutHtml({
        role: 'TENANT',
        title: selected?.title || fallback.title,
        contentHtml: `
          <p>Hi ${ctx.displayName || ctx.firstName || 'there'},</p>
          <p>${selected?.message || fallback.message}</p>
          <div style="text-align: center; margin: 32px 0;">
            <span style="font-size: 32px; font-weight: 800; color: #d97757; letter-spacing: 4px; background: #faf5f2; border: 1px dashed #d97757; padding: 12px 24px; border-radius: 8px; display: inline-block;">${ctx.otp || ''}</span>
          </div>
          <p>${ctx.expiryText || 'This code expires in 10 minutes. Please do not share it with anyone.'}</p>
        `,
      });
    },
  },

  PM_AUTH_OTP: {
    recipientRole: 'PM',
    subjectTemplate: 'Your Upward PM Code: {{otp}}',
    plainTextTemplate: 'Your Upward PM verification code is {{otp}}. It expires in 10 minutes.',
    whatsappTemplateName: 'upward_pm_auth_otp',
    whatsappParams: ['otp'],
    buildHtml: (ctx) =>
      buildGlobalLayoutHtml({
        role: 'PM',
        title: ctx.title || 'Secure Portal Access',
        contentHtml: `
          <p>Hello,</p>
          <p>${ctx.message || 'Use the code below to securely access your Upward PM dashboard:'}</p>
          <div style="text-align: center; margin: 32px 0;">
            <span style="font-size: 32px; font-weight: 800; color: #166534; letter-spacing: 4px; background: #faf9f5; border: 1px dashed #166534; padding: 12px 24px; border-radius: 8px; display: inline-block;">${ctx.otp || ''}</span>
          </div>
          <p>${ctx.expiryText || 'This code expires in 10 minutes. If you did not request this, please ignore this message.'}</p>
        `,
      }),
  },

  PM_PASSWORD_RESET_OTP: {
    recipientRole: 'PM',
    subjectTemplate: 'Reset Your Upward Password: {{otp}}',
    plainTextTemplate: 'Your Upward password reset code is {{otp}}. It expires in 15 minutes.',
    buildHtml: (ctx) =>
      buildGlobalLayoutHtml({
        role: 'PM',
        title: ctx.title || 'PM Password Reset Request',
        contentHtml: `
          <p>Hello ${ctx.displayName || ctx.greeting || 'there'},</p>
          <p>${ctx.message || 'We received a request to reset your password. Use the verification code below to proceed:'}</p>
          <div style="text-align: center; margin: 32px 0;">
            <span style="font-size: 32px; font-weight: 800; color: #166534; letter-spacing: 4px; background: #faf9f5; border: 1px dashed #166534; padding: 12px 24px; border-radius: 8px; display: inline-block;">${ctx.otp || ''}</span>
          </div>
          <p>${ctx.expiryText || 'This code expires in 15 minutes. If you did not request this, please ignore this message.'}</p>
        `,
      }),
  },

  TENANT_PROPERTY_VERIFIED: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Your property has been verified! 🎉',
    plainTextTemplate: 'Hello {{tenantName}}, your property at {{propertyName}} has been verified by {{pmName}}. You can now manage your rent payments on Upward.',
    whatsappTemplateName: 'tenant_property_verified_v1',
    whatsappParams: ['tenantName', 'propertyName', 'pmName'],
    buildHtml: (ctx) => buildGlobalLayoutHtml({
      role: 'TENANT',
      title: 'Property Verified',
      contentHtml: `
        <p>Hello ${ctx.tenantName},</p>
        <p>Great news! Your property at <strong>${ctx.propertyName}</strong> has been successfully verified by your property manager, <strong>${ctx.pmName}</strong>.</p>
        <p>You can now log in to your Upward account to view your tenancy details, track your rent payments, and build your rental credibility score.</p>
      `,
      buttonText: 'View Property Dashboard',
      buttonUrl: ctx.portalUrl || 'https://upward.goodtenants.io/login',
    }),
  },

  PM_CONNECTION_REQUEST: {
    recipientRole: 'PM',
    subjectTemplate: 'New Connection Request: {{tenantName}}',
    plainTextTemplate: 'Hello {{pmName}}, {{tenantName}} wants to connect and sync their unit ({{unitAddress}}) with you. Log in to your dashboard to review this request.',
    buildHtml: (ctx) => buildGlobalLayoutHtml({
      role: 'PM',
      title: 'New Connection Request',
      contentHtml: `
        <p>Hello ${ctx.pmName},</p>
        <p><strong>${ctx.tenantName}</strong> wants to connect and sync a unit with you on Upward.</p>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Unit Address:</strong> ${ctx.unitAddress}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Rent Amount:</strong> NGN ${ctx.rentAmount.toLocaleString()}</p>
        </div>
        <p>Please log in to your property manager portal to approve or decline this request.</p>
      `,
      buttonText: 'Review Connection Request',
      buttonUrl: ctx.portalUrl || 'https://upward-pm.vercel.app/dashboard',
    }),
  },

  PM_INVITE: {
    recipientRole: 'PM',
    subjectTemplate: '{{userName}} wants to connect on Upward',
    plainTextTemplate:
      'Hi {{pmName}}, {{userName}} has requested to connect with you on Upward as their {{roleName}}! Claim your profile here: {{inviteLink}}',
    whatsappTemplateName: 'upward_pm_invite',
    whatsappParams: ['pmName', 'userName', 'roleName'],
    buildHtml: (ctx) => `
      <div style="font-family: sans-serif; padding: 32px; background: #faf9f5; color: #166534;">
        <h2>Connection Request from ${ctx.userName}</h2>
        <p>Hi ${ctx.pmName}, ${ctx.userName} requested to connect with you as their ${ctx.roleName}.</p>
        <a href="${ctx.inviteLink}" style="background: #166534; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Claim Your Profile</a>
      </div>
    `,
  },
  
  SUPPORT_TICKET: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Update on your Support Ticket',
    plainTextTemplate: 'Hello {{displayName}}, your support ticket regarding "{{message}}..." has been resolved with the following response: {{responseMessage}}',
    whatsappTemplateName: 'upward_support_ticket_resolved',
    whatsappParams: ['displayName'],
    buildHtml: (ctx) => buildGlobalLayoutHtml({
      role: 'TENANT',
      title: 'Support Ticket Update',
      contentHtml: `
        <p>Hello ${ctx.displayName},</p>
        <p>Your support ticket regarding <strong>"${ctx.message}..."</strong> has been resolved with the following message from our team:</p>
        
        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin: 24px 0;">
          <p style="font-size: 15px; color: #111827; margin: 0; line-height: 1.6;">${ctx.responseMessage}</p>
        </div>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">
          If you have any more issues, please don't hesitate to reach to the support hub again.
        </p>
      `
    }),
  },

  SIGNUP_CONFIRMATION: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Welcome to the Upward Waitlist — You’re In',
    plainTextTemplate: 'Hi {{firstName}}, you are officially on the waitlist for Upward by GoodTenants! We will notify you as soon as early access is ready.',
    whatsappTemplateName: 'upward_waitlist_confirmation',
    whatsappParams: ['firstName'],
    buildHtml: (ctx) => buildWaitlistConfirmationHtml({
      displayName: ctx.displayName || ctx.firstName || 'there',
      firstName: ctx.firstName,
      email: ctx.email || '',
      frontendUrl: ctx.frontendUrl || 'https://upward.goodtenants.io',
    }),
  },

  ONBOARDING_SEQUENCE_WELCOME: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Welcome to Upward, {{displayName}}!',
    plainTextTemplate: 'Welcome to Upward! Your account has been successfully created. Log in now to complete your profile.',
    whatsappTemplateName: 'upward_seq_welcome_v2',
    whatsappParams: ['displayName', 'companyName'],
    buildHtml: (ctx) => buildSequenceWelcomeHtml({
      firstName: ctx.displayName || 'there',
      loginLink: ctx.loginLink || 'https://upward.goodtenants.io/login',
    }),
  },

  ONBOARDING_SEQUENCE_DAY_2: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Your Upward Score breakdown',
    plainTextTemplate: 'Hi {{displayName}}, see how your Upward Score is developing and how it can help you build your rental reputation.',
    whatsappTemplateName: 'upward_seq_day2_v2',
    whatsappParams: ['displayName'],
    buildHtml: (ctx) => buildSequenceDay2Html({
      firstName: ctx.displayName || 'there',
      scoreLink: ctx.scoreLink || 'https://upward.goodtenants.io/dashboard',
    }),
  },

  ONBOARDING_SEQUENCE_DAY_5: {
    recipientRole: 'TENANT',
    subjectTemplate: '5 Ways to Build a Stronger Rental Reputation',
    plainTextTemplate: 'Hi {{displayName}}, two tenants can pay the exact same rent for years, but one does it with credit. Learn why in our short guide.',
    whatsappTemplateName: 'upward_seq_day5_v2',
    whatsappParams: ['displayName'],
    buildHtml: (ctx) => buildSequenceDay5Html({
      firstName: ctx.displayName || 'there',
      guideLink: ctx.guideLink || 'https://upward.goodtenants.io/dashboard',
    }),
  },

  ONBOARDING_SEQUENCE_DAY_9: {
    recipientRole: 'TENANT',
    subjectTemplate: 'How paying rent through Upward builds your future',
    plainTextTemplate: 'Hi {{displayName}}, read how a resident in Yaba renews rent through Upward and watches their score increase.',
    whatsappTemplateName: 'upward_seq_day9_v2',
    whatsappParams: ['displayName'],
    buildHtml: (ctx) => buildSequenceDay9Html({
      firstName: ctx.displayName || 'there',
      appLink: ctx.appLink || 'https://upward.goodtenants.io/dashboard',
    }),
  },

  ONBOARDING_SEQUENCE_DAY_14: {
    recipientRole: 'TENANT',
    subjectTemplate: 'Keep building your rental reputation with Upward',
    plainTextTemplate: 'Hi {{displayName}}, your Upward account is ready. Build your profile, view receipts, and request past records.',
    whatsappTemplateName: 'upward_seq_day14_v2',
    whatsappParams: ['displayName'],
    buildHtml: (ctx) => buildSequenceDay14Html({
      firstName: ctx.displayName || 'there',
      appLink: ctx.appLink || 'https://upward.goodtenants.io/dashboard',
    }),
  },

  ASSISTED_UPLOAD_REVIEW: {
    recipientRole: 'PM',
    subjectTemplate: 'Your Assisted Upload is Ready for Review',
    plainTextTemplate: 'The data from your file {{fileName}} has been transcribed and staged. Please log in to your dashboard to review, edit, and approve the import.',
  },

  LANDLORD_REPORT: {
    recipientRole: 'LANDLORD',
    subjectTemplate: 'Property Performance Report',
    plainTextTemplate: 'Please view the performance report in your landlord dashboard.',
  },
};
