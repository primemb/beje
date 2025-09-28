import { Injectable, Logger } from '@nestjs/common';
import { NotificationOptions } from '@beje/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendEmail(options: NotificationOptions): Promise<void> {
    this.sendAdminNotification(options);
    this.logger.log(
      `[EMAIL] To: ${options.to}, Subject: ${options.subject}, Content: ${
        options.text || options.html
      } ${JSON.stringify(options.metadata)}`
    );
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
  }

  async sendSms(receiver: string, content: string): Promise<void> {
    this.logger.log(`[SMS] To: ${receiver}, Content: ${content}`);
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
  }

  async sendPushNotification(key: string, content: string): Promise<void> {
    this.logger.log(`[PUSH] Key: ${key}, Content: ${content}`);
    // TODO: Integrate with actual push notification service (FCM, OneSignal, etc.)
  }

  async sendAdminNotification(
    notificationOptions: NotificationOptions
  ): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@beije.com';
    let subject = notificationOptions.subject;
    let text = notificationOptions.text;
    switch (notificationOptions.type) {
      case 'create':
        subject = 'New Reservation Created';
        text = `A new reservation has been created. Reservation ID: ${notificationOptions.metadata.reservation.id}`;
        break;
      case 'update':
        subject = 'Reservation Updated';
        text = `A reservation has been updated. Reservation ID: ${notificationOptions.metadata.reservation.id}`;
        break;
      case 'cancel':
        subject = 'Reservation Cancelled';
        text = `A reservation has been cancelled. Reservation ID: ${notificationOptions.metadata.reservation.id}`;
        break;
      case 'reject':
        subject = 'Reservation Rejected';
        text = `A reservation has been rejected. Reservation ID: ${notificationOptions.metadata.reservation.id}`;
        break;
    }
    this.logger.log(
      `[ADMIN] To: ${adminEmail}, Subject: ${subject}, Content: ${text}`
    );
  }
}
