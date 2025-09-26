import { Injectable, Logger } from '@nestjs/common';
import { EmailOptions } from '@beje/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendEmail(options: EmailOptions): Promise<void> {
    this.logger.log(`Sending email to ${options.to}`);
    console.log(
      `[EMAIL] To: ${options.to}, Subject: ${options.subject}, Content: ${
        options.text || options.html
      }`
    );
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
  }

  async sendSms(receiver: string, content: string): Promise<void> {
    this.logger.log(`Sending SMS to ${receiver}`);
    console.log(`[SMS] To: ${receiver}, Content: ${content}`);
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
  }

  async sendPushNotification(key: string, content: string): Promise<void> {
    this.logger.log(`Sending push notification to ${key}`);
    console.log(`[PUSH] Key: ${key}, Content: ${content}`);
    // TODO: Integrate with actual push notification service (FCM, OneSignal, etc.)
  }

  async sendAdminNotification(subject: string, content: string): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@beije.com';
    await this.sendEmail({
      to: adminEmail,
      subject: subject,
      text: content,
    });
  }
}
