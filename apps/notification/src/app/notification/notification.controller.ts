import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import type { NotificationOptions, NotificationMessage } from '@beje/common';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('send.email')
  async sendEmail(
    @Payload() emailOptions: NotificationOptions
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
    @Payload() data: NotificationOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received SMS request for ${data.to}`);
      await this.notificationService.sendSms(data.to, data.text);
      this.logger.log(`SMS sent successfully to ${data.to}`);
      return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return { success: false, message: 'Failed to send SMS' };
    }
  }

  @MessagePattern('send.push')
  async sendPushNotification(
    @Payload() data: NotificationOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received push notification request for ${data.to}`);
      await this.notificationService.sendPushNotification(data.to, data.text);
      this.logger.log(`Push notification sent successfully to ${data.to}`);
      return { success: true, message: 'Push notification sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      return { success: false, message: 'Failed to send push notification' };
    }
  }

  @MessagePattern('send.admin')
  async sendAdminNotification(
    @Payload() data: NotificationOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Received admin notification request`);
      await this.notificationService.sendAdminNotification(data);
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
              type: notification.notificationOptions.type,
              to: notification.notificationOptions.to,
              subject: notification.notificationOptions.subject,
              text: notification.notificationOptions.text,
              html: notification.notificationOptions.html,
              metadata: notification.notificationOptions.metadata,
            });
            break;
          case 'sms':
            await this.notificationService.sendSms(
              notification.notificationOptions.to,
              notification.notificationOptions.text
            );
            break;
          case 'push':
            await this.notificationService.sendPushNotification(
              notification.notificationOptions.to,
              notification.notificationOptions.text
            );
            break;
        }
        results.push({
          type: notification.type,
          recipient: notification.notificationOptions.to,
          success: true,
        });
        this.logger.log(
          `${notification.type} notification sent to ${notification.notificationOptions.to}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to send ${notification.type} notification to ${notification.notificationOptions.to}: ${error.message}`
        );
        results.push({
          type: notification.type,
          recipient: notification.notificationOptions.to,
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
