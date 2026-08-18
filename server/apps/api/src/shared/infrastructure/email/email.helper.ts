import { formatName } from '@upward/common-utils';

export interface ThemeColors {
  primaryColor: string;
  bgColor: string;
  borderStyle: string;
  shadowStyle: string;
  outerBorder: string;
}

export function getThemeColors(theme: 'CLAY' | 'FOREST' | 'LANDLORD' | 'PM'): ThemeColors {
  switch (theme) {
    case 'CLAY':
      return {
        primaryColor: '#d97757',
        bgColor: '#f9fafb',
        borderStyle: '1px solid #e5e7eb',
        shadowStyle: '',
        outerBorder: '',
      };
    case 'FOREST':
    case 'PM':
      return {
        primaryColor: '#166534',
        bgColor: '#faf9f5',
        borderStyle: '1px solid rgba(22, 101, 52, 0.1)',
        shadowStyle: 'box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04);',
        outerBorder: 'border: 1px solid rgba(0,0,0,0.06);',
      };
    case 'LANDLORD':
      return {
        primaryColor: '#0d4d2b',
        bgColor: '#fdfcfb',
        borderStyle: '1px solid #e8e6e1',
        shadowStyle: 'box-shadow: 0 10px 25px rgba(13, 77, 43, 0.05);',
        outerBorder: '',
      };
  }
}

export interface TenantLayoutProps {
  logoText?: string;
  logoSub?: string;
  title?: string;
  contentHtml: string;
  footerText?: string;
}

export function buildTenantLayoutHtml(params: TenantLayoutProps): string {
  const logoText = params.logoText || 'Upward';
  const logoSub = params.logoSub || 'by GoodTenants';
  const footerText = params.footerText || 'The Upward Team<br>© 2026 Upward by GoodTenants. All rights reserved.';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || logoText}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          
          <!-- Decorative Color Bar -->
          <tr>
            <td height="6" style="background-color: #d97757;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #fafafa;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">${logoText}</span>
                    <span style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">${logoSub}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px 40px 32px;">
              ${params.title ? `<h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.3px;">${params.title}</h2>` : ''}
              <div style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                ${params.contentHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; background-color: #fafafa; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                ${footerText}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface LayoutProps {
  theme?: 'FOREST' | 'LANDLORD';
  logoText?: string;
  logoSub?: string;
  title: string;
  contentHtml: string;
  footerText?: string;
  branding?: any;
}

export function buildFullLayoutHtml(params: LayoutProps): string {
  const theme = params.theme || 'FOREST';
  const logoText = params.logoText || 'Upward';
  const logoSub = params.logoSub || (theme === 'LANDLORD' ? 'Landlord Portal' : 'Property Management');
  const footerText = params.footerText || `© 2026 Upward. All rights reserved.`;

  const config = getThemeColors(theme);
  const bodyBg = theme === 'LANDLORD' ? '#fdfcfb' : '#FFFFF0';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || logoText}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${config.bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${config.bgColor}; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${bodyBg}; ${config.borderStyle}; border-radius: 12px; overflow: hidden; ${config.shadowStyle}">
          
          <!-- Banner / Header -->
          <tr>
            <td style="background-color: ${config.primaryColor}; padding: 32px 24px; text-align: center;">
              <h1 style="color: #FFFFF0; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${logoText}</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">${logoSub}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 32px; background-color: ${bodyBg};">
              ${params.title ? `<h2 style="font-size: 20px; color: ${config.primaryColor}; margin-top: 0; margin-bottom: 24px; font-weight: 700;">${params.title}</h2>` : ''}
              <div style="font-size: 15px; line-height: 1.6; color: #2f3e35;">
                ${params.contentHtml}
              </div>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.02); border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #7B8F82; line-height: 1.5;">
                ${footerText}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildGlobalLayoutHtml(params: {
  role: 'TENANT' | 'PM' | 'LANDLORD' | 'ADMIN' | string;
  title?: string;
  contentHtml: string;
  footerText?: string;
  logoText?: string;
  logoSub?: string;
  buttonText?: string;
  buttonUrl?: string;
  branding?: any;
}): string {
  const role = params.role;
  const logoText = params.logoText || 'Upward';
  const logoSub = params.logoSub || (role === 'PM' ? 'Property Management' : role === 'LANDLORD' ? 'Landlord Portal' : 'by GoodTenants');
  const footerText = params.footerText || `© 2026 Upward by GoodTenants. All rights reserved.`;

  let bodyHtml = params.contentHtml;
  if (params.buttonText && params.buttonUrl) {
    const primaryColor = role === 'TENANT' ? '#d97757' : role === 'LANDLORD' ? '#0d4d2b' : '#166534';
    bodyHtml += `
      <div style="margin: 32px 0 24px 0; text-align: center;">
        <a href="${params.buttonUrl}" style="background-color: ${primaryColor}; color: #ffffff !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block; text-align: center;">${params.buttonText}</a>
      </div>
    `;
  }

  if (role === 'TENANT') {
    return buildTenantLayoutHtml({
      logoText,
      logoSub,
      title: params.title,
      contentHtml: bodyHtml,
      footerText,
    });
  } else {
    return buildFullLayoutHtml({
      theme: role === 'LANDLORD' ? 'LANDLORD' : 'FOREST',
      logoText,
      logoSub,
      title: params.title || '',
      contentHtml: bodyHtml,
      footerText,
      branding: params.branding,
    });
  }
}

