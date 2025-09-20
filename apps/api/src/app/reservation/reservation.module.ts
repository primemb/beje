import { DatabaseModule } from '@beje/database';
import { Module } from '@nestjs/common';
import { Reservation } from './entities/reservation.entity';

@Module({
  imports: [DatabaseModule.forFeature([Reservation])],
})
export class ReservationModule {}
