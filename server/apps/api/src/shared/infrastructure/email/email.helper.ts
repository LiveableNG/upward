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

export interface OtpBranding {
  primaryColor?: string;
  bgColor?: string;
  borderStyle?: string;
  shadowStyle?: string;
  outerBorder?: string;
}

export interface OtpEmailParams {
  theme: 'CLAY' | 'FOREST' | 'PM';
  brandName: string;
  brandSub: string;
  title: string;
  greeting?: string;
  message: string;
  otp: string;
  expiryText: string;
  isPm?: boolean;
  branding?: OtpBranding;
}

export function buildOtpEmailHtml(params: OtpEmailParams): string {
  const { theme, brandName, brandSub, title, greeting, message, otp, expiryText, isPm, branding } = params;
  const config = getThemeColors(theme);

  const primaryColor = branding?.primaryColor || config.primaryColor;
  const bgColor = branding?.bgColor || config.bgColor;
  const borderStyle = branding?.borderStyle || config.borderStyle;
  const shadowStyle = branding?.shadowStyle || config.shadowStyle;
  const outerBorder = branding?.outerBorder || config.outerBorder;

  if (isPm) {
    return `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #0a0a0f; background-color: ${bgColor}; padding: 48px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.06);">
        <div style="margin-bottom: 40px;">
          <span style="color: ${primaryColor}; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">${brandName}</span>
          <div style="color: #8a8a8a; font-size: 12px; margin-top: 4px;">${brandSub}</div>
        </div>
        <h2 style="color: ${primaryColor}; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">${title}</h2>
        <p style="font-size: 16px; color: #4a4642; line-height: 1.6; margin-bottom: 32px;">${message}</p>
        
        <div style="background: #ffffff; border: ${borderStyle}; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04);">
          <div style="font-size: 11px; color: ${primaryColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; margin-bottom: 16px;">Verification Code</div>
          <div style="font-size: 56px; font-weight: 800; color: ${primaryColor}; letter-spacing: 0.15em; line-height: 1; font-variant-numeric: tabular-nums;">${otp}</div>
        </div>

        <p style="font-size: 14px; color: #8a8a8a; line-height: 1.6; margin-top: 40px; text-align: center;">
          ${expiryText}
        </p>
        
        <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(0,0,0,0.06); text-align: center;">
          <p style="font-size: 12px; color: #8a8a8a;">
            &copy; 2026 Upward by GoodTenants. Professional Property Management Simplified.
          </p>
        </div>
      </div>
    `;
  }

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px; ${outerBorder}">
      <div style="margin-bottom:32px;">
        <span style="color:${primaryColor};font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${brandName}</span>
        <div style="color:#6B7280;font-size:12px;margin-top:4px;">${brandSub}</div>
      </div>
      <h2 style="color: ${primaryColor}; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">${title}</h2>
      <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">${greeting || 'Hello'},</p>
      <p style="font-size: 16px; color: #4b5563;">${message}</p>
      
      <div style="background: #ffffff; border: ${borderStyle}; padding: 32px; border-radius: 12px; margin: 32px 0; text-align: center; ${shadowStyle}">
        <div style="font-size: 11px; color: ${primaryColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Verification Code</div>
        <div style="font-size: 48px; font-weight: 800; color: ${primaryColor}; letter-spacing: 0.1em; line-height: 1;">${otp}</div>
      </div>

      <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; text-align: center;">
        ${expiryText}
      </p>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 24px; text-align: center;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export interface DocLayoutBranding {
  primaryColor?: string;
  bgColor?: string;
  containerBg?: string;
  borderColor?: string;
  shadowStyle?: string;
  logoTextColor?: string;
  logoSubColor?: string;
  btnColor?: string;
  btnTextColor?: string;
  footerBg?: string;
  footerTextColor?: string;
}

export interface FullLayoutParams {
  theme: 'FOREST' | 'LANDLORD';
  logoText?: string;
  logoSub?: string;
  title: string;
  contentHtml: string;
  footerText: string;
  customStyle?: string;
  branding?: DocLayoutBranding;
}

export function buildFullLayoutHtml(params: FullLayoutParams): string {
  const { theme, logoText = 'Upward', logoSub, title, contentHtml, footerText, customStyle = '', branding } = params;
  const config = getThemeColors(theme);
  
  const primaryColor = branding?.primaryColor || config.primaryColor;
  const bgColor = branding?.bgColor || config.bgColor;
  const containerBg = branding?.containerBg || '#ffffff';
  const borderColor = branding?.borderColor || config.borderStyle;
  const shadowStyle = branding?.shadowStyle || config.shadowStyle;

  const logoTextColor = branding?.logoTextColor || (theme === 'LANDLORD' ? '#fdfcfb' : '#faf9f5');
  const logoSubColor = branding?.logoSubColor || (theme === 'LANDLORD' ? 'rgba(253, 252, 251, 0.7)' : 'rgba(250, 249, 245, 0.7)');
  const borderTopColor = theme === 'LANDLORD' ? '#f0eee9' : '#f0eee9';
  const footerBgColor = branding?.footerBg || (theme === 'LANDLORD' ? '#faf9f6' : '#faf9f5');
  const footerTextColor = branding?.footerTextColor || '#8c8c8c';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: ${bgColor}; color: #1a1a1a; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border-radius: 24px; overflow: hidden; border: ${borderColor}; ${shadowStyle} }
    .header { background-color: ${primaryColor}; padding: 40px; text-align: left; }
    .content { padding: 48px; }
    .logo-text { color: ${logoTextColor}; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
    .logo-sub { color: ${logoSubColor}; font-size: 12px; }
    h1 { font-size: 24px; font-weight: 700; color: ${primaryColor}; margin-bottom: 24px; line-height: 1.3; }
    p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 20px; }
    .btn { background-color: ${primaryColor}; color: ${logoTextColor} !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
    .footer { padding: 32px 48px; border-top: 1px solid ${borderTopColor}; background-color: ${footerBgColor}; }
    .footer-text { font-size: 13px; color: ${footerTextColor}; line-height: 1.6; }
    ${customStyle}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo-text">${logoText}</span>
      ${logoSub ? `<span class="logo-sub">${logoSub}</span>` : ''}
    </div>
    <div class="content">
      ${title ? `<h1>${title}</h1>` : ''}
      ${contentHtml}
    </div>
    <div class="footer">
      <p class="footer-text">
        ${footerText}
      </p>
    </div>
  </div>
</body>
</html>`;
}

export interface WaitlistConfirmationBranding {
  primaryColor?: string;
  bgColor?: string;
  cardBg?: string;
  borderColor?: string;
}

export function buildWaitlistConfirmationHtml(params: {
  displayName: string;
  firstName?: string;
  email: string;
  frontendUrl: string;
  branding?: WaitlistConfirmationBranding;
}): string {
  const primaryColor = params.branding?.primaryColor || '#d97757';
  const bgColor = params.branding?.bgColor || '#F9FAFB';
  const cardBg = params.branding?.cardBg || '#ffffff';
  const borderColor = params.branding?.borderColor || '#E5E7EB';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Upward Waitlist</title>
<style>
@media (prefers-color-scheme: dark) {
body, .container-table, .outer-table { background-color: ${bgColor} !important; }
.main-card { background-color: ${cardBg} !important; border-color: ${borderColor} !important; }
.title, .greeting, .body-text, .footer-text { color: #111827 !important; }
.sub-text { color: #4b5563 !important; }
.info-box { background-color: #fff7ed !important; border-color: #ffedd5 !important; }
.info-box-title { color: #9a3412 !important; }
.info-box-text { color: #431407 !important; }
.brand-name { color: ${primaryColor} !important; }
.brand-sub { color: #6b7280 !important; }
.supporting-text { color: #9ca3af !important; }
.support-link { color: #6b7280 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
<table class="outer-table" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background-color:${bgColor};">
<tr>
<td align="center">
<table class="main-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:${cardBg};border-radius:16px;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);overflow:hidden;border:1px solid ${borderColor};">
<tr>
<td style="height:4px;background-color:${primaryColor};"></td>
</tr>
<tr>
<td style="padding:40px;">
<div style="margin-bottom:32px;">
<span class="brand-name" style="color:${primaryColor};font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
<div class="brand-sub" style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
</div>
<h1 class="greeting" style="color:#111827;font-size:24px;font-weight:700;margin:0 0 20px 0;line-height:1.2;">Hello{{firstName}},</h1>
<p class="body-text" style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">You are now officially on the waitlist for <strong>Upward by GoodTenants</strong>.</p>
<p class="sub-text" style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">We're building upward for you to help create a pathway to better rental terms, discounts, financial services, and eventually to owning a home — with a community of people who are building the same future.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td class="info-box" style="background-color:#FFF7ED;border:1px solid #FFEDD5;border-radius:12px;padding:24px;">
<div class="info-box-title" style="color:#9A3412;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">What happens next</div>
<p class="info-box-text" style="color:#431407;font-size:15px;margin:0;line-height:1.5;">We will notify you as soon as early access becomes available. You may also receive occasional updates as we prepare for launch.</p>
</td>
</tr>
</table>
<p class="footer-text" style="color:#6B7280;font-size:15px;margin:0 0 24px 0;">Thank you for joining early.</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${borderColor};padding-top:24px;">
  <tr>
    <td align="left">
      <a href="${params.frontendUrl}" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Our Website</a>
      <span style="color: #D1D5DB; padding: 0 12px;">&bull;</span>
      <a href="mailto:hello@goodtenants.africa" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Contact Support</a>
      <span style="color: #D1D5DB; padding: 0 12px;">&bull;</span>
      <a href="${params.frontendUrl}/unsubscribe?email={{email}}" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Unsubscribe</a>
    </td>
  </tr>
</table>

</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export interface AnalyticsBranding {
  primaryColor?: string;
  bgColor?: string;
  cardBg?: string;
  borderColor?: string;
}

export function buildDailyAnalyticsHtml(
  stats: { completed: number; incomplete: number; total: number },
  date: string,
  branding?: AnalyticsBranding,
): string {
  const primaryColor = branding?.primaryColor || '#d97757';
  const bgColor = branding?.bgColor || '#f9fafb';
  const cardBg = branding?.cardBg || '#ffffff';
  const borderColor = branding?.borderColor || '#e5e7eb';

  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px;">
        <h2 style="color: ${primaryColor}; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Daily Signup Analytics</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Here is the summary for <strong>${date}</strong>:</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; border-collapse: separate; border-spacing: 16px 0;">
          <tr>
            <td width="50%" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 12px; text-align: center;">
              <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Completed</div>
              <div style="font-size: 36px; font-weight: 800; color: #14532d; line-height: 1;">${stats.completed}</div>
            </td>
            <td width="50%" style="background: #fff7ed; border: 1px solid #ffedd5; padding: 24px; border-radius: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Incomplete</div>
              <div style="font-size: 36px; font-weight: 800; color: #7c2d12; line-height: 1;">${stats.incomplete}</div>
            </td>
          </tr>
        </table>

        <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 24px; border-radius: 12px; margin: 24px 16px 0; text-align: center;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Total New Signups</div>
          <div style="font-size: 28px; font-weight: 800; color: #111827; line-height: 1;">${stats.total}</div>
        </div>

        <p style="font-size: 13px; color: #9ca3af; margin-top: 40px; text-align: center; font-style: italic; line-height: 1.5;">
          This is an automated report generated by the Upward Cron Service.<br>
          Sent to superadmin users of Upward by GoodTenants.
        </p>
      </div>
    `;
}

export function getPmTypeLabel(pmType?: string | null): string {
  if (!pmType) return 'Property Manager';

  const types: Record<string, string> = {
    INDIVIDUAL_LANDLORD: 'Landlord',
    Caretaker: 'Caretaker',
    Lawyer: 'Lawyer',
    'Estate Agent': 'Estate Agent',
    'Property Manager': 'Property Manager',
    Company: 'Property Management Company',
  };

  return types[pmType] || 'Property Manager';
}

export function buildTenantInviteHtml(params: {
  tenantName: string;
  pmName: string;
  inviteLink: string;
  pmRole: string;
  branding?: DocLayoutBranding;
}): string {
  const primary = params.branding?.primaryColor || '#166534';
  const customStyle = `
    h1 { font-size: 22px; }
    .bullet-list { margin-bottom: 24px; padding-left: 0; list-style: none; }
    .bullet-item { font-size: 16px; color: #4a4a4a; margin-bottom: 12px; position: relative; padding-left: 24px; line-height: 1.6; }
    .bullet-item::before { content: "•"; color: ${primary}; font-weight: bold; position: absolute; left: 0; }
  `;

  const contentHtml = `
    <p>We're excited to let you know that <strong>${params.pmName}</strong> will now be using Upward to manage your rent payments and tenancy records.</p>
    
    <p>Upward is a simple platform designed to make your renting experience easier and more rewarding. With the platform, you can securely make rent payments, build a credibility score you can use anywhere, and get exclusive benefits from paying rent.</p>
    
    <p>Upward helps you:</p>
    <div class="bullet-list">
      <div class="bullet-item">Earn rewards for paying rent early and consistently</div>
      <div class="bullet-item">Get access to quality houses when moving homes</div>
      <div class="bullet-item">Get apartments based on your rental credibility, without discriminatory biases</div>
      <div class="bullet-item">Build a credibility profile that can be used anywhere.</div>
    </div>

    <p style="margin-bottom: 32px;">Getting started only takes a few minutes.</p>
    
    <a href="${params.inviteLink}" class="btn">Accept Upward Invite</a>
    
    <p style="margin-top: 32px; margin-bottom: 24px;">We look forward to giving you a smoother housing experience through Upward.</p>
    
    <p style="margin: 0; line-height: 1.6;">
      Your Cheerleader,<br>
      <strong>Liveable</strong>
    </p>
  `;

  return buildFullLayoutHtml({
    theme: 'FOREST',
    logoText: 'Upward',
    logoSub: params.pmRole,
    title: `Dear ${params.tenantName},`,
    contentHtml,
    footerText: `If you have any questions, please contact your ${params.pmRole.toLowerCase()} or reply to this email.<br>
      © 2026 Upward by GoodTenants. All rights reserved.`,
    customStyle,
    branding: params.branding,
  });
}

export function buildPaymentRequestHtml(params: {
  tenantName: string;
  pmName: string;
  amount: number;
  currency: string;
  dueDate: string | Date;
  description?: string;
  paymentLink: string;
  pmRole: string;
  branding?: DocLayoutBranding;
}): string {
  const primary = params.branding?.primaryColor || '#166534';
  const customStyle = `
    .payment-badge { background-color: #f0f7f2; border: 1px solid #d1e7d8; padding: 24px; border-radius: 16px; margin-bottom: 32px; }
    .payment-label { font-size: 11px; font-weight: 700; color: ${primary}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: block; }
    .payment-amount { font-size: 32px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; display: block; }
    .payment-meta { font-size: 14px; color: #666; display: block; margin-top: 4px; }
  `;

  const contentHtml = `
    <p>Hello ${params.tenantName}, you have a new payment request for your property.</p>
    
    <div class="payment-badge">
      <span class="payment-label">Amount Due</span>
      <span class="payment-amount">${params.currency} ${params.amount.toLocaleString()}</span>
      <span class="payment-meta"><strong>Due Date:</strong> ${new Date(params.dueDate).toLocaleDateString()}</span>
      ${params.description ? `<span class="payment-meta"><strong>Description:</strong> ${params.description}</span>` : ''}
    </div>

    <p>Please use the button below to view the breakdown and make your payment securely.</p>
    
    <a href="${params.paymentLink}" class="btn">View & Pay Now</a>
  `;

  return buildFullLayoutHtml({
    theme: 'FOREST',
    logoText: 'Upward',
    logoSub: 'Payment Request',
    title: `Payment Request from ${params.pmName}`,
    contentHtml,
    footerText: `If you have any questions about this request, please contact your ${params.pmRole.toLowerCase()} directly.<br>
      © 2026 Upward by GoodTenants. All rights reserved.`,
    customStyle,
    branding: params.branding,
  });
}

export function buildCredibilityRequestHtml(params: {
  tenantName: string;
  propertyAddress: string;
  requestLink: string;
  isRegisteredPm?: boolean;
  branding?: DocLayoutBranding;
}): string {
  const ctaText = params.isRegisteredPm ? 'Open Dashboard' : 'Review & Fulfill Request';
  const mainText = params.isRegisteredPm
    ? `A past tenant, <strong>${params.tenantName}</strong>, is requesting their rental history for <strong>${params.propertyAddress}</strong> to build their credit score on Upward.`
    : `<strong>${params.tenantName}</strong> has requested that you verify their past tenancy and payment records for <strong>${params.propertyAddress}</strong>.`;

  const subText = params.isRegisteredPm
    ? 'Since you are already on Upward, you can fulfill this request directly from your dashboard Activity Center.'
    : 'Providing these records helps your former tenant build their credibility profile on Upward.';

  const contentHtml = `
    <p>Hello,</p>
    <p>${mainText}</p>
    <p>${subText}</p>
    <a href="${params.requestLink}" class="btn">${ctaText}</a>
  `;

  return buildFullLayoutHtml({
    theme: 'FOREST',
    logoText: 'Upward',
    title: 'Past Tenancy Record Request',
    contentHtml,
    footerText: '© 2026 Upward by GoodTenants. All rights reserved.',
    branding: params.branding,
  });
}

export function buildNewUserRecordsHtml(params: {
  pmName: string;
  propertyAddress: string;
  completeProfileLink: string;
  branding?: DocLayoutBranding;
}): string {
  const contentHtml = `
    <p>Hello,</p>
    <p><strong>${params.pmName}</strong> has just added your past rent payment records for <strong>${params.propertyAddress}</strong> to Upward.</p>
    <p>You can proceed to complete your profile to see how this affects your tenancy score and unlocks better rental opportunities.</p>
    <a href="${params.completeProfileLink}" class="btn">Complete Your Profile</a>
  `;

  return buildFullLayoutHtml({
    theme: 'FOREST',
    logoText: 'Upward',
    title: 'Your Past Records Have Been Added',
    contentHtml,
    footerText: '© 2026 Upward by GoodTenants. All rights reserved.',
    branding: params.branding,
  });
}

export function buildLandlordWelcomeHtml(params: {
  landlordName: string;
  tempPassword: string;
  portalLink: string;
  branding?: DocLayoutBranding;
}): string {
  const customStyle = `
    .badge { background-color: #f0f7f2; border: 1px solid #d1e7d8; padding: 24px; border-radius: 16px; margin-bottom: 32px; }
    .label { font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: block; }
    .password { font-size: 24px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; display: block; font-family: monospace; }
  `;

  const contentHtml = `
    <p>Your property manager has invited you to the Upward Landlord Portal. Here you can view real-time summary analysis of your properties, units, and rental revenue.</p>
    
    <div class="badge">
      <span class="label">Temporary Password</span>
      <span class="password">${params.tempPassword}</span>
      <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">You will be required to change this password upon your first login.</p>
    </div>

    <p>Access your dashboard using the button below:</p>
    
    <a href="${params.portalLink}" class="btn">Login to Landlord Portal</a>
  `;

  return buildFullLayoutHtml({
    theme: 'FOREST',
    logoText: 'Upward',
    logoSub: 'Landlord Portal',
    title: `Welcome to Upward, ${params.landlordName}`,
    contentHtml,
    footerText: `If you didn't expect this invitation, please contact your property manager.<br>
      © 2026 Upward by GoodTenants. All rights reserved.`,
    customStyle,
    branding: params.branding,
  });
}

export function buildLandlordNewPropertyAssignmentHtml(params: {
  landlordName: string;
  portalLink: string;
  branding?: DocLayoutBranding;
}): string {
  const contentHtml = `
    <p>A property manager has just added a new property to your portfolio on Upward.</p>
    <p>You can now view real-time analysis and reports for this property by logging into your portal.</p>
    
    <a href="${params.portalLink}" class="btn">View Your Portfolio</a>
  `;

  return buildFullLayoutHtml({
    theme: 'LANDLORD',
    logoText: 'Upward',
    logoSub: 'Landlord Portal',
    title: `New Property Assigned, ${params.landlordName}`,
    contentHtml,
    footerText: '© 2026 Upward by GoodTenants. All rights reserved.',
    branding: params.branding,
  });
}

export function buildRecordAddedHtml(params: {
  pmName: string;
  propertyAddress: string;
  frontendUrl: string;
  branding?: DocLayoutBranding;
}): string {
  const contentHtml = `
    <p>Hello,</p>
    <p><strong>${params.pmName}</strong> has just updated your rental payment history for <strong>${params.propertyAddress}</strong> on Upward.</p>
    <p>These records help build your rental credibility score and showcase your consistency as a tenant.</p>
    <a href="${params.frontendUrl}/dashboard" class="btn">View Your Rent Passport</a>
  `;

  return buildFullLayoutHtml({
    theme: 'LANDLORD',
    logoText: 'Upward',
    title: 'New Rental Records Added',
    contentHtml,
    footerText: '© 2026 Upward by GoodTenants. All rights reserved.',
    branding: params.branding,
  });
}

export function buildDataDeletionRequestConfirmationHtml(params?: {
  branding?: AnalyticsBranding;
}): string {
  const primaryColor = params?.branding?.primaryColor || '#d97757';
  const bgColor = params?.branding?.bgColor || '#f9fafb';
  const cardBg = params?.branding?.cardBg || '#ffffff';
  const borderColor = params?.branding?.borderColor || '#e5e7eb';

  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px;">
        <div style="margin-bottom:32px;">
          <span style="color:${primaryColor};font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
          <div style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
        </div>
        <h2 style="color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Data Deletion Request</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello,</p>
        <p style="font-size: 16px; color: #4b5563;">We have received a request to delete all data associated with this email address from our systems.</p>
        
        <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 24px; border-radius: 12px; margin: 32px 0;">
          <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">
            <strong>Important:</strong> This process is irreversible. Once we proceed, your Rent Passport, payment history, and all account details will be permanently removed.
          </p>
        </div>

        <p style="font-size: 16px; color: #4b5563;">
          To ensure the security of your data, we require you to confirm this request by replying to this email or clicking the button below (if available). 
          If you did not initiate this request, please ignore this email and your data will remain safe.
        </p>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          Best regards,<br>
          The Upward Privacy Team
        </p>
      </div>
    `;
}

export function buildTeamInvitationHtml(params: {
  name: string;
  inviterName: string;
  isNewAccount: boolean;
  claimLink: string;
  branding?: OtpBranding;
}): string {
  const config = getThemeColors('PM');
  const primaryColor = params.branding?.primaryColor || config.primaryColor;
  const bgColor = params.branding?.bgColor || config.bgColor;
  const borderStyle = params.branding?.borderStyle || config.borderStyle;
  const shadowStyle = params.branding?.shadowStyle || config.shadowStyle;

  return `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #0a0a0f; background-color: ${bgColor}; padding: 48px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.06);">
        <div style="margin-bottom: 40px;">
          <span style="color: ${primaryColor}; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">Upward PM</span>
          <div style="color: #8a8a8a; font-size: 12px; margin-top: 4px;">Property Management Collaboration</div>
        </div>
        <h2 style="color: ${primaryColor}; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">Team Invitation</h2>
        <p style="font-size: 16px; color: #4a4642; line-height: 1.6; margin-bottom: 24px;">Hello ${params.name},</p>
        <p style="font-size: 16px; color: #4a4642; line-height: 1.6; margin-bottom: 32px;">
          <strong>${params.inviterName}</strong> has invited you to collaborate on their properties on the Upward PM platform.
        </p>
        
        <div style="background: #ffffff; border: ${borderStyle}; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04); ${shadowStyle}">
          <p style="font-size: 15px; color: #8a8a8a; margin-bottom: 24px; line-height: 1.5;">
            ${
              params.isNewAccount
                ? 'An account has been prepared for you. Click the button below to claim your access and set your password.'
                : 'You have been granted access to new properties. You can now manage them from your existing dashboard.'
            }
          </p>
          <a href="${params.claimLink}" style="background-color: ${primaryColor}; color: #ffffff; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s;">
            ${params.isNewAccount ? 'Claim Your Access' : 'Go to Dashboard'}
          </a>
        </div>

        <p style="font-size: 14px; color: #8a8a8a; line-height: 1.6; margin-top: 40px; text-align: center;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
        
        <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(0,0,0,0.06); text-align: center;">
          <p style="font-size: 12px; color: #8a8a8a;">
            &copy; 2026 Upward by GoodTenants. Built for professional property managers.
          </p>
        </div>
      </div>
    `;
}

export function buildJoinRequestRejectionHtml(params: {
  tenantName: string;
  pmName: string;
  propertyAddress: string;
  reason?: string;
  branding?: AnalyticsBranding;
}): string {
  const primaryColor = params.branding?.primaryColor || '#d97757';
  const bgColor = params.branding?.bgColor || '#f9fafb';

  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Connection Request Declined</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello ${params.tenantName},</p>
        <p style="font-size: 16px; color: #4b5563;">Your request to connect with <strong>${params.pmName}</strong> for the property at <strong>${params.propertyAddress}</strong> has been declined.</p>
        
        ${
          params.reason
            ? `
        <div style="background: #FEF2F2; border: 1px solid #FEE2E2; padding: 24px; border-radius: 12px; margin: 24px 0;">
          <div style="font-size: 11px; color: #991B1B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Reason from Manager</div>
          <p style="font-size: 15px; color: #7F1D1D; margin: 0; line-height: 1.5;">${params.reason}</p>
        </div>
        `
            : ''
        }

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          You can try reconnecting with a different email address or contact the manager directly if you believe this was an error.
        </p>
      </div>
    `;
}

export function buildCredibilityRequestRejectionHtml(params: {
  tenantName: string;
  propertyAddress: string;
  reason?: string;
  branding?: AnalyticsBranding;
}): string {
  const bgColor = params.branding?.bgColor || '#f9fafb';

  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Record Request Declined</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello ${params.tenantName},</p>
        <p style="font-size: 16px; color: #4b5563;">Your request for past tenancy records for <strong>${params.propertyAddress}</strong> has been declined by the manager.</p>
        
        ${
          params.reason
            ? `
        <div style="background: #FEF2F2; border: 1px solid #FEE2E2; padding: 24px; border-radius: 12px; margin: 24px 0;">
          <div style="font-size: 11px; color: #991B1B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Reason from Manager</div>
          <p style="font-size: 15px; color: #7F1D1D; margin: 0; line-height: 1.5;">${params.reason}</p>
        </div>
        `
            : ''
        }

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          This request will no longer appear as pending on your dashboard.
        </p>
      </div>
    `;
}

export function applyPmBranding(html: string, emailSetting: any): string {
  if (!emailSetting) return html;

  let brandedHtml = html;

  if (emailSetting.logoUrl) {
    const logoTag = `<div style="text-align: center; margin-bottom: 24px;"><img src="${emailSetting.logoUrl}" alt="${emailSetting.senderName}" style="max-height: 60px; object-fit: contain;" /></div>`;
    if (brandedHtml.includes('<body')) {
      brandedHtml = brandedHtml.replace(/(<body[^>]*>)/i, `$1\n${logoTag}`);
    }
  }

  if (emailSetting.closingStatement) {
    const closingTag = `<p style="margin-top: 24px; font-size: 14px; color: #4b5563;">${emailSetting.closingStatement.replace(/\n/g, '<br />')}</p>`;
    if (brandedHtml.includes('Your Cheerleader,')) {
      brandedHtml = brandedHtml.replace(/<p style="margin-top: 32px;[^>]*>[\s\S]*?<\/p>/i, closingTag);
    } else if (brandedHtml.includes('<div class="footer"')) {
      brandedHtml = brandedHtml.replace('<div class="footer"', `${closingTag}\n<div class="footer"`);
    }
  }

  if (emailSetting.footerAddress) {
    const footerAddressHtml = `<p style="margin-top: 12px; font-size: 12px; color: #8a8a8a;">${emailSetting.footerAddress.replace(/\n/g, '<br />')}</p>`;
    if (brandedHtml.includes('class="footer-text"')) {
      brandedHtml = brandedHtml.replace(/(class="footer-text"[^>]*>)/i, `$1${footerAddressHtml}`);
    } else if (brandedHtml.includes('class="footer"')) {
      brandedHtml = brandedHtml.replace(/(class="footer"[^>]*>)/i, `$1${footerAddressHtml}`);
    }
  }

  return brandedHtml;
}