export function applyPmBranding(html: string, emailSetting: any): string {
  if (!emailSetting) return html;

  let brandedHtml = html;

  if (emailSetting.logoUrl) {
    const logoTag = `<div style="text-align: center; margin-bottom: 24px;"><img src="${emailSetting.logoUrl}" alt="${emailSetting.senderName || 'Logo'}" style="max-height: 60px; object-fit: contain;" /></div>`;
    if (brandedHtml.includes('<body')) {
      brandedHtml = brandedHtml.replace(/(<body[^>]*>)/i, `$1\n${logoTag}`);
    } else {
      brandedHtml = `${logoTag}\n${brandedHtml}`;
    }
  }

  let footerContent = '';
  if (emailSetting.closingStatement) {
    footerContent += `<p style="margin-top: 24px; font-size: 14px; color: #4b5563;">${emailSetting.closingStatement.replace(/\n/g, '<br />')}</p>`;
  }
  if (emailSetting.footerAddress) {
    footerContent += `<div style="margin-top: 24px; font-size: 12px; color: #8a8a8a; border-top: 1px solid #eaeaea; padding-top: 12px;">${emailSetting.footerAddress.replace(/\n/g, '<br />')}</div>`;
  }

  if (footerContent) {
    if (brandedHtml.includes('<!-- Footer Area -->')) {
       brandedHtml = brandedHtml.replace('<!-- Footer Area -->', `<tr><td style="padding: 0 32px; background-color: #fdfcfb;">${footerContent}</td></tr>\n<!-- Footer Area -->`);
    } else if (brandedHtml.includes('<!-- Footer -->')) {
       brandedHtml = brandedHtml.replace('<!-- Footer -->', `<tr><td style="padding: 0 32px;">${footerContent}</td></tr>\n<!-- Footer -->`);
    } else if (brandedHtml.includes('</body>')) {
      brandedHtml = brandedHtml.replace('</body>', `${footerContent}\n</body>`);
    } else {
      brandedHtml += `\n${footerContent}`;
    }
  }

  return brandedHtml;
}

