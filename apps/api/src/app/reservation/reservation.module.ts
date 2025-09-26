import { Module } from '@nestjs/common';
import { Reservation } from './entities/reservation.entity';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationRepository } from './reservation.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NOTIFICATION_QUEUE, NOTIFICATION_SERVICE } from '@beje/common';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: NOTIFICATION_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
    TypeOrmModule.forFeature([Reservation]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
