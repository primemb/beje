import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationRepository } from './reservation.repository';
import { RabbitClientService } from '@beje/rabbit-client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';
import { ReservationStatus } from '@beje/common';
import { of } from 'rxjs';

describe('ReservationService', () => {
  let service: ReservationService;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let rabbitClientService: jest.Mocked<RabbitClientService>;

  const mockReservation = {
    id: 'test-id',
    startTime: '10:00',
    endTime: '10:15',
    email: 'test@example.com',
    phone: '+1234567890',
    pushNotificationKey: 'push-key',
    status: ReservationStatus.QUEUED,
    reservationDate: new Date('2024-01-01'),
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
    const mockReservationRepository = {
      markNotificationSent: jest.fn(),
      findUpcomingReservations: jest.fn(),
      findByStartTimeAndDate: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const mockRabbitClient = {
      send: jest.fn().mockReturnValue(of({ success: true })),
    };

    const mockRabbitClientService = {
      notifClient: mockRabbitClient,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: ReservationRepository,
          useValue: mockReservationRepository,
        },
        {
          provide: RabbitClientService,
          useValue: mockRabbitClientService,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    reservationRepository = module.get(ReservationRepository);
    rabbitClientService = module.get(RabbitClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markNotificationSent', () => {
    it('should mark notification as sent', async () => {
      const id = 'test-id';
      const notificationType = 'email';

      await service.markNotificationSent(id, notificationType);

      expect(reservationRepository.markNotificationSent).toHaveBeenCalledWith(
        id,
        notificationType
      );
    });
  });

  describe('getUpcomingReservations', () => {
    it('should return upcoming reservations', async () => {
      const minutes = 5;
      const expectedReservations = [mockReservation];
      reservationRepository.findUpcomingReservations.mockResolvedValue(
        expectedReservations
      );

      const result = await service.getUpcomingReservations(minutes);

      expect(result).toEqual(expectedReservations);
      expect(
        reservationRepository.findUpcomingReservations
      ).toHaveBeenCalledWith(minutes);
    });
  });

  describe('createReservation', () => {
    const createDto: CreateReservationDto = {
      startTime: '10:00',
      email: 'test@example.com',
      phone: '+1234567890',
      pushNotificationKey: 'push-key',
      receiveEmail: true,
      receiveSmsNotification: true,
      receivePushNotification: true,
    };

    it('should create a reservation successfully', async () => {
      reservationRepository.findByStartTimeAndDate.mockResolvedValue(null);
      reservationRepository.create.mockResolvedValue(mockReservation);

      const result = await service.createReservation(createDto);

      expect(result.status).toBe('success');
      expect(result.record).toBeDefined();
      expect(reservationRepository.create).toHaveBeenCalledWith({
        ...createDto,
        endTime: '10:15',
        reservationDate: expect.any(Date),
        status: ReservationStatus.QUEUED,
      });
      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.email',
        expect.any(Object)
      );
    });

    it('should throw BadRequestException for invalid minutes', async () => {
      const invalidDto = { ...createDto, startTime: '10:05' };

      const result = await service.createReservation(invalidDto);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Minutes must be 00, 15, 30, or 45');
    });

    it('should throw ConflictException if time slot is already reserved', async () => {
      reservationRepository.findByStartTimeAndDate.mockResolvedValue(
        mockReservation
      );

      const result = await service.createReservation(createDto);

      expect(result.status).toBe('error');
      expect(result.message).toBe('This time slot is already reserved');
    });

    it('should handle unexpected errors', async () => {
      reservationRepository.findByStartTimeAndDate.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.createReservation(createDto);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Database error');
    });
  });

  describe('getReservation', () => {
    it('should return a reservation when found', async () => {
      reservationRepository.findById.mockResolvedValue(mockReservation);

      const result = await service.getReservation('test-id');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockReservation.id);
      expect(reservationRepository.findById).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException when reservation not found', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(service.getReservation('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getAllReservations', () => {
    it('should return all reservations', async () => {
      const reservations = [mockReservation];
      reservationRepository.findAll.mockResolvedValue(reservations);

      const result = await service.getAllReservations();

      expect(result.records).toHaveLength(1);
      expect(result.records[0].id).toBe(mockReservation.id);
      expect(reservationRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('updateReservation', () => {
    const updateData = { startTime: '11:00' };

    it('should update a reservation successfully', async () => {
      const updatedReservation = {
        ...mockReservation,
        ...updateData,
        endTime: '11:15',
      };
      reservationRepository.findById.mockResolvedValue(mockReservation);
      reservationRepository.findByStartTimeAndDate.mockResolvedValue(null);
      reservationRepository.update.mockResolvedValue(updatedReservation);

      const result = await service.updateReservation('test-id', updateData);

      expect(result.startTime).toBe('11:00');
      expect(reservationRepository.update).toHaveBeenCalledWith('test-id', {
        startTime: '11:00',
        endTime: '11:15',
      });
      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.email',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException when reservation not found', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateReservation('non-existent-id', updateData)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reservation status is not QUEUED', async () => {
      const nonQueuedReservation = {
        ...mockReservation,
        status: ReservationStatus.SUCCESSFUL,
      };
      reservationRepository.findById.mockResolvedValue(nonQueuedReservation);

      await expect(
        service.updateReservation('test-id', updateData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when new time slot is already reserved', async () => {
      const existingReservation = { ...mockReservation, id: 'other-id' };
      reservationRepository.findById.mockResolvedValue(mockReservation);
      reservationRepository.findByStartTimeAndDate.mockResolvedValue(
        existingReservation
      );

      await expect(
        service.updateReservation('test-id', updateData)
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to the same time slot (same reservation)', async () => {
      reservationRepository.findById.mockResolvedValue(mockReservation);
      reservationRepository.findByStartTimeAndDate.mockResolvedValue(
        mockReservation
      );
      reservationRepository.update.mockResolvedValue({
        ...mockReservation,
        ...updateData,
      });

      const result = await service.updateReservation('test-id', updateData);

      expect(result).toBeDefined();
      expect(reservationRepository.update).toHaveBeenCalled();
    });
  });

  describe('cancelReservation', () => {
    const cancelDto: CancelReservationDto = {
      reason: 'User requested cancellation',
    };

    it('should cancel a reservation successfully', async () => {
      const cancelledReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      };
      reservationRepository.findById.mockResolvedValue(mockReservation);
      reservationRepository.update.mockResolvedValue(cancelledReservation);

      const result = await service.cancelReservation('test-id', cancelDto);

      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(reservationRepository.update).toHaveBeenCalledWith('test-id', {
        status: ReservationStatus.CANCELLED,
      });
      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.email',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException when reservation not found', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(
        service.cancelReservation('non-existent-id', cancelDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reservation status is not QUEUED', async () => {
      const nonQueuedReservation = {
        ...mockReservation,
        status: ReservationStatus.SUCCESSFUL,
      };
      reservationRepository.findById.mockResolvedValue(nonQueuedReservation);

      await expect(
        service.cancelReservation('test-id', cancelDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectReservation', () => {
    const rejectDto: RejectReservationDto = {
      reason: 'Admin rejected the reservation',
    };

    it('should reject a reservation successfully', async () => {
      const rejectedReservation = {
        ...mockReservation,
        status: ReservationStatus.REJECTED,
      };
      reservationRepository.findById.mockResolvedValue(mockReservation);
      reservationRepository.update.mockResolvedValue(rejectedReservation);

      const result = await service.rejectReservation('test-id', rejectDto);

      expect(result.status).toBe(ReservationStatus.REJECTED);
      expect(reservationRepository.update).toHaveBeenCalledWith('test-id', {
        status: ReservationStatus.REJECTED,
      });
      expect(rabbitClientService.notifClient.send).toHaveBeenCalledWith(
        'send.email',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException when reservation not found', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(
        service.rejectReservation('non-existent-id', rejectDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reservation status is not QUEUED', async () => {
      const nonQueuedReservation = {
        ...mockReservation,
        status: ReservationStatus.SUCCESSFUL,
      };
      reservationRepository.findById.mockResolvedValue(nonQueuedReservation);

      await expect(
        service.rejectReservation('test-id', rejectDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapToResponse', () => {
    it('should map reservation to response format', async () => {
      reservationRepository.findById.mockResolvedValue(mockReservation);

      const result = await service.getReservation('test-id');

      expect(result).toEqual({
        id: mockReservation.id,
        startTime: mockReservation.startTime,
        endTime: mockReservation.endTime,
        email: mockReservation.email,
        phone: mockReservation.phone,
        pushNotificationKey: mockReservation.pushNotificationKey,
        status: mockReservation.status,
        createdTime: mockReservation.createdTime.toISOString(),
        updatedTime: mockReservation.updatedTime.toISOString(),
        receiveEmail: mockReservation.receiveEmail,
        receiveSmsNotification: mockReservation.receiveSmsNotification,
        receivePushNotification: mockReservation.receivePushNotification,
      });
    });
  });
});