export function buildTenantInviteHtml(params: {
  tenantName: string;
  pmName: string;
  pmType: string;
  inviteLink: string;
  pmUuid?: string;
}): string {
  const content = `
    <p>Hi ${params.tenantName},</p>
    <p><strong>${params.pmName}</strong> (${params.pmType || 'Property Manager'}) has invited you to connect on Upward.</p>
    <p>Upward allows you to track and verify your rent payments, build a verified rental profile, and keep your credit record whenever you move.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Invitation to Join Upward',
    contentHtml: content,
    buttonText: 'Accept Invitation',
    buttonUrl: params.inviteLink,
  });
}

export function buildPaymentRequestHtml(params: {
  tenantName: string;
  pmName: string;
  propertyName: string;
  unitName: string;
  amount: number;
  dueDate: string;
  paymentLink: string;
  allowPartial: boolean;
  minAmount?: number;
  currency?: string;
}): string {
  const formattedAmount = `${params.currency || 'NGN'} ${params.amount.toLocaleString()}`;
  const content = `
    <p>Hi ${params.tenantName},</p>
    <p>You have a new rent payment request from <strong>${params.pmName}</strong> for <strong>Unit ${params.unitName}</strong> at <strong>${params.propertyName}</strong>.</p>
    
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin: 24px 0;">
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #4b5563;">
        <tr>
          <td><strong>Amount:</strong></td>
          <td align="right" style="font-size: 18px; color: #111827; font-weight: 700;">${formattedAmount}</td>
        </tr>
        <tr>
          <td><strong>Due Date:</strong></td>
          <td align="right">${params.dueDate}</td>
        </tr>
        ${params.allowPartial && params.minAmount ? `
        <tr>
          <td><strong>Minimum Partial:</strong></td>
          <td align="right">${params.currency || 'NGN'} ${params.minAmount.toLocaleString()}</td>
        </tr>` : ''}
      </table>
    </div>
  `;

  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'New Payment Request',
    contentHtml: content,
    buttonText: 'Pay Rent Now',
    buttonUrl: params.paymentLink,
  });
}

export function buildCredibilityRequestHtml(params: {
  pmName: string;
  tenantName: string;
  propertyAddress: string;
  requestLink: string;
  isRegisteredPm?: boolean;
}): string {
  const content = `
    <p>Hi ${params.pmName},</p>
    <p>Your former tenant, <strong>${params.tenantName}</strong>, has requested verification of their past tenancy records at <strong>${params.propertyAddress}</strong>.</p>
    <p>Verifying their request helps them build their Rent Passport score and rental reputation on Upward.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'PM',
    title: 'Tenancy Verification Request',
    contentHtml: content,
    buttonText: 'Verify Tenancy',
    buttonUrl: params.requestLink,
  });
}

export function buildNewUserRecordsHtml(params: {
  tenantName: string;
  pmName: string;
  propertyAddress: string;
  loginLink: string;
}): string {
  const content = `
    <p>Hi ${params.tenantName},</p>
    <p><strong>${params.pmName}</strong> has uploaded your tenancy history for <strong>${params.propertyAddress}</strong> to Upward.</p>
    <p>Claim your profile to see how this verified record strengthens your Rent Passport score.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Rental Record Added',
    contentHtml: content,
    buttonText: 'View Rental Record',
    buttonUrl: params.loginLink,
  });
}

export function buildLandlordWelcomeHtml(params: {
  landlordName: string;
  loginLink: string;
  password?: string;
}): string {
  const content = `
    <p>Hi ${params.landlordName},</p>
    <p>You have been invited to the Upward Landlord Portal.</p>
    ${params.password ? `<p>Your temporary password is: <strong>${params.password}</strong></p>` : ''}
    <p>Log in to set up your password and start viewing real-time rental analytics for your properties.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'LANDLORD',
    title: 'Welcome to the Landlord Portal',
    contentHtml: content,
    buttonText: 'Log In to Portal',
    buttonUrl: params.loginLink,
  });
}

export function buildLandlordNewPropertyAssignmentHtml(params: {
  landlordName: string;
  propertyName: string;
  dashboardLink: string;
}): string {
  const content = `
    <p>Hi ${params.landlordName},</p>
    <p>A new property, <strong>${params.propertyName}</strong>, has been assigned to your portfolio on Upward.</p>
    <p>You can now monitor payouts, occupancy rates, and real-time rent collection reports for this property.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'LANDLORD',
    title: 'New Property Assigned',
    contentHtml: content,
    buttonText: 'View Property Portfolio',
    buttonUrl: params.dashboardLink,
  });
}

export function buildRecordAddedHtml(params: {
  tenantName: string;
  pmName: string;
  propertyAddress: string;
  loginLink: string;
}): string {
  return buildNewUserRecordsHtml(params);
}

export function buildDataDeletionRequestConfirmationHtml(params: {
  userName: string;
  deletionLink: string;
}): string {
  const content = `
    <p>Hello ${params.userName},</p>
    <p>We received a request to permanently delete your Upward account and all associated data.</p>
    <p style="color: #ef4444; font-weight: 600;">Warning: This process is completely irreversible. Your Rent Passport, payment receipts, and profile history will be permanently lost.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Confirm Data Deletion Request',
    contentHtml: content,
    buttonText: 'Confirm Irreversible Deletion',
    buttonUrl: params.deletionLink,
  });
}

