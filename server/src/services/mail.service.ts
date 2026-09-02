import nodemailer from 'nodemailer';

// Email Configuration from Environment Variables
const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = (process.env.SMTP_USER || 'jitendra.jania@gmail.com').trim();
const SMTP_PASS = (process.env.SMTP_PASS || 'ubuhieblqedxfkdt').replace(/\s+/g, '').replace(/["']/g, '').trim();
const SMTP_FROM = process.env.SMTP_FROM || '"PragatiDesk (DoIT&C Rajasthan)" <jitendra.jania@gmail.com>';
const PORTAL_URL = process.env.CLIENT_URL || 'https://manaat.com';

let transporter: nodemailer.Transporter | null = null;

// Initialize Transporter dynamically
function getTransporter(): nodemailer.Transporter | null {
  const host = (process.env.SMTP_HOST || SMTP_HOST).trim();
  const port = parseInt(process.env.SMTP_PORT || String(SMTP_PORT), 10);
  const user = (process.env.SMTP_USER || SMTP_USER).trim();
  const rawPass = process.env.SMTP_PASS || SMTP_PASS;
  const pass = rawPass.replace(/\s+/g, '').replace(/["']/g, '').trim();

  if (!pass || !user) {
    return null;
  }

  if (!transporter) {
    try {
      const isGmail = (host && host.toLowerCase().includes('gmail')) || user.toLowerCase().includes('@gmail.com');
      if (isGmail) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        console.log(`✉️ [MAIL SERVICE] Gmail SMTP Transporter initialized for sender: ${user}`);
      } else {
        transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        console.log(`✉️ [MAIL SERVICE] SMTP Transporter configured for host: ${host}:${port}`);
      }
    } catch (err) {
      console.error('⚠️ [MAIL SERVICE] Failed to initialize SMTP transporter:', err);
    }
  }
  return transporter;
}

interface UserMailInfo {
  name: string;
  email: string;
  gmailId?: string | null;
  designation: string;
  ssoId: string;
  officeName?: string | null;
  sectionName?: string | null;
  systemRole: string;
}

interface ProfileChange {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

/**
 * 1. Send Welcome Email with Default Password
 * Dispatches to both official email and personal Gmail ID (if registered).
 */
export async function sendWelcomeEmail(user: UserMailInfo, defaultPassword: string): Promise<boolean> {
  const recipients = [user.email];
  if (user.gmailId && user.gmailId.toLowerCase() !== user.email.toLowerCase()) {
    recipients.push(user.gmailId);
  }

  const subject = `Welcome to PragatiDesk (DoIT&C) — Official Account Credentials for ${user.name}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .credentials-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .cred-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; }
    .cred-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .cred-label { color: #64748b; font-weight: 600; }
    .cred-val { color: #0f172a; font-weight: 700; }
    .password-highlight { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: 800; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { background: #4f46e5; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); }
    .security-notice { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #92400e; margin-bottom: 20px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GOVERNMENT OF RAJASTHAN</h1>
      <p>Department of Information Technology & Communication (DoIT&C)</p>
    </div>
    <div class="content">
      <div class="greeting">Welcome, ${user.name}!</div>
      <p class="message">
        Your official user account has been provisioned on <strong>PragatiDesk</strong> — the official agile workflow, departmental dak, and task management engine for DoIT&C Rajasthan.
      </p>

      <div class="credentials-box">
        <div class="cred-row">
          <span class="cred-label">Full Name:</span>
          <span class="cred-val">${user.name}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Designation:</span>
          <span class="cred-val">${user.designation}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">SSO ID:</span>
          <span class="cred-val" style="color: #b45309; font-family: monospace;">${user.ssoId}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Official Email:</span>
          <span class="cred-val">${user.email}</span>
        </div>
        ${user.gmailId ? `
        <div class="cred-row">
          <span class="cred-label">Registered Gmail:</span>
          <span class="cred-val">${user.gmailId}</span>
        </div>` : ''}
        <div class="cred-row">
          <span class="cred-label">Assigned Office:</span>
          <span class="cred-val">${user.officeName || 'DoIT&C Secretariat HQ'}</span>
        </div>
        ${user.sectionName ? `
        <div class="cred-row">
          <span class="cred-label">Group / Section:</span>
          <span class="cred-val">${user.sectionName}</span>
        </div>` : ''}
        <div class="cred-row">
          <span class="cred-label">System Role:</span>
          <span class="cred-val">${user.systemRole}</span>
        </div>
        <div class="cred-row" style="padding-top: 10px; margin-top: 6px; border-top: 2px solid #cbd5e1;">
          <span class="cred-label" style="align-self: center;">Default Temporary Password:</span>
          <span class="password-highlight">${defaultPassword}</span>
        </div>
      </div>

      <div class="security-notice">
        <strong>🔒 Security Policy:</strong> You will be required to update this temporary password upon your first login. Do not share your credentials with anyone.
      </div>

      <div class="btn-container">
        <a href="${PORTAL_URL}" class="btn">Sign In to PragatiDesk Workspace &rarr;</a>
      </div>

      <p class="message" style="font-size: 11px; color: #64748b; margin-top: 20px;">
        You can sign in using your official email (<strong>${user.email}</strong>)${user.gmailId ? ` or 1-click Google Sign-In with <strong>${user.gmailId}</strong>` : ''}.
      </p>
    </div>
    <div class="footer">
      This is an automated system notification from PragatiDesk v2.0 &bull; DoIT&C, Government of Rajasthan.
    </div>
  </div>
</body>
</html>
`;

  return deliverEmail(recipients, subject, htmlContent, `Welcome ${user.name}! Credentials: SSO=${user.ssoId}, Default Pass=${defaultPassword}`);
}

/**
 * 2. Send Profile / Account Updated Notification Email
 * Dispatches whenever any user attribute is modified.
 */
export async function sendProfileUpdatedEmail(
  user: UserMailInfo,
  changes: ProfileChange[],
  updatedBy: any
): Promise<boolean> {
  const recipients = [user.email];
  if (user.gmailId && user.gmailId.toLowerCase() !== user.email.toLowerCase()) {
    recipients.push(user.gmailId);
  }

  const subject = `PragatiDesk — Security & Profile Update Notification for ${user.name} (${user.ssoId})`;
  const updateTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const changesTableRows = changes.map(
    (c) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 10px; font-weight: 700; color: #334155;">${c.label}</td>
        <td style="padding: 10px; color: #ef4444; text-decoration: line-through;">${String(c.oldValue || '—')}</td>
        <td style="padding: 10px; color: #10b981; font-weight: 700;">${String(c.newValue || '—')}</td>
      </tr>
    `
  ).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; padding: 20px; text-align: center; color: #ffffff; }
    .content { padding: 28px 24px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 12px; }
    .changes-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .changes-table th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; }
    .security-notice { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px; font-size: 11px; color: #991b1b; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; font-size: 16px;">PragatiDesk &bull; Profile Update Notification</h2>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Department of IT & Communication (DoIT&C)</p>
    </div>
    <div class="content">
      <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Hello ${user.name},</p>
      <p style="font-size: 12px; color: #475569; line-height: 1.6; margin-bottom: 16px;">
        This automated notification confirms that your official account profile on <strong>PragatiDesk</strong> was recently updated.
      </p>

      <div class="meta-box">
        <div><strong>Updated By:</strong> ${updatedBy?.name || 'System Administrator'} (${updatedBy?.designation || updatedBy?.systemRole || 'Admin'})</div>
        <div style="margin-top: 4px;"><strong>Timestamp:</strong> ${updateTimestamp} IST</div>
      </div>

      <div style="font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        Summary of Updated Fields:
      </div>

      <table class="changes-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Previous Value</th>
            <th>Updated Value</th>
          </tr>
        </thead>
        <tbody>
          ${changesTableRows}
        </tbody>
      </table>

      <div class="security-notice">
        <strong>⚠️ Security Alert:</strong> If you did not request or expect this modification, please contact your Office Super Admin or the DoIT&C IT Helpdesk immediately.
      </div>
    </div>
    <div class="footer">
      PragatiDesk v2.0 &bull; Automated Security Dispatch &bull; DoIT&C Rajasthan
    </div>
  </div>
</body>
</html>
`;

  return deliverEmail(recipients, subject, htmlContent, `Profile update notification for ${user.name} (${user.ssoId}) with ${changes.length} modified fields.`);
}

/**
 * 3. Send OTP Email for Password Recovery
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  userName?: string,
  gmailId?: string | null
): Promise<boolean> {
  const recipients = [email];
  if (gmailId && gmailId.toLowerCase() !== email.toLowerCase()) {
    recipients.push(gmailId);
  }

  const subject = `PragatiDesk — Password Reset Verification Code: ${otp}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; text-align: center; }
    .otp-badge { display: inline-block; background: #e0e7ff; color: #3730a3; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 12px 32px; border-radius: 12px; margin: 20px 0; font-family: monospace; border: 2px dashed #6366f1; }
  </style>
</head>
<body>
  <div class="container">
    <h3 style="margin: 0 0 10px 0; color: #0f172a;">Password Reset Verification</h3>
    <p style="font-size: 13px; color: #475569;">${userName ? `Hello ${userName}, ` : ''}Use the verification code below to reset your PragatiDesk password.</p>
    <div class="otp-badge">${otp}</div>
    <p style="font-size: 12px; color: #dc2626; font-weight: 600;">⚠️ This code will expire in 10 minutes. Do not disclose it to anyone.</p>
  </div>
</body>
</html>
`;

  return deliverEmail([email], subject, htmlContent, `OTP verification code '${otp}' dispatched to ${email}`);
}

/**
 * Core Delivery Helper
 */
async function deliverEmail(
  recipients: string[],
  subject: string,
  html: string,
  logSummary: string
): Promise<boolean> {
  const mailTransporter = getTransporter();

  console.log(`\n================================================================`);
  console.log(`📧 [MAIL DISPATCH QUEUE] Sending Email Notification`);
  console.log(`   To:       ${recipients.join(', ')}`);
  console.log(`   Subject:  ${subject}`);
  console.log(`   Summary:  ${logSummary}`);
  console.log(`================================================================\n`);

  if (mailTransporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || `"PragatiDesk (DoIT&C Rajasthan)" <${process.env.SMTP_USER || 'arigates.creations@gmail.com'}>`;
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to: recipients.join(', '),
        subject,
        html,
      });
      console.log(`✅ [MAIL SERVICE] Email delivered via SMTP! MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error(`⚠️ [MAIL SERVICE] SMTP Delivery failed:`, err.message || err);
      // Fallback preview is already logged
      return false;
    }
  } else {
    // In local / dev environment without SMTP credentials, email is logged and simulated cleanly
    console.log(`ℹ️ [MAIL SERVICE] SMTP not configured in .env. Email successfully logged to dispatch stream.`);
    return true;
  }
}
