import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Notification } from '../../../entities/notification.entity';
import { NotificationType } from '../../../entities/notification.entity';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP configuration missing, email notifications disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log('Email notification service initialized');
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    to: string,
    notification: Notification,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized, skipping email');
      return false;
    }

    try {
      const mailOptions = this.buildEmailContent(to, notification);
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email notification sent to ${to} for notification ${notification.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email notification to ${to}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Build email content based on notification type
   */
  private buildEmailContent(
    to: string,
    notification: Notification,
  ): nodemailer.SendMailOptions {
    const subject = this.getEmailSubject(notification);
    const html = this.getEmailHtml(notification);

    return {
      from: this.configService.get<string>('SMTP_USER') || 'noreply@carmarket.com',
      to,
      subject,
      html,
    };
  }

  /**
   * Get email subject based on notification type
   */
  private getEmailSubject(notification: Notification): string {
    switch (notification.type) {
      case NotificationType.LISTING_APPROVED:
        return `✅ Your listing has been approved - ${notification.relatedListing?.title || 'CarMarket'}`;
      case NotificationType.LISTING_REJECTED:
        return `❌ Your listing was rejected - ${notification.relatedListing?.title || 'CarMarket'}`;
      case NotificationType.NEW_INQUIRY:
        return `🔔 New inquiry about your listing - ${notification.relatedListing?.title || 'CarMarket'}`;
      case NotificationType.LISTING_SOLD:
        return `🎉 Congratulations! Your listing has been sold`;
      default:
        return notification.title;
    }
  }

  /**
   * Get email HTML content
   */
  private getEmailHtml(notification: Notification): string {
    const listingLink = notification.relatedListingId
      ? `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/cars/${notification.relatedListingId}`
      : '#';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">${notification.title}</h1>
            <p style="font-size: 16px; margin-bottom: 0;">${notification.message}</p>
          </div>
          
          ${notification.relatedListingId ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${listingLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Listing
              </a>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>This is an automated notification from CarMarket.</p>
            <p>You can manage your notification preferences in your account settings.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.transporter !== null;
  }
}