export function buildTeamInvitationHtml(params: {
  employeeName: string;
  pmName: string;
  inviteLink: string;
}): string {
  const content = `
    <p>Hi ${params.employeeName},</p>
    <p><strong>${params.pmName}</strong> has invited you to join their property management team on Upward PM.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'PM',
    title: 'Collaborator Invitation',
    contentHtml: content,
    buttonText: 'Accept Invitation',
    buttonUrl: params.inviteLink,
  });
}

export function buildJoinRequestRejectionHtml(params: {
  tenantName: string;
  pmName: string;
  propertyAddress: string;
  reason?: string;
}): string {
  const content = `
    <p>Hello ${params.tenantName},</p>
    <p>Your request to connect with <strong>${params.pmName}</strong> for the property at <strong>${params.propertyAddress}</strong> has been declined.</p>
    ${params.reason ? `<div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 16px; border-radius: 8px; color: #991b1b; margin: 16px 0;"><strong>Reason:</strong> ${params.reason}</div>` : ''}
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Connection Request Declined',
    contentHtml: content,
  });
}

export function buildCredibilityRequestRejectionHtml(params: {
  tenantName: string;
  propertyAddress: string;
  reason?: string;
}): string {
  const content = `
    <p>Hello ${params.tenantName},</p>
    <p>Your request for past tenancy records for <strong>${params.propertyAddress}</strong> has been declined by the property manager.</p>
    ${params.reason ? `<div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 16px; border-radius: 8px; color: #991b1b; margin: 16px 0;"><strong>Reason:</strong> ${params.reason}</div>` : ''}
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Record Request Declined',
    contentHtml: content,
  });
}

export function buildWaitlistConfirmationHtml(params: {
  displayName: string;
  firstName?: string;
  email: string;
  frontendUrl?: string;
}): string {
  const name = params.firstName || params.displayName || 'there';
  const content = `
    <p>Hi ${name},</p>
    <p>You're officially on the waitlist for Upward by GoodTenants!</p>
    <p>We are building Upward to make renting simpler, more transparent, and more rewarding. We will notify you as soon as early access becomes available.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'You’re on the Waitlist!',
    contentHtml: content,
  });
}

export function buildRentReceiptEmailHtml(params: {
  tenantName: string;
  propertyAddress: string;
  unitName: string;
  amountPaid: number;
  balance: number;
  receiptNumber: string;
  paymentDate: string;
  receiptUrl: string;
  tenancyPeriod?: string;
}): string {
  const tenancyPeriodRow = params.tenancyPeriod
    ? `<tr>
        <td><strong>Tenancy Period:</strong></td>
        <td align="right">${params.tenancyPeriod}</td>
      </tr>`
    : '';

  const content = `
    <p>Hi ${params.tenantName},</p>
    <p>Your rent payment was successful. Thank you!</p>
    
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin: 24px 0;">
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #4b5563;">
        <tr>
          <td><strong>Receipt Number:</strong></td>
          <td align="right">${params.receiptNumber}</td>
        </tr>
        ${tenancyPeriodRow}
        <tr>
          <td><strong>Amount Paid:</strong></td>
          <td align="right" style="color: #166534; font-weight: 700;">NGN ${params.amountPaid.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Property:</strong></td>
          <td align="right">${params.propertyAddress} (${params.unitName})</td>
        </tr>
        <tr>
          <td><strong>Payment Date:</strong></td>
          <td align="right">${params.paymentDate}</td>
        </tr>
      </table>
    </div>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Rent Payment Successful 🎉',
    contentHtml: content,
    buttonText: 'View Full Receipt',
    buttonUrl: params.receiptUrl,
  });
}

