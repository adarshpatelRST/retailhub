import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface WelcomeEmailData {
  toEmail: string;
  fullName: string;
  role: string;
  assignedScopeDescription: string;
  initialPassword: string;
  loginUrl: string;
}

export interface PasswordResetEmailData {
  toEmail: string;
  fullName: string;
  newPassword: string;
  loginUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendWelcomeCredentials(data: WelcomeEmailData): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM || '"RetailHub System" <noreply@retailhub.com>',
      to: data.toEmail,
      subject: 'Welcome to RetailHub — Your Account Credentials',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 700;">RetailHub Enterprise Platform</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">High-Velocity Retail Operations (D-Mart / JioMart Model)</p>
          </div>

          <p style="color: #334155; font-size: 15px;">Hello <strong>${data.fullName}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">An enterprise account has been created for you with the following operational authority and access scope:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #475569; width: 35%;">Role Authority</td>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 700; color: #1e293b;">${data.role}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #475569;">Assigned Scope</td>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; color: #0f172a;">${data.assignedScopeDescription}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #475569;">Login Email</td>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-family: 'JetBrains Mono', monospace; color: #2563eb;">${data.toEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #475569;">Initial Password</td>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #0f172a; background-color: #f1f5f9;">${data.initialPassword}</td>
            </tr>
          </table>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${data.loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Sign In to RetailHub</a>
          </div>

          <div style="font-size: 13px; color: #475569; background-color: #f0fdf4; padding: 14px; border-radius: 8px; border-left: 4px solid #16a34a; margin-top: 24px;">
            <strong style="color: #15803d;">Security Tip:</strong> For your account security, we recommend changing your password from your top-right profile avatar menu after signing in.
          </div>

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            This is an automated operational notification from RetailHub Enterprise. Please do not reply directly to this email.
          </div>
        </div>
      `,
    };

    try {
      if (!process.env.SMTP_USER) {
        this.logger.warn(`[DEV SIMULATION] SMTP not configured. Simulated Welcome Email to ${data.toEmail}:`);
        this.logger.warn(`  -> Role: ${data.role} | Scope: ${data.assignedScopeDescription}`);
        this.logger.warn(`  -> Initial Password: ${data.initialPassword}`);
        return;
      }
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Credentials email sent to ${data.toEmail}. MessageId: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${data.toEmail}:`, err);
    }
  }

  async sendPasswordResetNotification(data: PasswordResetEmailData): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM || '"RetailHub System" <noreply@retailhub.com>',
      to: data.toEmail,
      subject: 'RetailHub — Your Password Has Been Reset',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">Password Reset Notification</h2>
          <p style="color: #334155; font-size: 14px;">Hello <strong>${data.fullName}</strong>,</p>
          <p style="color: #475569; font-size: 14px;">An Administrator has reset your password for RetailHub Enterprise. Your new temporary credentials are:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <tr>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #475569; width: 35%;">Login Email</td>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-family: monospace;">${data.toEmail}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #475569;">New Temporary Password</td>
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 14px; font-weight: 600; color: #0f172a;">${data.newPassword}</td>
            </tr>
          </table>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Sign In Now</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">If you did not request this reset, please contact your System Administrator immediately.</p>
        </div>
      `,
    };

    try {
      if (!process.env.SMTP_USER) {
        this.logger.warn(`[DEV SIMULATION] Password reset email to ${data.toEmail}. New password: ${data.newPassword}`);
        return;
      }
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${data.toEmail}. MessageId: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${data.toEmail}:`, err);
    }
  }
}
