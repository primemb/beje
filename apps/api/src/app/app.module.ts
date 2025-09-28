import { Module } from '@nestjs/common';
import { DB_CONFIG } from '@beje/database';
import { ConfigModule } from '@nestjs/config';
import { ReservationModule } from './reservation/reservation.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DatabaseModule } from '@beje/database';
import { RABBITMQ_CONFIG } from '@beje/rabbit-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [DB_CONFIG, RABBITMQ_CONFIG],
    }),
    DatabaseModule,
    ReservationModule,
    SchedulerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
