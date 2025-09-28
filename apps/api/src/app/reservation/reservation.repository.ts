import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from '@beje/common';

@Injectable()
export class ReservationRepository {
  constructor(
    @InjectRepository(Reservation)
    private readonly repository: Repository<Reservation>
  ) {}

  async create(reservationData: Partial<Reservation>): Promise<Reservation> {
    const reservation = this.repository.create(reservationData);
    return this.repository.save(reservation);
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(): Promise<Reservation[]> {
    return this.repository.find({ order: { createdTime: 'DESC' } });
  }

  async findByStartTimeAndDate(
    startTime: string,
    date: Date
  ): Promise<Reservation | null> {
    return this.repository.findOne({
      where: {
        startTime,
        reservationDate: date,
        status: Not(ReservationStatus.CANCELLED),
      },
    });
  }

  async findUpcomingReservations(minutes: number): Promise<Reservation[]> {
    const now = new Date();
    const future = new Date(now.getTime() + minutes * 60000);

    return this.repository.find({
      where: {
        status: ReservationStatus.QUEUED,
        createdTime: Between(now, future),
      },
    });
  }

  async update(
    id: string,
    updateData: Partial<Reservation>
  ): Promise<Reservation | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async markNotificationSent(
    id: string,
    notificationType: 'email' | 'sms' | 'push'
  ): Promise<void> {
    const field = {
      email: 'emailSent',
      sms: 'smsSent',
      push: 'pushNotificationSent',
    }[notificationType];

    await this.repository.update(id, { [field]: true });
  }
}
