import { Module } from '@nestjs/common';
import { DB_CONFIG } from '@beje/database';
import { ConfigModule } from '@nestjs/config';
import { ReservationModule } from './reservation/reservation.module';
import { TypeOrmModule } from '@nestjs/typeorm';
console.log(__dirname + '/../**/*.entity{.ts,.js}');
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [DB_CONFIG],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgres://postgres:postgres@localhost:5432/call_reservation',
      synchronize: true,
      logging: false,
      autoLoadEntities: true,
    }),
    ReservationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
