import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, RmqOptions } from '@nestjs/microservices';
import { RABBITMQ_CONFIG_NAME } from './config/rabbitmq.config';
import { NOTIFICATION_SERVICE } from '@beje/common';
import { RabbitClientService } from './rabbit-client.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_SERVICE,
        useFactory: (configService: ConfigService) =>
          configService.getOrThrow<RmqOptions>(RABBITMQ_CONFIG_NAME),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [RabbitClientService],
  exports: [RabbitClientService],
})
export class BejeRabbitClientModule {}
