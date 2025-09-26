import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import type { EmailOptions, NotificationMessage } from '@beje/common';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('send.email')
  async sendEmail(
    @Payload() emailOptions: EmailOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received email request for ${emailOptions.to}`);
      await this.notificationService.sendEmail(emailOptions);
      this.logger.log(`Email sent successfully to ${emailOptions.to}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return { success: false, message: 'Failed to send email' };
    }
  }

  @MessagePattern('send.sms')
  async sendSms(
    @Payload() data: { receiver: string; content: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received SMS request for ${data.receiver}`);
      await this.notificationService.sendSms(data.receiver, data.content);
      this.logger.log(`SMS sent successfully to ${data.receiver}`);
      return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return { success: false, message: 'Failed to send SMS' };
    }
  }

  @MessagePattern('send.push')
  async sendPushNotification(
    @Payload() data: { key: string; content: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received push notification request for ${data.key}`);
      await this.notificationService.sendPushNotification(
        data.key,
        data.content
      );
      this.logger.log(`Push notification sent successfully to ${data.key}`);
      return { success: true, message: 'Push notification sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      return { success: false, message: 'Failed to send push notification' };
    }
  }

  @MessagePattern('send.admin')
  async sendAdminNotification(
    @Payload() data: { subject: string; content: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received admin notification request`);
      await this.notificationService.sendAdminNotification(
        data.subject,
        data.content
      );
      this.logger.log(`Admin notification sent successfully`);
      return { success: true, message: 'Admin notification sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
      return { success: false, message: 'Failed to send admin notification' };
    }
  }

  @MessagePattern('send.batch')
  async sendBatchNotifications(
    @Payload() data: { notifications: NotificationMessage[] }
  ): Promise<{ success: boolean; message: string; results: any[] }> {
    this.logger.log(
      `Received batch notification request with ${data.notifications.length} notifications`
    );
    const results = [];

    for (const notification of data.notifications) {
      try {
        switch (notification.type) {
          case 'email':
            await this.notificationService.sendEmail({
              to: notification.recipient,
              subject: notification.metadata?.subject || 'Notification',
              text: notification.content,
            });
            break;
          case 'sms':
            await this.notificationService.sendSms(
              notification.recipient,
              notification.content
            );
            break;
          case 'push':
            await this.notificationService.sendPushNotification(
              notification.recipient,
              notification.content
            );
            break;
        }
        results.push({
          type: notification.type,
          recipient: notification.recipient,
          success: true,
        });
        this.logger.log(
          `${notification.type} notification sent to ${notification.recipient}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to send ${notification.type} notification to ${notification.recipient}: ${error.message}`
        );
        results.push({
          type: notification.type,
          recipient: notification.recipient,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    this.logger.log(
      `Batch processing completed: ${successCount}/${totalCount} notifications sent successfully`
    );

    return {
      success: successCount === totalCount,
      message: `${successCount}/${totalCount} notifications sent successfully`,
      results,
    };
  }

  @MessagePattern('notification.health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    this.logger.log('Health check requested');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
