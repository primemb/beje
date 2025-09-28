import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { ReservationService } from '../reservation/reservation.service';
import { RabbitClientService } from '@beje/rabbit-client';
import { ReservationStatus } from '@beje/common';
import { subMinutes } from 'date-fns';
import { of } from 'rxjs';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let reservationService: jest.Mocked<ReservationService>;
  let rabbitClientService: jest.Mocked<RabbitClientService>;

  const mockReservation = {
    id: 'test-id',
    startTime: '10:00',
    endTime: '10:15',
    email: 'test@example.com',
    phone: '+1234567890',
    pushNotificationKey: 'push-key',
    status: ReservationStatus.QUEUED,
    reservationDate: new Date(),
    createdTime: new Date('2024-01-01T09:00:00Z'),
    updatedTime: new Date('2024-01-01T09:00:00Z'),
    receiveEmail: true,
    receiveSmsNotification: true,
    receivePushNotification: true,
    emailSent: false,
    smsSent: false,
    pushNotificationSent: false,
  };

  beforeEach(async () => {
    const mockReservationService = {
      getUpcomingReservations: jest.fn(),
      updateReservation: jest.fn(),
      markNotificationSent: jest.fn(),
    };

    const mockRabbitClient = {
      send: jest.fn().mockReturnValue(of({})),
    };

    const mockRabbitClientService = {
      notifClient: mockRabbitClient,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
        {
          provide: RabbitClientService,
          useValue: mockRabbitClientService,
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    reservationService = module.get(ReservationService);
    rabbitClientService = module.get(RabbitClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleNotifications', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should process upcoming reservations', async () => {
      const reservations = [mockReservation];
      reservationService.getUpcomingReservations.mockResolvedValue(
        reservations
      );

      await service.handleNotifications();

      expect(reservationService.getUpcomingReservations).toHaveBeenCalledWith(
        5
      );
    });

    it('should skip reservations that are not QUEUED', async () => {
      const completedReservation = {
        ...mockReservation,
        status: ReservationStatus.SUCCESSFUL,
      };
      reservationService.getUpcomingReservations.mockResolvedValue([
        completedReservation,
      ]);

      await service.handleNotifications();

      expect(reservationService.updateReservation).not.toHaveBeenCalled();
      expect(rabbitClientService.notifClient.send).not.toHaveBeenCalled();
    });

    it('should mark reservation as SUCCESSFUL when time has passed', async () => {
      // Set current time to be after the reservation time
      const now = new Date('2024-01-01T10:30:00Z');
      jest.setSystemTime(now);

      const pastReservation = {
        ...mockReservation,
        reservationDate: new Date('2024-01-01'),
        startTime: '10:00', // This is in the past relative to current time (10:30)
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        pastReservation,
      ]);

      await service.handleNotifications();

      expect(reservationService.updateReservation).toHaveBeenCalledWith(
        pastReservation.id,
        {
          status: ReservationStatus.SUCCESSFUL,
        }
      );
    });

    it('should send email notification 10 minutes before reservation', async () => {
      // Set current time to be exactly 10 minutes before reservation
      const reservationTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = subMinutes(reservationTime, 10);
      jest.setSystemTime(currentTime);

      const reservation = {
        ...mockReservation,
        reservationDate: new Date('2024-01-01'),
        startTime: '10:00',
        receiveEmail: true,
        emailSent: false,
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        reservation,
      ]);

      await service.handleNotifications();

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.email',
        {
          type: 'email',
          to: reservation.email,
          subject: 'Upcoming Call Reservation Reminder',
          text: expect.stringContaining('scheduled call in 10 minutes'),
        }
      );
      expect(reservationService.markNotificationSent).toHaveBeenCalledWith(
        reservation.id,
        'email'
      );
    });

    it('should send SMS notification 5 minutes before reservation', async () => {
      // Set current time to be exactly 5 minutes before reservation
      const reservationTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = subMinutes(reservationTime, 5);
      jest.setSystemTime(currentTime);

      const reservation = {
        ...mockReservation,
        reservationDate: new Date('2024-01-01'),
        startTime: '10:00',
        receiveSmsNotification: true,
        smsSent: false,
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        reservation,
      ]);

      await service.handleNotifications();

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.sms',
        {
          type: 'sms',
          to: reservation.phone,
          text: expect.stringContaining('call is scheduled in 5 minutes'),
        }
      );
      expect(reservationService.markNotificationSent).toHaveBeenCalledWith(
        reservation.id,
        'sms'
      );
    });

    it('should send push notification 1 minute before reservation', async () => {
      // Set current time to be exactly 1 minute before reservation
      const reservationTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = subMinutes(reservationTime, 1);
      jest.setSystemTime(currentTime);

      const reservation = {
        ...mockReservation,
        reservationDate: new Date('2024-01-01'),
        startTime: '10:00',
        receivePushNotification: true,
        pushNotificationSent: false,
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        reservation,
      ]);

      await service.handleNotifications();

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.push',
        {
          type: 'push',
          to: reservation.pushNotificationKey,
          text: expect.stringContaining('call starts in 1 minute'),
        }
      );
      expect(reservationService.markNotificationSent).toHaveBeenCalledWith(
        reservation.id,
        'push'
      );
    });

    it('should not send notifications if already sent', async () => {
      const reservation = {
        ...mockReservation,
        reservationDate: new Date('2024-01-01'),
        startTime: '10:00',
        receiveEmail: true,
        emailSent: true, // Already sent
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        reservation,
      ]);

      await service.handleNotifications();

      expect(rabbitClientService.notifClient.send).not.toHaveBeenCalled();
      expect(reservationService.markNotificationSent).not.toHaveBeenCalled();
    });

    it('should not send notifications if user opted out', async () => {
      const reservation = {
        ...mockReservation,
        reservationDate: new Date('2024-01-01'),
        startTime: '10:00',
        receiveEmail: false, // User opted out
        emailSent: false,
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        reservation,
      ]);

      await service.handleNotifications();

      expect(rabbitClientService.notifClient.send).not.toHaveBeenCalled();
      expect(reservationService.markNotificationSent).not.toHaveBeenCalled();
    });

    it('should handle multiple reservations with different notification timings', async () => {
      const currentTime = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(currentTime);

      const emailReservation = {
        ...mockReservation,
        id: 'email-res',
        reservationDate: new Date('2024-01-01'),
        startTime: '10:10', // 10 minutes from now
        receiveEmail: true,
        emailSent: false,
        receiveSmsNotification: false,
        receivePushNotification: false,
      };

      const smsReservation = {
        ...mockReservation,
        id: 'sms-res',
        reservationDate: new Date('2024-01-01'),
        startTime: '10:05', // 5 minutes from now
        receiveEmail: false,
        receiveSmsNotification: true,
        smsSent: false,
        receivePushNotification: false,
      };

      reservationService.getUpcomingReservations.mockResolvedValue([
        emailReservation,
        smsReservation,
      ]);

      await service.handleNotifications();

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledTimes(2);
      expect(reservationService.markNotificationSent).toHaveBeenCalledTimes(2);
    });
  });

  describe('isWithinTimeRange', () => {
    it('should return true when current time is within notification window', () => {
      const reservationTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = subMinutes(reservationTime, 10);

      // Use reflection to access private method for testing
      const result = (service as any).isWithinTimeRange(
        reservationTime,
        currentTime,
        10
      );

      expect(result).toBe(true);
    });

    it('should return false when current time is before notification window', () => {
      const reservationTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = subMinutes(reservationTime, 15); // Too early

      const result = (service as any).isWithinTimeRange(
        reservationTime,
        currentTime,
        10
      );

      expect(result).toBe(false);
    });

    it('should return false when current time is after notification window', () => {
      const reservationTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = subMinutes(reservationTime, 9); // Too late (past the 1-minute window)

      const result = (service as any).isWithinTimeRange(
        reservationTime,
        currentTime,
        10
      );

      expect(result).toBe(false);
    });
  });

  describe('sendEmailNotification', () => {
    it('should send email with correct content', async () => {
      const reservation = {
        ...mockReservation,
        startTime: '10:00',
        reservationDate: new Date('2024-01-01'),
      };

      await (service as any).sendEmailNotification(reservation);

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.email',
        {
          type: 'email',
          to: reservation.email,
          subject: 'Upcoming Call Reservation Reminder',
          text: expect.stringContaining('scheduled call in 10 minutes'),
        }
      );
    });
  });

  describe('sendSmsNotification', () => {
    it('should send SMS with correct content', async () => {
      const reservation = {
        ...mockReservation,
        startTime: '10:00',
        phone: '+1234567890',
      };

      await (service as any).sendSmsNotification(reservation);

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.sms',
        {
          type: 'sms',
          to: reservation.phone,
          text: expect.stringContaining(
            'call is scheduled in 5 minutes at 10:00'
          ),
        }
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should send push notification with correct content', async () => {
      const reservation = {
        ...mockReservation,
        startTime: '10:00',
        pushNotificationKey: 'push-key-123',
      };

      await (service as any).sendPushNotification(reservation);

      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.push',
        {
          type: 'push',
          to: reservation.pushNotificationKey,
          text: expect.stringContaining('call starts in 1 minute at 10:00'),
        }
      );
    });
  });
});
