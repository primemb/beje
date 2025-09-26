import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ReservationRepository } from './reservation.repository';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';
import {
  CreateReservationResponse,
  GetSingleReservationResponse,
  GetReservationsResponse,
  ReservationStatus,
  NOTIFICATION_SERVICE,
  NotificationMessage,
} from '@beje/common';
import { parse, format, addMinutes } from 'date-fns';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationClient: ClientProxy
  ) {}

  async createReservation(
    dto: CreateReservationDto
  ): Promise<CreateReservationResponse> {
    try {
      // Validate start time
      const [_, minutes] = dto.startTime.split(':').map(Number);
      if (![0, 15, 30, 45].includes(minutes)) {
        throw new BadRequestException('Minutes must be 00, 15, 30, or 45');
      }

      // Check if time slot is available
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingReservation =
        await this.reservationRepository.findByStartTimeAndDate(
          dto.startTime,
          today
        );

      if (existingReservation) {
        throw new ConflictException('This time slot is already reserved');
      }

      // Calculate end time (15 minutes later)
      const startDateTime = parse(dto.startTime, 'HH:mm', new Date());
      const endDateTime = addMinutes(startDateTime, 15);
      const endTime = format(endDateTime, 'HH:mm');

      // Create reservation
      const reservation = await this.reservationRepository.create({
        ...dto,
        endTime,
        reservationDate: today,
        status: ReservationStatus.QUEUED,
      });

      this.logger.log(`Reservation created: ${reservation.id}`);

      this.notificationClient
        .send<NotificationMessage>('send.batch', {
          notifications: [
            {
              type: 'email',
              recipient: reservation.email,
              content: `Your reservation has been created for ${reservation.startTime}`,
              metadata: {
                subject: 'Reservation Created',
              },
            },
          ],
        })
        .subscribe((result) => {
          this.logger.log(`Notification sent: ${JSON.stringify(result)}`);
        });

      return {
        status: 'success',
        record: this.mapToResponse(reservation),
      };
    } catch (error) {
      this.logger.error(`Failed to create reservation: ${error.message}`);
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  async getReservation(id: string): Promise<GetSingleReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return this.mapToResponse(reservation);
  }

  async getAllReservations(): Promise<GetReservationsResponse> {
    const reservations = await this.reservationRepository.findAll();
    return {
      records: reservations.map((r) => this.mapToResponse(r)),
    };
  }

  async updateReservation(
    id: string,
    dto: UpdateReservationDto
  ): Promise<GetSingleReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.QUEUED) {
      throw new BadRequestException(
        'Can only update reservations with QUEUED status'
      );
    }

    // If changing start time, check availability
    if (dto.startTime && dto.startTime !== reservation.startTime) {
      const existingReservation =
        await this.reservationRepository.findByStartTimeAndDate(
          dto.startTime,
          reservation.reservationDate
        );

      if (existingReservation && existingReservation.id !== id) {
        throw new ConflictException('This time slot is already reserved');
      }

      // Recalculate end time
      const startDateTime = parse(dto.startTime, 'HH:mm', new Date());
      const endDateTime = addMinutes(startDateTime, 15);
      dto['endTime'] = format(endDateTime, 'HH:mm');
    }

    const updated = await this.reservationRepository.update(id, dto);

    // Notify user about update
    this.notificationClient.emit('reservation.updated', {
      reservationId: id,
      email: updated.email,
      phone: updated.phone,
      pushNotificationKey: updated.pushNotificationKey,
      changes: dto,
    });

    return this.mapToResponse(updated);
  }

  async cancelReservation(
    id: string,
    dto: CancelReservationDto
  ): Promise<GetSingleReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.QUEUED) {
      throw new BadRequestException(
        'Can only cancel reservations with QUEUED status'
      );
    }

    const updated = await this.reservationRepository.update(id, {
      status: ReservationStatus.CANCELLED,
    });

    // Notify admin about cancellation
    this.notificationClient.emit('reservation.cancelled', {
      reservationId: id,
      userEmail: reservation.email,
      userPhone: reservation.phone,
      startTime: reservation.startTime,
      reason: dto.reason || 'No reason provided',
    });

    this.logger.log(`Reservation cancelled: ${id}`);

    return this.mapToResponse(updated);
  }

  async rejectReservation(
    id: string,
    dto: RejectReservationDto
  ): Promise<GetSingleReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.QUEUED) {
      throw new BadRequestException(
        'Can only reject reservations with QUEUED status'
      );
    }

    const updated = await this.reservationRepository.update(id, {
      status: ReservationStatus.REJECTED,
    });

    // Notify user about rejection
    this.notificationClient.emit('reservation.rejected', {
      email: reservation.email,
      phone: reservation.phone,
      pushNotificationKey: reservation.pushNotificationKey,
      startTime: reservation.startTime,
      reason: dto.reason,
    });

    this.logger.log(`Reservation rejected: ${id}`);

    return this.mapToResponse(updated);
  }

  private mapToResponse(reservation: any): GetSingleReservationResponse {
    return {
      id: reservation.id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      email: reservation.email,
      phone: reservation.phone,
      pushNotificationKey: reservation.pushNotificationKey,
      status: reservation.status,
      createdTime: reservation.createdTime.toISOString(),
      updatedTime: reservation.updatedTime.toISOString(),
      receiveEmail: reservation.receiveEmail,
      receiveSmsNotification: reservation.receiveSmsNotification,
      receivePushNotification: reservation.receivePushNotification,
    };
  }
}
