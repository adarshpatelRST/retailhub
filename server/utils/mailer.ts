import nodemailer from "nodemailer";
import { logger } from "./logger";

class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user, pass },
      });
      logger.info(`[MailService] Initialized SMTP transport with host: ${host}`);
    } else {
      // Local dev fallback transport
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      logger.info("[MailService] No external SMTP credentials detected. Using dev mail dispatcher with console logger.");
    }
  }

  async sendPasswordResetOtp(toEmail: string, fullName: string, otp: string): Promise<boolean> {
    const subject = "RetailHub Enterprise — Password Reset Verification Code";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 20px; font-weight: bold;">RetailHub Enterprise</h2>
        </div>
        <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">We received a request to reset your RetailHub account password. Use the verification code below to verify your identity:</p>
        
        <div style="background-color: #f1f5f9; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">${otp}</span>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.4;">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or notify your system administrator immediately.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">RetailHub Enterprise Platform &bull; Automated Security Notification</p>
      </div>
    `;

    logger.info(`================================================================`);
    logger.info(`[EMAIL DISPATCH] Password Reset OTP for ${toEmail}: >>> ${otp} <<<`);
    logger.info(`================================================================`);

    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: process.env.MAIL_FROM || '"RetailHub Security" <security@retailhub.com>',
          to: toEmail,
          subject,
          html,
        });
      }
      return true;
    } catch (err: any) {
      logger.warn(`[MailService] Failed to send OTP email: ${err.message}`);
      return false;
    }
  }

  async sendPasswordChangedConfirmation(toEmail: string, fullName: string): Promise<boolean> {
    const subject = "RetailHub Enterprise — Your Password Has Been Changed";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
        <h2 style="color: #10b981; margin: 0 0 16px 0; font-size: 20px; font-weight: bold;">Password Changed Successfully</h2>
        <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your RetailHub account password was successfully updated on <strong>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</strong>.</p>
        <p style="font-size: 13px; color: #64748b; line-height: 1.4;">If you did not perform this change, please contact your Platform Administrator immediately to secure your account.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">RetailHub Enterprise Platform &bull; Automated Security Notification</p>
      </div>
    `;

    logger.info(`[EMAIL DISPATCH] Password change confirmation sent to ${toEmail}`);

    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: process.env.MAIL_FROM || '"RetailHub Security" <security@retailhub.com>',
          to: toEmail,
          subject,
          html,
        });
      }
      return true;
    } catch (err: any) {
      logger.warn(`[MailService] Failed to send confirmation email: ${err.message}`);
      return false;
    }
  }
}

export const mailService = new MailService();
