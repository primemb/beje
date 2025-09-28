import { Injectable, Logger } from '@nestjs/common';
import { ReservationService } from '../reservation/reservation.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationOptions, ReservationStatus } from '@beje/common';
import { addMinutes, format, isBefore } from 'date-fns';
import { RabbitClientService } from '@beje/rabbit-client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly reservationService: ReservationService,
    private readonly rabbitClientService: RabbitClientService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleNotifications() {
    this.logger.debug('Running notification scheduler');

    const now = new Date();
    const reservations = await this.reservationService.getUpcomingReservations(
      5
    );

    for (const reservation of reservations) {
      if (reservation.status !== ReservationStatus.QUEUED) {
        continue;
      }

      // Combine reservation date and time
      const [hours, minutes] = reservation.startTime.split(':').map(Number);
      const reservationDateTime = new Date(reservation.reservationDate);
      reservationDateTime.setHours(hours, minutes, 0, 0);

      // Check if reservation time has passed
      if (isBefore(reservationDateTime, now)) {
        await this.reservationService.updateReservation(reservation.id, {
          status: ReservationStatus.SUCCESSFUL,
        });
        continue;
      }

      // Email notification - 10 minutes before
      if (
        reservation.receiveEmail &&
        !reservation.emailSent &&
        this.isWithinTimeRange(reservationDateTime, now, 10)
      ) {
        await this.sendEmailNotification(reservation);
        await this.reservationService.markNotificationSent(
          reservation.id,
          'email'
        );
      }

      // SMS notification - 5 minutes before
      if (
        reservation.receiveSmsNotification &&
        !reservation.smsSent &&
        this.isWithinTimeRange(reservationDateTime, now, 5)
      ) {
        await this.sendSmsNotification(reservation);
        await this.reservationService.markNotificationSent(
          reservation.id,
          'sms'
        );
      }

      // Push notification - 1 minute before
      if (
        reservation.receivePushNotification &&
        !reservation.pushNotificationSent &&
        this.isWithinTimeRange(reservationDateTime, now, 1)
      ) {
        await this.sendPushNotification(reservation);
        await this.reservationService.markNotificationSent(
          reservation.id,
          'push'
        );
      }
    }
  }

  private isWithinTimeRange(
    reservationTime: Date,
    currentTime: Date,
    minutesBefore: number
  ): boolean {
    const notificationTime = addMinutes(reservationTime, -minutesBefore);
    const minuteLater = addMinutes(notificationTime, 1);
    return currentTime >= notificationTime && currentTime < minuteLater;
  }

  private async sendEmailNotification(reservation: any): Promise<void> {
    const subject = 'Upcoming Call Reservation Reminder';
    const content = `
      Dear Customer,
      
      This is a reminder that you have a scheduled call in 10 minutes.
      
      Reservation Details:
      - Time: ${reservation.startTime}
      - Date: ${format(reservation.reservationDate, 'yyyy-MM-dd')}
      
      Please be ready for the call.
      
      Best regards,
      Beije Support Team
    `;

    this.rabbitClientService.notifClient.send<NotificationOptions>(
      'send.email',
      {
        type: 'email',
        to: reservation.email,
        subject,
        text: content,
      }
    );
  }

  private async sendSmsNotification(reservation: any): Promise<void> {
    const content = `Reminder: Your call is scheduled in 5 minutes at ${reservation.startTime}. Be ready! - Beije Support`;
    this.rabbitClientService.notifClient.send<NotificationOptions>('send.sms', {
      type: 'sms',
      to: reservation.phone,
      text: content,
    });
  }

  private async sendPushNotification(reservation: any): Promise<void> {
    const content = `Your call starts in 1 minute at ${reservation.startTime}!`;
    this.rabbitClientService.notifClient.send<NotificationOptions>(
      'send.push',
      {
        type: 'push',
        to: reservation.pushNotificationKey,
        text: content,
      }
    );
  }
}
