import { Module } from '@nestjs/common';
import { DatabaseModule, DB_CONFIG } from '@beje/database';
import { ConfigModule } from '@nestjs/config';
import { ReservationModule } from './reservation/reservation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [DB_CONFIG],
    }),
    DatabaseModule,
    ReservationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
