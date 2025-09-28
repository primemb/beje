import { Module } from '@nestjs/common';
import { Reservation } from './entities/reservation.entity';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationRepository } from './reservation.repository';
import { DatabaseModule } from '@beje/database';
import { BejeRabbitClientModule } from '@beje/rabbit-client';

@Module({
  imports: [BejeRabbitClientModule, DatabaseModule.forFeature([Reservation])],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
  exports: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
