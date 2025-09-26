import { DatabaseModule } from '@beje/database';
import { Module } from '@nestjs/common';
import { Reservation } from './entities/reservation.entity';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationRepository } from './reservation.repository';

@Module({
  imports: [DatabaseModule.forFeature([Reservation])],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
