import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationOptions } from '@beje/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // Mock the logger
    loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ADMIN_EMAIL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should log email notification with all details', async () => {
      const options: NotificationOptions = {
        type: 'create',
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Test message content',
        metadata: {
          reservation: { id: 'test-id', startTime: '10:00' },
        },
      };

      await service.sendEmail(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[EMAIL] To: user@example.com, Subject: Test Subject, Content: Test message content ${JSON.stringify(
          options.metadata
        )}`
      );
    });

    it('should log email notification with HTML content when text is not provided', async () => {
      const options: NotificationOptions = {
        type: 'update',
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>HTML content</p>',
        metadata: {
          reservation: { id: 'test-id', startTime: '10:00' },
        },
      };

      await service.sendEmail(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[EMAIL] To: user@example.com, Subject: Test Subject, Content: <p>HTML content</p> ${JSON.stringify(
          options.metadata
        )}`
      );
    });

    it('should call sendAdminNotification', async () => {
      const sendAdminNotificationSpy = jest
        .spyOn(service, 'sendAdminNotification')
        .mockImplementation();

      const options: NotificationOptions = {
        type: 'create',
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        metadata: { reservation: { id: 'test-id' } },
      };

      await service.sendEmail(options);

      expect(sendAdminNotificationSpy).toHaveBeenCalledWith(options);
    });
  });

  describe('sendSms', () => {
    it('should log SMS notification', async () => {
      const receiver = '+1234567890';
      const content = 'Your appointment is in 5 minutes';

      await service.sendSms(receiver, content);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[SMS] To: ${receiver}, Content: ${content}`
      );
    });

    it('should handle empty content', async () => {
      const receiver = '+1234567890';
      const content = '';

      await service.sendSms(receiver, content);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[SMS] To: ${receiver}, Content: `
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should log push notification', async () => {
      const key = 'push-notification-key-123';
      const content = 'Your call starts in 1 minute!';

      await service.sendPushNotification(key, content);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[PUSH] Key: ${key}, Content: ${content}`
      );
    });

    it('should handle empty key', async () => {
      const key = '';
      const content = 'Test notification';

      await service.sendPushNotification(key, content);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[PUSH] Key: , Content: ${content}`
      );
    });
  });

  describe('sendAdminNotification', () => {
    it('should use default admin email when ADMIN_EMAIL env var is not set', async () => {
      const options: NotificationOptions = {
        type: 'create',
        to: 'user@example.com',
        subject: 'Original Subject',
        text: 'Original Text',
        metadata: {
          reservation: { id: 'reservation-123' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: admin@beije.com, Subject: New Reservation Created, Content: A new reservation has been created. Reservation ID: reservation-123`
      );
    });

    it('should use custom admin email from environment variable', async () => {
      process.env.ADMIN_EMAIL = 'custom-admin@company.com';

      const options: NotificationOptions = {
        type: 'update',
        to: 'user@example.com',
        subject: 'Original Subject',
        text: 'Original Text',
        metadata: {
          reservation: { id: 'reservation-456' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: custom-admin@company.com, Subject: Reservation Updated, Content: A reservation has been updated. Reservation ID: reservation-456`
      );
    });

    it('should handle create notification type', async () => {
      const options: NotificationOptions = {
        type: 'create',
        to: 'user@example.com',
        subject: 'User Subject',
        text: 'User Text',
        metadata: {
          reservation: { id: 'new-reservation' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: admin@beije.com, Subject: New Reservation Created, Content: A new reservation has been created. Reservation ID: new-reservation`
      );
    });

    it('should handle update notification type', async () => {
      const options: NotificationOptions = {
        type: 'update',
        to: 'user@example.com',
        subject: 'User Subject',
        text: 'User Text',
        metadata: {
          reservation: { id: 'updated-reservation' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: admin@beije.com, Subject: Reservation Updated, Content: A reservation has been updated. Reservation ID: updated-reservation`
      );
    });

    it('should handle cancel notification type', async () => {
      const options: NotificationOptions = {
        type: 'cancel',
        to: 'user@example.com',
        subject: 'User Subject',
        text: 'User Text',
        metadata: {
          reservation: { id: 'cancelled-reservation' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: admin@beije.com, Subject: Reservation Cancelled, Content: A reservation has been cancelled. Reservation ID: cancelled-reservation`
      );
    });

    it('should handle reject notification type', async () => {
      const options: NotificationOptions = {
        type: 'reject',
        to: 'user@example.com',
        subject: 'User Subject',
        text: 'User Text',
        metadata: {
          reservation: { id: 'rejected-reservation' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: admin@beije.com, Subject: Reservation Rejected, Content: A reservation has been rejected. Reservation ID: rejected-reservation`
      );
    });

    it('should handle notification type not in switch cases', async () => {
      const options: NotificationOptions = {
        type: 'email' as any, // Custom type not in switch
        to: 'user@example.com',
        subject: 'Custom Subject',
        text: 'Custom Text',
        metadata: {
          reservation: { id: 'custom-reservation' },
        },
      };

      await service.sendAdminNotification(options);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[ADMIN] To: admin@beije.com, Subject: Custom Subject, Content: Custom Text`
      );
    });
  });
});