export function buildOtpEmailHtml(params: {
  otp: string;
  firstName?: string;
}): string {
  const name = params.firstName || 'there';
  const content = `
    <p>Hi ${name},</p>
    <p>Use the verification code below to securely access your Upward account:</p>
    <div style="text-align: center; margin: 32px 0;">
      <span style="font-size: 32px; font-weight: 800; color: #d97757; letter-spacing: 4px; background: #faf5f2; border: 1px dashed #d97757; padding: 12px 24px; border-radius: 8px; display: inline-block;">${params.otp}</span>
    </div>
    <p>This verification code is valid for 10 minutes. Please do not share it with anyone.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: 'Verify Your Identity',
    contentHtml: content,
  });
}

export function buildPmPaymentReceivedHtml(params: {
  pmName: string;
  tenantName: string;
  unitName: string;
  propertyName: string;
  amount: number;
  baseUrl: string;
}): string {
  const content = `
    <p>Dear <strong>${params.pmName}</strong>,</p>
    <p>We are pleased to inform you that your tenant <strong>${params.tenantName}</strong> has successfully completed a rent payment for <strong>Unit ${params.unitName}</strong> at <strong>${params.propertyName}</strong>.</p>
    
    <div style="background-color: #fafae6; padding: 24px; border-radius: 12px; border: 1px solid #e3e2cf; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #607366; text-transform: uppercase; letter-spacing: 0.5px;">Amount Received</p>
      <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 800; color: #1b4332;">NGN ${params.amount.toLocaleString()}</p>
    </div>
  `;
  return buildGlobalLayoutHtml({
    role: 'PM',
    title: 'Payment Received 🎉',
    contentHtml: content,
    buttonText: 'Go to Payments',
    buttonUrl: `${params.baseUrl}/portal/payments`,
  });
}

export function buildSequenceWelcomeHtml(params: {
  firstName: string;
  loginLink: string;
}): string {
  const content = `
    <p>Welcome to Upward! Your account has been successfully created, and you're all set to enjoy a better rental experience.</p>
    <p>With your account, you can:</p>
    <ul style="margin-bottom: 24px; padding-left: 20px; color: #4a4a4a; line-height: 1.6;">
      <li style="margin-bottom: 8px;">View your rent payment history and receipts anytime.</li>
      <li style="margin-bottom: 8px;">Build a verified rental profile that grows every time you pay your rent on time.</li>
      <li style="margin-bottom: 8px;">Take your rental reputation with you wherever you move.</li>
      <li style="margin-bottom: 8px;">Receive and manage rent payment requests from your property manager.</li>
    </ul>
    <p>Thank you for joining Upward. We're excited to help make renting simpler, more transparent, and more rewarding.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: `Hello ${params.firstName},`,
    contentHtml: content,
    buttonText: 'Log In to Profile',
    buttonUrl: params.loginLink,
  });
}

export function buildSequenceDay2Html(params: {
  firstName: string;
  scoreLink: string;
}): string {
  const content = `
    <p>You joined Upward because your rent payments can do more than simply pay for your home — they can help build your rental reputation. Now it's time to see how.</p>
    <p>Your Upward Score reflects your rent payment behaviour and helps build a verified rental profile that stays with you, even when you move.</p>
    <p>By viewing your score, you'll be able to:</p>
    <ul style="margin-bottom: 24px; padding-left: 20px; color: #4a4a4a; line-height: 1.6;">
      <li style="margin-bottom: 8px;">See how your current rental profile is taking shape.</li>
      <li style="margin-bottom: 8px;">Understand what influences your score.</li>
      <li style="margin-bottom: 8px;">Discover simple ways to strengthen it.</li>
    </ul>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: `Hi ${params.firstName},`,
    contentHtml: content,
    buttonText: 'View Upward Score',
    buttonUrl: params.scoreLink,
  });
}

export function buildSequenceDay5Html(params: {
  firstName: string;
  guideLink: string;
}): string {
  const content = `
    <p>Here's something many renters don't realize: Two tenants can pay the exact same rent for years—but when it's time to move, both often have to start from scratch because their years of responsible payments don't follow them.</p>
    <p>We think that should change. That's why we've put together a short guide on one of the most valuable things you can build as a tenant: your rental reputation.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: `Hi ${params.firstName},`,
    contentHtml: content,
    buttonText: 'Read 5 Ways to Build Reputation',
    buttonUrl: params.guideLink,
  });
}

