import { ReservationStatus } from '@beje/common';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'time' })
  @Index()
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'date' })
  @Index()
  reservationDate: Date;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  pushNotificationKey: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.QUEUED,
  })
  status: ReservationStatus;

  @Column({ default: false })
  receiveEmail: boolean;

  @Column({ default: false })
  receiveSmsNotification: boolean;

  @Column({ default: false })
  receivePushNotification: boolean;

  @Column({ default: false })
  emailSent: boolean;

  @Column({ default: false })
  smsSent: boolean;

  @Column({ default: false })
  pushNotificationSent: boolean;

  @CreateDateColumn()
  createdTime: Date;

  @UpdateDateColumn()
  updatedTime: Date;
}
