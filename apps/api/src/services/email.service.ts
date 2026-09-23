import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpUser = process.env.SMTP_USER || 'ijustin20075@gmail.com';
const smtpPass = process.env.SMTP_PASS || 'xktruhhnnnuhgvtg';
const smtpFrom = process.env.SMTP_FROM || `"Keeper Platform" <${smtpUser}>`;

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export const sendInvitationEmail = async ({
  to,
  recipientName,
  inviteUrl,
  communityName,
  role,
  invitedBy,
}: {
  to: string;
  recipientName?: string;
  inviteUrl: string;
  communityName: string;
  role: string;
  invitedBy: string;
}): Promise<boolean> => {
  try {
    const roleLabels: Record<string, string> = {
      ADMIN: 'Community Administrator / President',
      MANAGER: 'Treasurer / Financial Manager',
      VIEWER: 'Community Member / Auditor',
      SUPER_ADMIN: 'Platform Super Administrator',
    };

    const friendlyRole = roleLabels[role] || role;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${communityName} on Keeper</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #065f46 0%, #047857 100%); text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Keeper</h1>
              <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Community Operations Platform</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">You've been invited!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 24px;">
                Hello${recipientName ? ` ${recipientName}` : ''},<br>
                <strong>${invitedBy}</strong> has invited you to join <strong>${communityName}</strong> on Keeper as a <strong>${friendlyRole}</strong>.
              </p>

              <!-- Workspace Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Assigned Role</div>
                    <div style="font-size: 15px; font-weight: 700; color: #14532d; margin-top: 4px;">${friendlyRole}</div>
                    <div style="font-size: 12px; color: #15803d; margin-top: 4px;">Community: ${communityName}</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px 0; color: #475569; font-size: 14px; line-height: 22px;">
                Click the button below to accept your invitation, create your password, and access your community workspace:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                      Accept Invitation & Create Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0 0; color: #94a3b8; font-size: 12px; line-height: 18px; text-align: center;">
                This invitation link will expire in 48 hours.<br>
                If you did not expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Keeper Operations Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `Invitation: Join ${communityName} on Keeper`,
      html: htmlContent,
    });

    console.log(`[EmailService] Invitation email dispatched to ${to}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to dispatch invitation to ${to}:`, error);
    return false;
  }
};

export const sendOtpEmail = async ({
  to,
  code,
}: {
  to: string;
  code: string;
}): Promise<boolean> => {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Keeper Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background: #059669; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">Keeper</h1>
              <p style="margin: 4px 0 0 0; color: #d1fae5; font-size: 11px; font-weight: 600; text-transform: uppercase;">Security & Verification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Email Verification Code</h2>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 13px; line-height: 20px;">
                Please use the following 6-digit verification code to verify your identity on Keeper:
              </p>

              <!-- OTP Box -->
              <div style="background: #f1f5f9; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 18px;">
                This code will expire in <strong>10 minutes</strong>.<br>
                If you did not request this verification, please ignore this email or contact support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                Keeper Platform Security
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `Your Keeper Verification Code: ${code}`,
      html: htmlContent,
    });

    console.log(`[EmailService] OTP email dispatched to ${to}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to dispatch OTP to ${to}:`, error);
    return false;
  }
};