export function buildSequenceDay9Html(params: {
  firstName: string;
  appLink: string;
}): string {
  const content = `
    <p>A resident in Yaba recently renewed her annual rent of over ₦1,000,000 through Upward. Like many tenants, she initially thought she was simply making another rent payment.</p>
    <p>But her payment was confirmed, her receipt was available instantly, and she watched her Upward Score increase.</p>
    <blockquote style="border-left: 4px solid #d97757; padding-left: 16px; margin: 24px 0; color: #555; font-style: italic;">
      "The whole process was so simple and clear. I paid my rent, got my receipt immediately, and then saw my Upward Score go up. It honestly felt good knowing that my payment wasn't just gone—it was helping me build my rental reputation."
    </blockquote>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: `Hi ${params.firstName},`,
    contentHtml: content,
    buttonText: 'See Your Rental Profile',
    buttonUrl: params.appLink,
  });
}

export function buildSequenceDay14Html(params: {
  firstName: string;
  appLink: string;
}): string {
  const content = `
    <p>Welcome once again to Upward!</p>
    <p>Your account is ready, and every time you use Upward, you build a stronger rental reputation that can open up more opportunities over time.</p>
    <p>The more you use Upward, the more valuable your rental profile becomes.</p>
  `;
  return buildGlobalLayoutHtml({
    role: 'TENANT',
    title: `Hi ${params.firstName},`,
    contentHtml: content,
    buttonText: 'Open Upward Account',
    buttonUrl: params.appLink,
  });
}

export function buildDailyAnalyticsHtml(params: {
  totalEmails: number;
  totalSent: number;
  totalFailed: number;
  totalRetries: number;
  failedList: Array<{ id: string; email: string; type: string; error: string }>;
}): string {
  const failedRows = params.failedList
    .map(
      (f) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 13px;">${f.id}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 13px;">${f.email}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 13px;">${f.type}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; color: #d32f2f;">${f.error}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    <p>Here is the automated daily analytics report for email operations:</p>
    <div style="background: #faf9f5; border: 1px solid rgba(22, 101, 52, 0.1); padding: 20px; border-radius: 12px; margin: 24px 0;">
      <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #2f3e35;">
        <tr>
          <td><strong>Total Emailed:</strong></td>
          <td align="right">${params.totalEmails}</td>
        </tr>
        <tr>
          <td><strong>Total Delivered:</strong></td>
          <td align="right" style="color: #166534; font-weight: 700;">${params.totalSent}</td>
        </tr>
        <tr>
          <td><strong>Total Failed:</strong></td>
          <td align="right" style="color: #d32f2f; font-weight: 700;">${params.totalFailed}</td>
        </tr>
        <tr>
          <td><strong>Total Retries Performed:</strong></td>
          <td align="right">${params.totalRetries}</td>
        </tr>
      </table>
    </div>

    ${params.failedList.length > 0 ? `
    <h3>Failed Dispatches Detail</h3>
    <div style="overflow-x: auto;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: left; font-size: 13px;">ID</th>
            <th style="padding: 8px; text-align: left; font-size: 13px;">Recipient</th>
            <th style="padding: 8px; text-align: left; font-size: 13px;">Type</th>
            <th style="padding: 8px; text-align: left; font-size: 13px;">Error Reason</th>
          </tr>
        </thead>
        <tbody>
          ${failedRows}
        </tbody>
      </table>
    </div>` : ''}
  `;

  return buildGlobalLayoutHtml({
    role: 'ADMIN',
    title: 'Daily Outbound Email Report',
    contentHtml: content,
  });
}
