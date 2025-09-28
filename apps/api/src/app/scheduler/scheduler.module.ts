import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationModule } from '../reservation/reservation.module';
import { SchedulerService } from './scheduler.service';
import { BejeRabbitClientModule } from '@beje/rabbit-client';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ReservationModule,
    BejeRabbitClientModule,
  ],
  controllers: [],
  providers: [SchedulerService],
})
export class SchedulerModule {}
