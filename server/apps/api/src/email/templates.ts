import { formatName } from '@upward/common-utils'

interface WaitlistUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  campaignWeekSent: number
}

export const wrapInBaseTemplate = (content: string, subject: string) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style>
    /* RESET STYLES */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }

    /* MOBILE STYLES */
    @media screen and (max-width: 600px) {
      .main-card {
        width: 100% !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .content-padding {
        padding: 32px 20px !important;
      }
      .header-padding {
        padding: 24px 20px 16px !important;
      }
      .footer-padding {
        padding: 24px 20px !important;
      }
      .mobile-center {
        text-align: center !important;
      }
    }

    /* DARK MODE STYLES (Optional but premium) */
    @media (prefers-color-scheme: dark) {
      body { background-color: #F3F4F6 !important; }
      /* We keep the card white for that clean 'paper' look even in dark mode for better readability, similar to modern transactional emails */
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #F9FAFB;">
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${subject}
  </div>
  
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="background-color: #F9FAFB; padding: 40px 0;" class="footer-padding">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="main-card">
          <!-- TOP ACCENT LINE -->
          <tr>
            <td style="height: 4px; background-color: #d97757; border-radius: 16px 16px 0 0;"></td>
          </tr>
          
          <!-- MAIN CONTENT CARD -->
          <tr>
            <td style="background-color: #ffffff; padding: 48px 40px; border-radius: 0 0 16px 16px; border: 1px solid #E5E7EB; border-top: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" class="content-padding">
              
              <!-- HEADER / LOGO -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 40px;">
                <tr>
                  <td>
                    <span style="color: #d97757; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">Upward</span>
                    <div style="color: #6B7280; font-size: 12px; margin-top: 4px; font-weight: 500;">by GoodTenants</div>
                  </td>
                </tr>
              </table>

              <!-- SUBJECT (Optional, displayed in-body for context) -->
              ${
                subject
                  ? `<div style="color: #111827; font-size: 24px; font-weight: 800; line-height: 1.3; margin-bottom: 24px; letter-spacing: -0.01em;">${subject}</div>`
                  : ''
              }

              <!-- BODY CONTENT -->
              <div style="color: #374151; font-size: 16px; line-height: 1.7; word-break: break-word;">
                ${content}
              </div>

              <!-- SIGNATURE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #F3F4F6; padding-top: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #111827; font-weight: 600; font-size: 16px;">The Upward Team</p>
                    <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">Building your pathway home.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;" class="footer-padding">
              <p style="margin: 0 0 12px 0; color: #9CA3AF; font-size: 12px; line-height: 1.6;">
                You're receiving this because you're part of the Upward waitlist community.
              </p>
              <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <a href="https://upward.goodtenants.africa" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Our Website</a>
                <a href="mailto:hello@goodtenants.africa" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Contact Support</a>
              </div>
              <p style="margin: 20px 0 0 0; color: #D1D5DB; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
                © 2026 Upward by GoodTenants
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export const processCampaignHtml = (html: string, user: WaitlistUser) => {
  const firstName = user.firstName ? formatName(user.firstName) : 'there'
  const lastName = user.lastName ? formatName(user.lastName) : ''

  return html
    .replace(/{{firstName}}/g, firstName)
    .replace(/{{lastName}}/g, lastName)
    .replace(/{{email}}/g, user.email)
}
