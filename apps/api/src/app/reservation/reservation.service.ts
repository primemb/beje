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
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';
import {
  CreateReservationResponse,
  GetSingleReservationResponse,
  GetReservationsResponse,
  ReservationStatus,
  NotificationOptions,
} from '@beje/common';
import { parse, format, addMinutes } from 'date-fns';
import { Reservation } from './entities/reservation.entity';
import { DeepPartial } from 'typeorm';
import { RabbitClientService } from '@beje/rabbit-client';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly rabbitClientService: RabbitClientService
  ) {}

  async markNotificationSent(
    id: string,
    notificationType: 'email' | 'sms' | 'push'
  ): Promise<void> {
    await this.reservationRepository.markNotificationSent(id, notificationType);
  }

  async getUpcomingReservations(minutes: number): Promise<Reservation[]> {
    return this.reservationRepository.findUpcomingReservations(minutes);
  }

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

      // Send email notification for reservation creation
      this.rabbitClientService.notifClient
        .send<NotificationOptions>('send.email', {
          type: 'create',
          to: reservation.email,
          subject: 'Reservation Created',
          text: `Your reservation has been created for ${reservation.startTime}. Reservation ID: ${reservation.id}`,
          metadata: {
            reservation,
          },
        })
        .subscribe((result) => {
          this.logger.log(`Email notification sent: ${JSON.stringify(result)}`);
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
    dto: DeepPartial<Reservation>
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
    this.rabbitClientService.notifClient
      .send<NotificationOptions>('send.email', {
        type: 'update',
        to: updated.email,
        subject: 'Reservation Updated',
        text: `Your reservation has been updated. new start time: ${updated.startTime}`,
        metadata: {
          reservation: updated,
        },
      })
      .subscribe((result) => {
        this.logger.log(`Update notification sent: ${JSON.stringify(result)}`);
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
    this.rabbitClientService.notifClient
      .send<NotificationOptions>('send.email', {
        type: 'cancel',
        to: reservation.email,
        subject: 'Reservation Cancelled',
        text: `Your reservation has been cancelled. Reason: ${dto.reason}`,
        metadata: {
          reservation,
        },
      })
      .subscribe((result) => {
        this.logger.log(
          `Cancellation notification sent: ${JSON.stringify(result)}`
        );
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
    this.rabbitClientService.notifClient
      .send<NotificationOptions>('send.email', {
        type: 'reject',
        to: reservation.email,
        subject: 'Reservation Rejected',
        text: `We're sorry, but your reservation for ${reservation.startTime} has been rejected. Reason: ${dto.reason}`,
        metadata: {
          reservation,
        },
      })
      .subscribe((result) => {
        this.logger.log(
          `Rejection notification sent: ${JSON.stringify(result)}`
        );
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
