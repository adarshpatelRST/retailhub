import nodemailer from "nodemailer";
import { config } from "../config";
import { logger } from "../utils/logger";

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

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass,
      },
    });
  }

  async sendWelcomeCredentials(data: WelcomeEmailData): Promise<void> {
    if (!config.mail.user) {
      logger.warn(`[DEV FALLBACK] Simulated Welcome Email to ${data.toEmail}:`);
      logger.warn(`  -> Role: ${data.role} | Scope: ${data.assignedScopeDescription}`);
      logger.warn(`  -> Temporary Password: ${data.initialPassword}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: config.mail.from,
        to: data.toEmail,
        subject: "Welcome to RetailHub — Your Account Credentials",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">Welcome to RetailHub</h2>
            <p>Hello <strong>${data.fullName}</strong>,</p>
            <p>Your enterprise operational account has been created with the following scope:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Role</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${data.role}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Scope</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${data.assignedScopeDescription}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${data.toEmail}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Initial Password</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${data.initialPassword}</td></tr>
            </table>
            <p><a href="${data.loginUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Sign In Now</a></p>
          </div>
        `,
      });
      logger.info(`Credentials email sent to ${data.toEmail} [${info.messageId}]`);
    } catch (err) {
      logger.error(`Failed to send email to ${data.toEmail}:`, err);
    }
  }

  async sendPasswordResetNotification(data: PasswordResetEmailData): Promise<void> {
    if (!config.mail.user) {
      logger.warn(`[DEV FALLBACK] Password reset email to ${data.toEmail}. Password: ${data.newPassword}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.mail.from,
        to: data.toEmail,
        subject: "RetailHub — Password Reset Notification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3>Password Reset Notification</h3>
            <p>Hello <strong>${data.fullName}</strong>,</p>
            <p>Your password has been reset by an Administrator. New temporary password: <code>${data.newPassword}</code></p>
            <p><a href="${data.loginUrl}">Click here to sign in</a></p>
          </div>
        `,
      });
    } catch (err) {
      logger.error(`Failed to send password reset email to ${data.toEmail}:`, err);
    }
  }

  async sendPasswordResetOtp(toEmail: string, fullName: string, otp: string): Promise<void> {
    if (!config.mail.user) {
      logger.warn(`[DEV FALLBACK] Password Reset OTP for ${toEmail} (${fullName}):`);
      logger.warn(`  -> 6-Digit OTP: ${otp} (Valid for 10 minutes)`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.mail.from,
        to: toEmail,
        subject: "RetailHub Enterprise — Password Reset Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #334155;">Hello <strong>${fullName}</strong>,</p>
            <p style="color: #334155;">We received a request to reset your RetailHub Enterprise account password. Use the verification code below to proceed:</p>
            <div style="margin: 24px 0; padding: 16px; background-color: #f1f5f9; border-radius: 8px; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This verification code will expire in 10 minutes. If you did not request a password reset, please contact your security administrator immediately.</p>
          </div>
        `,
      });
      logger.info(`Password reset OTP dispatched to ${toEmail}`);
    } catch (err) {
      logger.error(`Failed to send OTP email to ${toEmail}:`, err);
    }
  }

  async sendPasswordChangedConfirmation(toEmail: string, fullName: string): Promise<void> {
    if (!config.mail.user) {
      logger.warn(`[DEV FALLBACK] Password Changed Confirmation dispatched to ${toEmail} (${fullName}).`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.mail.from,
        to: toEmail,
        subject: "RetailHub Enterprise — Your Password Has Been Changed",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Password Updated Successfully</h2>
            <p style="color: #334155;">Hello <strong>${fullName}</strong>,</p>
            <p style="color: #334155;">Your RetailHub account password was successfully updated via OTP verification.</p>
            <p style="color: #64748b; font-size: 13px;">If you did not perform this action, please alert enterprise security immediately.</p>
          </div>
        `,
      });
      logger.info(`Password changed confirmation dispatched to ${toEmail}`);
    } catch (err) {
      logger.error(`Failed to send password changed confirmation to ${toEmail}:`, err);
    }
  }
}

export const mailService = new MailService();
